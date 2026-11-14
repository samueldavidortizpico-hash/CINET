# Auditoría de seguridad y operación de CINET para Claude

**Fecha:** 2026-11-13  
**Alcance:** inspección estática del checkout local, migraciones SQL, configuración y documentación presentes.  
**Modo:** auditoría y plan de corrección; no se modificó la aplicación ni se ejecutaron pruebas en este turno.

## Instrucción para Claude

Usa este documento como encargo de remediación. Antes de editar, inspecciona el estado actual del repositorio y conserva los cambios locales ya presentes. No sobrescribas informes ni descartes modificaciones del usuario. Corrige por fases, crea migraciones aditivas y pruebas de regresión, y entrega evidencia por cada criterio de aceptación. No declares segura la producción basándote solo en pruebas locales.

El objetivo es proteger datos privados y operaciones, limitar abuso y dejar una ruta operable de despliegue y recuperación. No conviertas en privado el catálogo público, los recursos compartidos por invitación ni los webhooks legítimos: define el acceso explícitamente por tipo de recurso.

## Resumen ejecutivo

Hay una base de controles útil: Supabase Auth, varias tablas con RLS, RPC que usan `auth.uid()`, límites compartidos para TMDB con Redis, firma HMAC en webhooks, cabeceras CSP y páginas de error de ruta. La existencia de esos controles en el repositorio no confirma su aplicación en los proyectos alojados.

Hallazgos prioritarios:

1. **P1 — Lectura pública de perfiles:** la política permite `SELECT` a `anon` y `authenticated` con `using (true)`; por tanto UUID, username, nombre visible, avatar, bio y rol son consultables públicamente según las columnas concedidas. Definir qué campos deben ser públicos y mover los privados a una tabla con lectura por dueño o permisos explícitos.
2. **P1 — Política de autorización aún requiere auditoría integral:** los planes compartidos autorizan a miembros (no solo al dueño), y hay invitaciones/salas deliberadamente compartibles. No asumir que UUID secreto protege datos. Revisar cada tabla, vista, función `SECURITY DEFINER`, grant y canal Realtime; probar cuenta A/B/C contra datos ajenos.
3. **P1 — Recuperación y abuso de Auth:** el TOML local fija OTP de correo con vencimiento de hasta una hora, deja confirmación de correo y cambio seguro de contraseña desactivados y no activa CAPTCHA. Los valores alojados, SMTP, URLs de retorno y expiración real no son verificables desde este checkout.
4. **P1 — Colecciones sin paginación:** `listPlans` descarga todos los planes visibles sin filtro ni límite; revisar consultas similares, índices de predicados/orden y planes `EXPLAIN` con datos representativos.
5. **P1 — HTTPS/errores HTTP/despliegue no cerrados:** Vercel tiene cabeceras defensivas pero no HSTS explícito en el archivo revisado; el fallback SPA y `NotFoundPage` no garantizan un HTTP 404. No hay flujo blue/green/rollback descrito en el workflow CI.
6. **P2 — Monitoreo operativo:** el registro visto para error de ruta es `console.error` sin mensaje ni contexto privado. Hace falta definir observabilidad segura de API, Auth, base, limitadores y despliegues, con retención y alertas sin tokens ni payload sensible.

## Evidencia y hallazgos

### H-01 — Perfil consultable públicamente (P1)

`supabase/migrations/20260929024739_create_profiles.sql:26-29` define la política **“Perfiles visibles para todos”** con `using (true)`. En las líneas 41-43 se revoca el acceso general, pero se concede `SELECT` de la tabla a `anon` y `authenticated`. El esquema incluye `id`, `username`, `display_name`, `avatar_url`, `bio` y `role`.

**Riesgo:** cualquier persona con acceso al endpoint PostgREST puede enumerar las columnas seleccionables; no hace falta adivinar el UUID para listar perfiles si la política concede lectura global. Es una exposición confirmada por código local, no una medición HTTP del proyecto alojado.

**Corrección solicitada:** clasificar cada campo. Mantener una proyección pública mínima solo si producto la necesita; separar campos privados (o limitar por `auth.uid()`). No exponer `role` ni campos internos de autorización por una tabla pública. Añadir pruebas SQL con `anon`, usuario propio y usuario ajeno.

### H-02 — Modelo de acceso por UUID, dueño y membresía (P1)

Los planes tienen política de lectura para `authenticated` condicionada a `public.is_plan_member(id)` en `supabase/migrations/20261009120000_shared_plans.sql:127-143`. Varios RPC usan la identidad de `auth.uid()` y el repositorio oculta la distinción entre “no existe” y “no eres miembro” (`src/services/planRepository.js`, `getPlan`). Grupos y salas también tienen políticas y funciones específicas en sus migraciones.

