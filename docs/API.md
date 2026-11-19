# API REST de CINET (`/api/v1`)

Función serverless de Vercel (`api/v1.js` → `server/api.js`). Base: `https://<dominio>/api/v1`.
Autenticación con **JWT de Supabase Auth**; la autorización va en **dos capas**: la ruta exige rol (403) y Postgres vuelve a decidir con RLS, porque cada consulta viaja con el token de quien llama (nunca con `service_role`).

## Autenticación y roles

- Cabecera: `Authorization: Bearer <access_token>` (se obtiene en `/auth/login` o `/auth/register`).
- Supabase Auth valida firma, caducidad y sesión revocada; el rol sale del claim `app_role` (`user` | `admin`) que añade `custom_access_token_hook`. Sin claim → `user` (mínimo privilegio).
- El rol real vive en `public.profiles.role` y solo la base puede cambiarlo (privilegios de columna + trigger + RLS).

## Endpoints

| Método | Ruta | Rol | Límite | Descripción |
|--------|------|-----|--------|-------------|
| GET | `/health` | público | 120/min/IP | Estado del servicio |
| POST | `/auth/register` | público | 10/min/IP | Crea cuenta `{ name, email, password }` |
| POST | `/auth/login` | público | 10/min/IP | `{ email, password }` → sesión (access y refresh token) |
| POST | `/auth/refresh` | público | 30/min/IP | `{ refresh_token }` → sesión nueva |
| GET | `/me` | `user`, `admin` | 120/min/IP | Quién eres: id, rol, perfil |
| GET | `/plans?limit=20&before=<ISO>` | `user`, `admin` | 120/min/IP | Tus planes, paginados (1–50). RLS: solo de los que eres miembro |
| GET | `/plans/:id` | `user`, `admin` | 120/min/IP | Un plan tuyo; 404 si no existe o no tienes acceso |
| GET | `/admin/organizations` | `admin` | 120/min/IP | Cola de aliados pendientes de verificar |
| PATCH | `/admin/organizations/:id` | `admin` | 120/min/IP | `{ status }` verifica o rechaza un aliado |

## Contrato de errores

Éxito: 200/201/202/204. Error: `{ "error": { "code", "message", "requestId" } }`, sin SQL ni tokens.

| HTTP | Cuándo |
|------|--------|
| 400 | JSON inválido |
| 401 | Sin token, inválido o caducado |
| 403 | Rol insuficiente (p. ej. un `user` en `/admin/*`) |
| 404 | Ruta o recurso inexistente (o sin acceso) |
| 405 | Método no permitido (cabecera `Allow`) |
| 408 / 413 / 415 | Cuerpo lento, grande o que no es JSON |
| 422 | Validación (`details` por campo) |
| 429 | Cuota excedida (`Retry-After`) |
| 502 / 503 / 504 | Dependencias caídas, sin limitador o con plazo vencido |

## Ejemplos

```bash
# 1. Iniciar sesión
curl -X POST https://<dominio>/api/v1/auth/login \
  -H "content-type: application/json" \
  -d '{"email":"ana@example.com","password":"********"}'

# 2. Mis planes
curl https://<dominio>/api/v1/plans?limit=5 -H "authorization: Bearer $TOKEN"

# 3. Un usuario normal intentando entrar a administración → 403
curl -i https://<dominio>/api/v1/admin/organizations -H "authorization: Bearer $TOKEN"
```

## Seguridad de la API

Límite de peticiones por IP y global (Upstash; sin Redis falla cerrada con 503), plazo de 5 s hacia Supabase, validación del cuerpo (tipo, tamaño, JSON), registro de una línea por petición sin IP, correo, token ni cuerpo. Pruebas: `server/api.test.js` y `e2e/api-roles.spec.js` (roles y permisos).
