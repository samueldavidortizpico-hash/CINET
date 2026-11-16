# Paginación de datos para el desarrollador 1

## Problema corregido

`listPlans` devolvía únicamente los últimos 200 planes; `listGroups` se detenía en 100 y `groupPlans` en 200. Otros listados podían cortarse por el máximo de filas de PostgREST. El historial de auditoría devolvía 30; la cartelera pública, 100; las ofertas de un título, 20. Un filtro `created_at < before` sin identificador perdía registros con la misma fecha.

La migración **20261115100000_cursor_pagination.sql** añade lectores específicos, sin cambiar las políticas RLS de las tablas ni modificar migraciones anteriores. Debe aplicarse antes de desplegar los servicios nuevos. El cliente no envía un tamaño de página: las RPC devuelven como máximo **50 elementos**, consultando 51 como indicador de continuación.

## Contrato del servicio JavaScript

Una página devuelve:

```js
{
  items: [/* filas o modelos según el servicio */],
  nextCursor: "eyJ2Ijox..." // cadena opaca o null cuando terminó
}
```

Primera llamada sin cursor; para continuar, entregar exactamente `nextCursor`. No descomponerlo ni convertir su fecha con `Date.toISOString()`: PostgreSQL conserva microsegundos que JavaScript Date perdería.

```js
import { listPlansPage } from "../services/planRepository.js";

const first = await listPlansPage(user.id);
if (first.nextCursor) {
  const second = await listPlansPage(user.id, { cursor: first.nextCursor });
}
```

Un error rechaza la promesa. El consumidor conserva los elementos y cursor ya confirmados y puede reintentar la misma página. No debe actualizar su cursor antes de que la llamada termine correctamente. Una lista vacía es `{ items: [], nextCursor: null }`; no se sustituye una caída de red por ese resultado.

Los cursores codifican versión 1, un instante completo y una identidad. Son posiciones de lectura, **no credenciales** ni autorizaciones: cada nueva llamada vuelve a ejecutar RLS con la sesión actual. Alterar un cursor no concede acceso a otro usuario o recurso. El servicio rechaza JSON/base64, fechas imposibles, identificadores o versiones no válidos con CN422 (el API HTTP lo adapta a 422).

## Funciones aditivas para integrar carga progresiva

| Servicio | Función | Opciones |
| --- | --- | --- |
| planRepository | `listPlansPage(userId, options)` | `{cursor, groupId}`; ambos opcionales |
| planRepository | `listInvitesPage(planId, options)` | `{cursor}` |
| groupRepository | `listGroupsPage(userId, options)` | `{cursor}` |
| groupRepository | `listInvitesPage(groupId, options)` | `{cursor}` |
| partnerRepository | `partnerPage(resource, options)` | `{orgId, cursor}` |
| showtimeService | `titleDataPage(kind, titleId, options)` | `kind` es `listings` u `offers`; `{cursor}` |

`listPlansPage` y `listGroupsPage` entregan modelos adaptados para las vistas. `partnerPage` entrega filas del recurso. `titleDataPage` entrega filas públicas sin transformar; `getListingsForTitle` mantiene el contrato final `{items, skipped}` después de resolver sedes y organizaciones y aislar filas inválidas.

Los recursos aceptados por `partnerPage` son `organizations`, `pending`, `venues`, `listings`, `offers`, `members`, `audit` e `invitations`. Los cinco recursos de organización requieren `orgId`. `organizations` significa las organizaciones de la sesión actual, no las de un UUID enviado por el cliente.

Se conservan las funciones existentes que devuelven arrays: `listPlans`, `listGroups`, `groupPlans`, `listInvites`, `myOrganizations`, `venues`, `listings`, `offers`, `members`, `audit`, `myOrgInvites` y `pendingOrganizations`. Recorren las páginas completas para no obligar a editar las pantallas del desarrollador 1. No devuelven un array parcial como si fuera completo ante un fallo intermedio.

Para historiales realmente grandes, el desarrollador 1 puede conectar las funciones de página a un botón de continuar o carga progresiva y evitar mantener todo el historial en memoria. El wrapper completo existe por compatibilidad; no convierte una descarga completa en una operación de costo constante.

## Orden de transferencia y de presentación

La posición usa el par de orden total `(fecha, identidad)`. La identidad desempata fechas iguales; no hay offset.

| Recursos | Par de transferencia | Sentido |
| --- | --- | --- |
| Planes grupos organizaciones sedes funciones ofertas | `created_at, id` | Ascendente |
| Invitaciones de planes grupos y organizaciones | `created_at, id` | Descendente |
| Miembros de una organización | `added_at, user_id` | Ascendente |
| Auditoría de organización | `at, id` | Descendente |

El nombre lógico `createdAt` del cursor representa la fecha de la fila de esta tabla. El id de auditoría se conserva como **cadena decimal**, incluidos valores superiores a 2 elevado a 53; no convertirlo a Number. Los demás lectores usan UUID.