**Riesgo/límite:** un UUID no es mecanismo de autorización. Además, aplicar literalmente “cada usuario solo ve objetos propios” rompería planes con invitados, grupos, salas Duo y perfiles públicos previstos por el producto. La regla debe ser: dueño ve su ámbito; miembros ven solo el recurso compartido al que pertenecen; no miembros no pueden enumerar ni leerlo; invitaciones usan tokens opacos de uso limitado y expiración.

**Corrección solicitada:** inventariar tablas, vistas, RPC, Storage y Realtime en una matriz de permisos (anon / dueño / miembro / administrador de organización / usuario ajeno / service role). Revisar cada función `SECURITY DEFINER`: `search_path` fijo, `EXECUTE` revocado de `PUBLIC`, validación de identidad/rol y argumentos, operaciones acotadas. Verificar grants de columnas y políticas efectivas, no solo el SQL esperado.

**Pruebas requeridas:** cuentas sintéticas A/B/C; A crea datos; B miembro o invitado ve solo lo compartido; C no enumera, consulta, modifica ni borra; alterar UUID/token del cliente no cambia la autorización; rol enviado desde cliente no eleva permisos. Repetir para REST, RPC, Storage y Realtime.

### H-03 — Realtime y datos indirectos (P1, verificar en staging)

`20261009120000_shared_plans.sql` incorpora `plans` y `plan_members` a `supabase_realtime`; `20261010120000_duo_rooms.sql` quita `plan_members` y agrega `duo_rooms` y `room_rounds`. Las migraciones de este checkout no demuestran las publicaciones/policies que están efectivamente activas en Supabase remoto.

**Corrección solicitada:** revisar SELECT/INSERT/UPDATE/DELETE de Postgres Changes con cuentas A/B/C, incluyendo eventos DELETE y cambios de filas, y payloads de sala. Si la publicación revela identificadores o metadatos a no miembros, migrar a canales privados/Broadcast con autorización verificable o retirar tablas de la publicación. No enviar correo, token de invitación, voto privado ni campos innecesarios en el payload.

### H-04 — Caducidad de recuperación, confirmación y rate limits de Auth (P1, configuración remota pendiente)

`supabase/config.toml:164-181` configura JWT de 3600 segundos, rotación de refresh token y contraseña mínima de 8. Las líneas 195-233 dejan `email_sent = 2` por hora y `sign_in_sign_ups = 30` por cinco minutos por IP; CAPTCHA está comentado; OTP de correo expira a los 3600 segundos. En `:225-229`, `enable_confirmations = false`, `secure_password_change = false`, frecuencia de correo `1s`. `authService.js` usa `resetPasswordForEmail` y `updateUser`; el código comenta respuesta neutral ante cuentas inexistentes.

**Riesgo/límite:** el archivo es configuración local y no prueba el proyecto alojado. Una hora puede ser demasiado larga para un enlace de recuperación; CAPTCHA y protecciones antiabuso no están declarados activos; 1 segundo permite ráfagas dentro del límite de cuota. El email de confirmación apagado puede permitir cuentas no verificadas.

**Corrección solicitada:** fijar expiración corta del OTP/enlace de recuperación según proveedor y riesgo, uso único, invalidación al cambiar contraseña y política de revocación de sesiones; exigir confirmación de correo si el producto la requiere; habilitar CAPTCHA/Turnstile y límites adecuados en staging; configurar SMTP propio con TLS, SPF/DKIM/DMARC, plantillas anti-phishing y URL allowlist HTTPS exacta. Mantener respuesta indistinguible para email existente/no existente y evitar enumeración. Documentar política de sesiones/refresh/revocación y límites reales del proveedor.

**Pruebas requeridas:** email válido/inexistente da respuesta pública equivalente; enlace usado/caducado/reutilizado falla; el nuevo password inicia sesión y el anterior deja de funcionar; probar límites de login, registro, reset y OTP por IP/cuenta; revisar headers/redacción del correo y que redirect externo arbitrario no sea aceptado.

### H-05 — Endpoints, secretos y disponibilidad pública (P1)

La app habla directamente con Supabase Auth/PostgREST y publica `VITE_SUPABASE_URL` y `VITE_SUPABASE_PUBLISHABLE_KEY`, lo cual es normal para una SPA solo si RLS y grants son correctos. `/api/tmdb` es público intencionalmente: el README y `server/tmdbProxy.js` indican token TMDB de servidor y Redis compartido; la función devuelve 429/503 y `Retry-After`. Los webhooks requieren HMAC y el service role se lee del entorno en `api/partner-webhook.js` y `api/billing-webhook.js`.

**Riesgo/límite:** no se debe prometer que la API “no está abierta” en sentido de inaccesible sin login. El catálogo debe poder consultarse públicamente, pero con cuota, límites de parámetros, presupuesto global y protección de costo. La clave publishable de Supabase no es secreto; `service_role`, tokens TMDB, Upstash y claves HMAC sí lo son. `.env.example` los documenta por nombre y `.gitignore` excluye `.env*` salvo `.env.example`; no se comprobó el historial Git ni los valores de Vercel/EAS.

