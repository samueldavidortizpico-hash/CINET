# API real de CINET — 2026-11-06

## Arquitectura y contrato

React consume Supabase Auth, PostgREST/RPC y las funciones Node de Vercel. No existe una aplicación Express ni controladores Mongoose. Este documento describe lo implementado; no acredita HW11 por equivalencia.

| Endpoint | Método | Implementación y protección | Respuestas |
|---|---|---|---|
| `/api/tmdb/:path*` | GET | `api/tmdb.js`, `server/tmdbProxy.js`; allowlist, token del servidor, Upstash obligatorio en Vercel | 200 JSON TMDB; 400 parámetros; 404 ruta/título; 405 verbo; 429 límite; 502/504 upstream; 503 configuración/límite inaccesible |
| `/api/og?path=...` | GET/HEAD | `api/og.js`, `server/ogMeta.js`; metadatos HTML de enlaces compartidos | HTML, fallback SPA según recurso |
| `/api/partner-webhook` | POST | HMAC y timestamp; idempotencia organización/evento; persistencia PostgREST | 200, 400 validación, 401 firma, 405, 500, 503 configuración |
| `/api/billing-webhook` | POST | HMAC, timestamp, RPC `apply_billing_event`; sandbox sin pasarela real | 200, 400, 401, 405, 500, 503 |
| `<SUPABASE_URL>/auth/v1/signup` | POST | SDK `auth.signUp`; proveedor gestiona contraseña y confirmación | Contrato Supabase Auth |
| `<SUPABASE_URL>/auth/v1/token?grant_type=password` | POST | SDK `signInWithPassword` | Sesión o error del proveedor |
| `<SUPABASE_URL>/auth/v1/recover` | POST | SDK `resetPasswordForEmail` | Respuesta neutral del proveedor |
| `<SUPABASE_URL>/auth/v1/user` | PUT | SDK `updateUser`, sesión de recuperación | Contrato del proveedor |
| `<SUPABASE_URL>/rest/v1/plans` | GET | SDK select con relación `plan_members`, RLS por miembro | PostgREST, no contrato Express |
| `<SUPABASE_URL>/rest/v1/rpc/<función>` | POST | `planRepository`, `groupRepository`, `partnerRepository`; funciones SQL con autorización | SQLSTATE CN403/CN404/CN409/CN422/CN429 según función |

Las operaciones de planes están en `supabase/migrations/20261009120000_shared_plans.sql` y sus correcciones posteriores; el cliente usa RPC para creación, edición, cancelación e invitaciones. No hay CRUD REST Express GET/POST/PUT/DELETE de una entidad. Cancelar planes conserva historia: no se añadió DELETE destructivo para aparentar cumplimiento.

El proxy acepta `page` entero 1–500; no acepta `limit`. PostgREST puede paginar pero `listPlans` actualmente obtiene la lista completa. La paginación académica `page/limit` no está implementada.

Los errores actuales difieren: TMDB `{error:{code,message}}`, webhooks `{error:string}` y PostgREST su contrato propio. No cumplen `{error:string,code:number}` global. Cambiarlo exige versionar consumidores; no se afirma uniformidad inexistente.

## Verificación

`server/*.test.js` comprueba manejadores con fetch/store inyectados. `supabase/tests/*.test.js` ejecuta SQL/RLS real en PGlite con identidad simulada. Playwright usa un adaptador local de Auth/PostgREST. Ninguna de estas comprobaciones demuestra disponibilidad de Vercel, SMTP, firma JWT remota o persistencia del proyecto alojado.
