# Revisión de JWT y endpoints de CINET

Fecha: 15 de noviembre de 2026. Base: `ac7869c6fbfda64a1679287feea8ed1ab9f488a9`, trabajo en `devlop`.

## Alcance y frontera de confianza

La API REST recibe el JWT de acceso de Supabase en `Authorization: Bearer <token>` y lo envía a `GET /auth/v1/user`. No valida firmas mediante un decodificador propio ni utiliza `user_metadata` para autorizar. Después de la respuesta de Auth comprueba que el `sub` coincida con la identidad devuelta. Las consultas a PostgREST conservan el token del usuario; no emplean `service_role`.

`jwtClaims` y `app_role` no son validadores criptográficos. Solo se leen después de Auth para decidir el rol de aplicación mínimo; sin `app_role=admin` se aplica `user`. `role=authenticated` es el rol de PostgreSQL, distinto del rol de aplicación. Un invitado de Auth puede leer recursos que sus propias políticas permitan, pero no adquiere administración mediante metadatos.

Las rutas administrativas ahora exigen dos condiciones: claim administrativo y resultado `true` de `public.is_platform_admin()` con la misma sesión. Esto hace que una democión rechace inmediatamente tanto GET como PATCH con 403, aunque el JWT antiguo todavía contenga `app_role=admin`. Antes, el GET podía pasar el control de ruta con ese claim antiguo, aunque RLS seguía restringiendo las filas. No se demostró lectura de datos ajenos por ese comportamiento.

## Correcciones implementadas

- Se verifica el rol actual en la base antes de acceder a cualquier ruta administrativa, sin nueva función privilegiada ni cambio de políticas.
- Los rechazos de autenticación de `/user` con 400, 401, 403 o 422 se convierten en 401 uniforme. Por ejemplo, el servidor Auth actual puede rechazar una audiencia incorrecta con 400; antes la API lo presentaba como un fallo 502 de dependencia.
- El esquema `Bearer` admite mayúsculas/minúsculas conforme a su semántica HTTP. Se acota el encabezado a 16000 caracteres y se rechazan valores que no tengan la estructura prevista.
- Un JSON de proveedor ilegible o una interrupción de lectura se convierte en 502 o 504, sin exponer el contenido interno. Un payload JWT no objeto se decodifica defensivamente como un objeto vacío; esto es robustez, no un bypass público demostrado.
- Los listados de planes y organizaciones pendientes incorporan cursor compuesto, desempate por UUID y detección exacta de página siguiente mediante una fila adicional. Las cuotas máximas permanecen en el servidor.

## Matriz de verificación

| Escenario | Resultado esperado y cobertura local |
| --- | --- |
| Sin token o con estructura inválida | 401 y cabecera WWW Authenticate |
| Firma/payload alterado | Auth simulado rechaza y la API responde 401; el E2E existente firma HS256 en su servicio de pruebas |
| Token vencido o sesión retirada | Respuesta 401/403 de Auth simulada se normaliza a 401; no se consulta PostgREST |
| Audiencia rechazada por Auth | 400 de Auth se transforma en 401, sin detalles internos |
| `sub` distinto del usuario devuelto | 401 sin lectura de datos |
| Claim ausente y `user_metadata.role=admin` | Rol mínimo y 403 en administración |
| Invitado anónimo | No obtiene privilegio administrativo |
| Usuario normal | 403 antes de la RPC administrativa |
| Administrador vigente | GET y PATCH permiten continuar, sujetos a RLS/RPC |
| Administrador degradado con claim anterior | GET y PATCH dan 403 antes de leer/escribir organizaciones |
| Id de plan alterado o ajeno | 404; la API no distingue ausencia y falta de acceso |
| Token reenviado a datos | Las consultas conservan el JWT del solicitante |
| Dependencia con JSON roto o lectura vencida | 502 o 504 sin datos internos |
| Más de 200 filas con misma fecha | 238 filas por recurso en cinco páginas; ninguna duplicada u omitida |
| Cursor con inyección o parámetros repetidos | 422 antes de consultar datos |
| Lista vacía y última página de tamaño exacto | `nextCursor=null` y `hasMore=false` |
| Reintento tras fallo del proveedor | Misma URL y cursor, sin avanzar el estado del consumidor |