**Corrección solicitada:** buscar secretos en archivos rastreados e historial (sin imprimir valores), rotar cualquier credencial filtrada, agregar escaneo de secretos al CI y regla de bloqueo; verificar que `VITE_*` jamás incluya claves secretas. Mantener funciones de catálogo públicas con cuotas resistentes a spoofing y fallar cerrado cuando Redis necesario no esté disponible. Para webhooks, validar HMAC en tiempo constante, timestamp/ventana, tamaño, idempotencia, origen del proveedor y rotación de claves.

**Pruebas/operación:** dos instancias comparten cuota Redis; X-Forwarded-For falso no evade el limitador; identidad agotada recibe 429; caída del datastore produce 503 seguro; pruebas de webhook de firma inválida, repetición, payload grande y timeout. Verificar configuración real y respuesta HTTP del deployment.

### H-06 — Validación, SQL injection y XSS (P1 de defensa en profundidad)

La app usa Supabase JS/PostgREST y RPC, no se encontró concatenación dinámica de entrada en las búsquedas efectuadas. Las migraciones incluyen `CHECK`, claves y funciones; una migración usa `EXECUTE format` para ajustar políticas de Storage, que requiere revisar allowlist y contexto privilegiado. En `src` no se encontró `dangerouslySetInnerHTML`, `innerHTML`, `eval` ni `document.write` en el barrido de texto realizado. React escapa texto, pero no sanitiza URLs ni protege automáticamente destinos `href/src` externos.

**Corrección solicitada:** conservar consultas parametrizadas/SDK y no concatenar SQL; validar en la base y servidor tipos, rangos, enumeraciones, longitud, tamaño y formato. Para URLs externas permitir solo esquemas `https:` y hosts permitidos donde corresponda (TMDB, YouTube, cines verificados); rechazar `javascript:`, `data:` para navegación y `//host` no esperado. Escapar/sanitizar cualquier HTML enriquecido si se añade en el futuro. Revisar CSV/importación, nombres, mensajes, bios, webhooks, metadata TMDB y URLs de aliados como entrada no confiable.

**Pruebas requeridas:** strings SQL/HTML y URLs maliciosas como valores sintéticos, en campos visibles y enlaces; confirmar almacenamiento/renderizado seguro sin alterar el contenido benigno. Revisar logs para asegurar que no registren esos payloads ni datos personales completos.

### H-07 — Límites de tráfico y consultas (P1)

`server/tmdbProxy.js` implementa limitador y respuestas 429/503; la configuración documenta Upstash obligatorio en despliegue para TMDB. Auth tiene límites locales en `supabase/config.toml`. Varias consultas de organizaciones tienen `.limit(30)` (`partnerRepository.js:81`), pero `planRepository.js:102-105` carga la lista completa de planes ordenada por `created_at`; hay otras consultas de miembros, funciones y grupos sin paginación explícita en repositorios.

**Corrección solicitada:** definir límites por operación y usuario autenticado/IP en backend/DB (no solo UI): tamaño de body, concurrencia, paginación máxima, límites diarios, cuotas y `Retry-After`. No usar IP como autorización; probar clientes detrás de NAT y cabeceras falsificadas. Añadir paginación por cursor/rango al historial de planes y listados crecientes. Revisar índices según filtros, joins, RLS y orden real; validar con `EXPLAIN (ANALYZE, BUFFERS)` en staging con datos representativos. No agregar índices por intuición: documentar la consulta que optimizan y el costo de escritura.

**Criterio:** ninguna respuesta de lista sin límite máximo; índices para `owner_id`, `created_at`, `group_id`, membership/joins y vigencia solo donde el plan de consulta lo justifique; latencia, filas leídas y tamaño de respuesta medidos antes/después.

### H-08 — HTTPS, códigos HTTP y manejo de errores (P1)

`vercel.json` declara CSP, `nosniff`, `DENY`, `Referrer-Policy` y `Permissions-Policy`, pero no `Strict-Transport-Security`. El archivo tiene rewrites a `/index.html`; el router React tiene `NotFoundPage` y `RouteError`, que son vistas cliente. Las funciones API implementan estados como 400/401/404/405/429/500/502/503/504. `RouteError.jsx` registra nombre de error solamente con `console.error`.

**Riesgo/límite:** que una pantalla muestre “404” no implica HTTP 404; con fallback SPA una ruta inexistente puede devolver 200. HTTP 200 significa éxito, 3xx redirección, 4xx error de solicitud/cliente, 5xx error del servidor; no crear pantallas para reemplazar esos contratos. HTTPS/HSTS, headers y status efectivos de Vercel no se comprobaron desde el repositorio.