Los wrappers preservan el orden de presentación anterior: planes del más antiguo al más nuevo; planes de un grupo por `starts_at` ascendente y los que no tienen fecha al final; sedes por nombre; funciones por comienzo; auditoría del evento más reciente al más antiguo. Los nuevos empates se resuelven con id. Los listados que antes no declaraban orden ahora tienen uno determinista.

Una página individual de planes de grupo o cartelera se transfiere por fecha de creación, no necesariamente por horario de proyección. Para presentar **toda** una lista por `starts_at`, primero obtenerla completa y ordenar, como hacen los wrappers. No afirmar que ordenar una sola página garantiza un orden global por otra columna.

## RPC de servidor

Todas aceptan `p_cursor_at` y `p_cursor_id`, ambos nulos para comenzar y ambos presentes para continuar. Las funciones de auditoría reciben id bigint; las restantes, UUID. No existe `p_limit`.

| RPC | Filtro adicional |
| --- | --- |
| `list_plans_page` | `p_group` opcional |
| `list_groups_page` | Sin filtro adicional |
| `list_plan_invites_page` | `p_plan` |
| `list_group_invites_page` | `p_group` |
| `list_my_organizations_page` | Identidad actual obtenida de Auth |
| `list_pending_organizations_page` | Comprobación de administrador de plataforma |
| `list_org_venues_page` | `p_org` |
| `list_org_listings_page` | `p_org` |
| `list_org_offers_page` | `p_org` |
| `list_org_members_page` | `p_org` |
| `list_org_audit_page` | `p_org` |
| `list_my_org_invites_page` | Hash de correo de la sesión y organización verificada |
| `list_title_listings_page` | `p_title`, texto de 1 a 64 caracteres |
| `list_title_offers_page` | `p_title`, texto de 1 a 64 caracteres |

La respuesta SQL es un objeto JSON `{items, nextCursor}`, donde `nextCursor` es un objeto `{createdAt, id}` o null. El servicio JavaScript lo transforma a cadena opaca. No mezclar directamente el objeto SQL y la cadena del servicio.

Los lectores ordinarios son SECURITY INVOKER y conservan RLS. Las invitaciones privadas de planes/grupos seleccionan solo las columnas autorizadas; no se obtiene `token_hash`. El lector nuevo de invitaciones de organización necesita SECURITY DEFINER porque el destinatario no puede leer la tabla de hashes: replica el filtro propio por `my_email_hash`, vigencia, no aceptación y aliado verificado; no concede un lector general de correos o invitaciones.

Los miembros embebidos de planes y grupos siguen en el documento de la página, con los cupos de hasta 30 por recurso. Las opciones de horarios tienen su máximo de cinco. Esas colecciones acotadas no se convierten en una descarga del historial completo. Los lookups públicos de sedes y organizaciones se resuelven en lotes de 50 ids.

## Fechas históricas y posiciones estables de publicaciones

`listings` no tenía `created_at`. La migración añade una fecha de incorporación para los datos históricos; **no prueba su fecha original de publicación**. A partir de ese esquema sirve como posición de transferencia.

Las escrituras directas de sedes, funciones y ofertas fijan `created_at` en servidor al insertar y la conservan al actualizar. Cambiar el id de una fila existente se rechaza con CN422. Esto evita que un editor envenene el cursor con `infinity`, fechas fuera del contrato o posiciones manipuladas.

Las fechas históricas inválidas de esas tablas se registran antes de repararse en `pagination_timestamp_repairs`, conservando tabla, UUID, representación original y fecha de reparación. El contenido de sedes y ofertas no se elimina. Esa tabla tiene RLS, carece de permisos para anon y authenticated y solo se habilita su lectura de operación a service_role.

## Concurrencia y límites explícitos

Keyset evita los saltos que produce un timestamp sin desempate y los desplazamientos normales del offset. No proporciona una instantánea transaccional común entre varias peticiones HTTP. Una eliminación o revocación puede hacer desaparecer un registro antes de la siguiente página; un recurso insertado antes de la posición ya recorrida se verá al recargar desde el inicio. Las funciones públicas pueden cambiar por vigencia mientras se recorren.

No reutilizar un cursor después de cambiar cuenta, recurso, filtro u organización. Reiniciar al principio. La autorización se vuelve a evaluar incluso si un miembro fue revocado entre páginas. El cliente deduplica por identidad y detecta un cursor repetido para evitar bucles; no oculta fallos del servidor.

El tamaño fijo es garantía de estas RPC. No se afirma que limite cualquier consulta directa a PostgREST: el máximo general del proyecto se configura separadamente en Supabase (el repositorio declara 500) y debe contrastarse en el servicio alojado. La implementación y sus pruebas no despliegan migraciones ni verifican la configuración remota.

## Verificación local

`node --test src/services/dataPagination.test.js supabase/tests/pagination.test.js` cubre más de 200 registros reales en PGlite: 251 planes, 251 ofertas, 251 sedes, 251 funciones y más de 200 eventos. Incluye empates masivos, microsegundos consecutivos, reintento idéntico, vacío, permisos ajenos y anon, límite no manipulable, tokens no expuestos, bigint sin pérdida de identidad, NULLS LAST y reparación histórica sin borrar publicaciones. Los checks completos y E2E se registran en el informe de cierre del trabajo.