Ejecución focal: `node --test server/api.test.js`, 16 pruebas correctas. Incluyen también JSON válido con forma incorrecta en listados: se responde 502 en vez de éxito vacío o un 500 interno. Las pruebas simulan la frontera de Auth; no prueban que una firma falsa haya sido aceptada por Supabase real, ni certifican su configuración alojada. El E2E existente es otro nivel local con firma real del fixture, no el proveedor de producción.

## Contrato de paginación REST para el desarrollador 1

`GET /api/v1/plans?limit=20&cursor=<opaco>` devuelve:

```json
{
  "items": [],
  "hasMore": false,
  "nextCursor": null,
  "nextBefore": null
}
```

- El orden se mantiene descendente por `created_at`, con `id.desc` como desempate estable. `limit` admite enteros de 1 a 50; no es una interpolación libre de expresiones PostgREST. Se consultan como máximo 51 filas para conocer si existe página siguiente y se entregan como máximo 50.
- Enviar `nextCursor` sin decodificar ni cambiar sus campos para continuar. El cursor conserva los microsegundos originales: convertir la fecha mediante `Date.toISOString()` truncaría precisión.
- `before` y `nextBefore` se conservan por compatibilidad, pero están deprecados como mecanismo de continuación. `before` es un filtro inicial de fecha, no un cursor completo; por sí solo no resuelve empates. Para un recorrido completo se debe usar `nextCursor`.
- No combinar `cursor` y `before`, ni repetir `cursor`, `before` o `limit`. Un cursor no válido produce 422 y no se usa en una consulta de datos.
- En un fallo conservar el cursor anterior y permitir reintentar. No presentar un conjunto parcial como si estuviera completo.
- La paginación keyset conserva el recorrido frente a inserciones anteriores a la posición o eliminación del registro cursor. No ofrece una transacción de snapshot entre peticiones: un registro insertado posteriormente detrás de una posición ya recorrida requiere refrescar la lista. No existe garantía de snapshot histórico en este contrato.

`GET /api/v1/admin/organizations?limit=50&cursor=<opaco>` devuelve `{items, hasMore, nextCursor}`. El orden es ascendente por `created_at,id`, se limita a organizaciones pendientes legibles por la sesión y exige privilegio administrativo actual. Sustituye la lista truncada a cien elementos; la interfaz debe ofrecer continuación o acumular páginas según su necesidad.

## Inventario de rutas revisadas

| Ruta | Método | Autorización y entrada |
| --- | --- | --- |
| `/health` | GET HEAD | Configuración y limitador disponibles |
| `/auth/register` | POST | Pública con cuota 10 por minuto e IP validada, validación y respuesta neutra |
| `/auth/login` | POST | Pública con cuota 10, credenciales y CAPTCHA delegado a Auth |
| `/auth/refresh` | POST | Pública con cuota 30 y token de renovación acotado |
| `/me` | GET HEAD | Auth validado y perfil propio por RLS |
| `/plans` | GET HEAD | Auth y planes permitidos por RLS; cursor compuesto |
| `/plans/:id` | GET HEAD | UUID y lectura autorizada; 404 uniforme |
| `/admin/organizations` | GET HEAD | Claim admin y rol vigente en base; cursor compuesto |
| `/admin/organizations/:id` | PATCH | Rol vigente UUID y estado permitido; RPC vuelve a comprobar permisos |

Métodos incorrectos dan 405 con Allow y OPTIONS da 204. Los cuerpos de escritura se leen con límite de 16000 bytes y plazo de cinco segundos en el adaptador. El proxy TMDB y los webhooks tienen fronteras independientes; la cuota de esta API no protege automáticamente llamadas directas a Auth/PostgREST del navegador.

## Revocación y comprobaciones externas pendientes