**Corrección solicitada:** forzar redirección HTTP→HTTPS en hosting, añadir HSTS solo tras verificar subdominios HTTPS y política compatible, revisar CSP en deployment. Configurar 404 real en rutas inexistentes si hosting permite fallback condicional, y mantener página React amigable. Normalizar contrato de error API (código estable, mensaje seguro, request/correlation ID) sin cambiar consumidores sin plan. No filtrar stack, SQLSTATE sensible, tokens ni datos; conservar errores recuperables y reintentos idempotentes.

**Pruebas requeridas:** comprobaciones HTTP reales en preview para HTTP→HTTPS, HSTS, CSP, rutas conocidas/desconocidas (status y cuerpo), verbos no permitidos, validación, no autenticado, permiso denegado, límite, fallo upstream y timeout. No inferir esto desde unit tests ni build.

### H-09 — Registros, métricas y respuesta a incidentes (P2)

El workflow `.github/workflows/ci.yml` sube artefactos de CI por siete días con trazas E2E y registra SHA/ref. No aparece configuración de proveedor de errores/alertas en los archivos examinados; error de ruta escribe en consola. Analítica es opcional y con consentimiento según `.env.example`.

**Corrección solicitada:** añadir observabilidad del lado servidor con request ID, endpoint, status, latencia, resultado del rate limit, clase de error y dependencia afectada. Redactar email, UUID si no hace falta, Authorization, cookies, tokens, cuerpo de webhook y datos de perfil. Definir retención, acceso mínimo, alertas por 5xx/429/latencia, caídas de Redis/DB/Auth, cuota TMDB, fallos de webhook y despliegue. Agregar auditoría de acciones administrativas sin almacenar secretos. Verificar que logs de cliente no incluyan datos privados.

### H-10 — Despliegue seguro, blue/green y recuperación (P1 de operación)

El CI corre lint, pruebas locales, build y E2E; no se encontró en el workflow un gate de despliegue, smoke test remoto, migración coordinada o rollback blue/green. El hosting declarado es Vercel, pero el proveedor puede ofrecer previews/promoción; eso no está descrito como estrategia reproducible aquí.

**Corrección solicitada:** definir dos fases reproducibles: (1) despliegue preview/staging con migraciones compatibles hacia atrás y smoke tests de Auth, RLS, API, Redis, cabeceras y rutas; (2) promover el mismo artefacto SHA a producción con health checks. Mantener despliegue anterior reversible; activar migraciones expand/contract; no ejecutar migración destructiva al promover. Documentar disparador/criterio automático de rollback y pasos/manual owner, comprobación post rollback y límites cuando esquema DB ya avanzó. Añadir backup/restore probado. No poner secretos de producción en PRs de forks ni artefactos.

**Criterio:** un fallo deliberado de health check impide promoción o revierte tráfico al artefacto estable; probar en staging recuperación y consistencia DB. El rollback de frontend no basta si el esquema ya es incompatible.

## Orden de trabajo recomendado

1. Inventario de datos/roles y matriz de acceso; corregir exposición pública de perfiles y políticas/funciones identificadas. Mantener pruebas sintéticas A/B/C.
2. Cerrar Auth, recuperación de contraseña, expiración, email, redirect allowlist, CAPTCHA y rate limits en staging.
3. Revisar Realtime, Storage, vistas/RPC `SECURITY DEFINER`, privilegios y cambios de rol.
4. Secret scanning, validación de campos/URLs, límites de body/concurrencia y seguridad de webhooks.
5. Paginación e índices guiados por consultas/`EXPLAIN`; medir carga/transferencia.
6. HTTPS/HSTS, semántica HTTP, error reporting y logs redactados.
7. Pipeline de staging/promoción blue/green, smoke tests, migraciones reversibles y restauración.

## Evidencia que falta antes de declarar cierre

- **No verificado:** políticas y migraciones efectivas de Supabase remoto; configuración de Auth/SMTP/CAPTCHA/redirects; RLS entre cuentas reales sintéticas; Storage y Realtime alojados.
- **No verificado:** secretos actuales e historial Git completo, variables Vercel/EAS/GitHub, despliegue activo y respuestas HTTP públicas.
- **No verificado:** Redis real multi-instancia, tasa y concurrencia bajo carga, EXPLAIN de PostgreSQL remoto, backups y restauración.
- **No ejecutado en esta auditoría:** pruebas, build, pentest, escaneo de secretos, deploy o cambios remotos.

Para cerrar, Claude debe reportar por hallazgo: archivos/migraciones cambiados, prueba negativa que ahora se bloquea, evidencia local, validación staging pendiente, impacto en invitaciones/recursos compartidos y decisión de despliegue. No marcar producción segura hasta cerrar las verificaciones remotas.