El servidor Auth actual carga y comprueba la sesión cuando el JWT incluye un `session_id` válido. Por tanto, `/api/v1` no sustituye `/user` por una simple decodificación local. Sin embargo, una validación criptográfica o las consultas directas a PostgREST no equivalen a consultar esa sesión en cada solicitud. Los JWT de acceso de sesiones cerradas pueden mantener validez criptográfica hasta `exp`; no se promete revocación instantánea en todos los servicios.

No se verificaron el proyecto Supabase alojado, activación efectiva del hook, issuer/audiencia configurados, claves de firma, rotación, sesión cerrada real, expiración real, bloqueo de usuario o versiones desplegadas. El operador debe probarlos con usuarios sintéticos en staging: iniciar sesión, consultar `/me`, cerrar/revocar, repetir el acceso antes y después de expirar y contrastar también el acceso directo que mantiene la aplicación. No registrar JWT, refresh tokens ni claves en evidencia.

Fuentes primarias consultadas el 15 de noviembre de 2026:

- [Guía de Auth en servidor](https://supabase.com/docs/guides/auth/server-side/advanced-guide), diferencia entre `getUser` y comprobación local de claims.
- [Servidor Auth y carga de sesión](https://github.com/supabase/auth/blob/master/internal/api/auth.go), `authenticateBearerToken` y `maybeLoadUserOrSession`.
- [Servidor Auth y comprobación de audiencia](https://github.com/supabase/auth/blob/master/internal/api/user.go), `UserGet`.
- [Cierre de sesión](https://supabase.com/docs/guides/auth/signout), validez del JWT de acceso frente a retirada de refresh tokens.

Estas fuentes describen el proveedor actual; el código `master` no prueba la versión configurada en el despliegue del equipo. La confirmación de rotación del token TMDB histórico corresponde al responsable del proveedor y no se deduce de esta revisión.

## Revisión adicional del smoke y de los secretos de despliegue

Se encontró que el smoke reenviaba `x-vercel-protection-bypass` también en su comprobación de redirección HTTP. Si el secreto estaba configurado, esa petición podía enviarlo sin TLS. La URL manual o recibida del evento tampoco tenía una lista de destinos autorizados. El código revisado no demuestra que el secreto estuviera configurado ni que se haya filtrado realmente.

Se añadió `server/smokePolicy.js`. El smoke valida su base HTTPS antes de cualquier petición, rechaza credenciales en URL y exige, cuando hay secreto, coincidencia exacta con `SMOKE_TRUSTED_ORIGINS`. La comprobación HTTP usa siempre encabezados sin secreto, y `redirect: manual` impide reenviarlo automáticamente en una redirección. No se aceptan comodines ni coincidencias por sufijo; los puertos forman parte del origen y HTTPS 443 se normaliza como corresponde.

Configurar la variable de repositorio `SMOKE_TRUSTED_ORIGINS` con un CSV como `https://cinet.example,https://preview-controlado.example` o un array JSON de esos orígenes exactos. Se permite `/` final, pero no rutas, consulta, fragmento ni usuario/contraseña. Un nuevo dominio preview requiere alta explícita; no utilizar `*.vercel.app`. Si hay secreto y no hay coincidencia, el script aborta sin tráfico. Para un despliegue público sin secreto no es necesaria esa variable. La integración con Deployment Checks sigue requiriendo configuración del operador.

Tres pruebas focales cubren HTTPS confiable, HTTP sin cabecera, destinos ajenos, host con sufijo engañoso, puertos, credenciales, valores malformados y formatos CSV/JSON. No se llamó a un despliegue real.

Consulta de GitHub al corte: el último run de la base `ac7869c` tuvo `quality` y `dependencies` correctos, pero falló `secrets` en el paso llamado Gitleaks sobre historial. No se obtuvo un resumen de logs que permita atribuir la causa a hallazgos, descarga o ejecución de la herramienta. El smoke de ese despliegue también falló. Estos resultados no describen todavía los cambios de `devlop` pendientes de publicación. [CI de la base](https://github.com/samueldavidortizpico-hash/CINET/actions/runs/43620954721), [smoke de la base](https://github.com/samueldavidortizpico-hash/CINET/actions/runs/43620980659).
