# Remediación de la auditoría de seguridad CINET (2026-11-13)

Responde a `AUDITORIA_SEGURIDAD_CINET_PARA_CLAUDE_2026-11-13.md` y a dos pedidos añadidos: **JWT con dos roles de extremo a extremo** y **rutas HTTP (API REST) con permisos y pantallas de error**.

**Estado: corregido y verificado en local. Producción NO declarada segura.** Falta todo lo marcado como *remoto* (sección final), sobre todo **rotar el token de TMDB** (ver H-05).

## Evidencia local (2026-11-13)

| Comprobación | Resultado |
|---|---|
| `npm run lint` | sin errores |
| `npm test` (unitarias, proxy, API y SQL sobre PGlite con todas las migraciones, incluidas las de Juan) | **275/275** |
| `npm run build` (guardián de secretos en el bundle) | OK |
| `npm run test:e2e` (proyectos local y accounts) | 41 pasan, 0 fallan (tras integrar `main` y la limpieza) |
| Escaneo de secretos en archivos rastreados | 0 hallazgos |
| Escaneo del historial completo (`git rev-list --all`) | **1 hallazgo**: token TMDB en `origin/gh-pages` (H-05) |

## Por hallazgo

### H-01 Perfiles públicos (P1) → corregido
- **Cambio:** lo resolvió Juan en `20261110150000_profiles_private_read.sql` (PR #1, integrado en esta rama con el merge `24bc145`). Elimina «Perfiles visibles para todos», añade «Cada cuenta ve solo su perfil» y revoca `select` a `anon`. La migración `20261113100000` ya no lo repite: solo añade el rol al JWT.
- **Prueba negativa:** `supabase/tests/security.test.js` (H-01). A solo ve su fila, A no lee a B y anon recibe 42501.
- **Impacto en lo compartido:** ninguno. Los nombres visibles de planes, grupos y salas viven en `plan_members` / `group_members` / `room_members`. Ninguna pantalla leía perfiles ajenos (verificado con grep en `src/`).
- **Remoto:** aplicar la migración y repetir con REST (`GET /rest/v1/profiles` con anon → 401/vacío).

### H-02 Matriz de acceso y SECURITY DEFINER (P1) → invariantes automáticas
- **Inventario (PGlite, esquema real):** las 30 tablas de `public` tienen RLS. Las 74 funciones `SECURITY DEFINER` fijan `search_path` y ninguna da EXECUTE a PUBLIC. anon solo lee `billing_config`, `listings`, `offers`, `organizations` y `venues` (catálogo público por diseño) y no escribe en ninguna tabla. Las 4 funciones definer ejecutables por anon (`can_publish`, `is_platform_admin`, `org_is_verified`, `org_role`) devuelven falso/null sin `auth.uid()`, y la RLS del catálogo las necesita.
- **Prueba:** `security.test.js` (Invariantes) falla si una migración futura rompe cualquiera de esas reglas. Las pruebas A/B/C ya existentes (`plans`, `groups`, `rooms`, `partners`, `contracts`) siguen en verde.
- **Remoto:** verificar las políticas efectivas en Supabase (`select * from pg_policies`) y repetir A/B/C contra REST/RPC/Storage reales.

### H-03 Realtime (P1, staging)
- **Estado:** la publicación local incluye `plans`, `duo_rooms` y `room_rounds`. Postgres Changes aplica la RLS de SELECT a INSERT/UPDATE. **Los DELETE no se filtran por RLS**: con replica identity por defecto solo viaja la clave primaria (UUID del plan o sala borrado). Riesgo bajo: un UUID de un recurso ya borrado no da acceso a nada.
- **Pendiente staging:** suscribir a C (no miembro) y comprobar que no recibe INSERT/UPDATE de A. Si se quiere ocultar también el id en DELETE, migrar a Broadcast privado.

### H-04 Auth: recuperación, confirmación, CAPTCHA (P1) → corregido en código y config local
- `supabase/config.toml`: `enable_confirmations = true`, `secure_password_change = true`, `max_frequency = "60s"`, `otp_expiry = 900` (15 min), `[auth.captcha]` Turnstile declarado (apagado en local porque exige secreto) y `[api] max_rows = 500`.
- **Enumeración de cuentas corregida:** `authService.register` decía «Ya existe una cuenta con ese correo» aunque Supabase lo oculta. Ahora responde igual que a una cuenta nueva. La API hace lo mismo (`202` idéntico; prueba en `server/api.test.js` y `e2e/api-roles.spec.js`).
- **CAPTCHA en el cliente:** `src/components/auth/Captcha.jsx` en registro, acceso, recuperación e invitado Duo. Se activa con `VITE_TURNSTILE_SITE_KEY`. La CSP permite solo `challenges.cloudflare.com`.
- **Remoto:** en Supabase > Auth, activar confirmación, CAPTCHA (secreto Turnstile), OTP de 900 s, SMTP propio (SPF/DKIM/DMARC) y una allowlist exacta de Redirect URLs en HTTPS. Probar: enlace usado o caducado falla; la contraseña vieja deja de servir; un redirect externo es rechazado.

### H-05 Secretos (P1) → **acción tuya pendiente**
- **Hallazgo crítico:** el bundle `assets/index-AJ1A4nfk.js` del commit `9719392` en **`origin/gh-pages`** (publicado en GitHub, 2026-09-28) contenía el **token de lectura de TMDB**, y por hash es **el mismo que está hoy en `.env`**. No se imprimió su valor.
- **Hecho:** la rama `gh-pages` se borró del remoto (2026-11-13). Tenía un solo commit, de Samuel; ninguna otra rama contiene el token.
- **Pendiente (solo lo puede hacer la persona dueña de la cuenta TMDB):** regenerar el *API Read Access Token* en TMDB > Settings > API y actualizarlo en Vercel y en `.env`. Mientras no se rote, el token sigue siendo válido: GitHub conserva el commit por SHA un tiempo y pudo copiarse antes.
- **CI:** nuevo job `secrets` (gitleaks v8.21.2, historial de la rama, `--redact`).
- El resto ya estaba bien: `VITE_*` sin secretos (guardián del build), webhooks con HMAC en tiempo constante, ventana de timestamp, límite de cuerpo e idempotencia.

### H-06 Validación y XSS (P1 defensa en profundidad) → corregido
- Revisados todos los `href`/`src` que vienen de datos. Aliados, ofertas y organizaciones ya exigían `^https://` en la base y en el cliente. Los lugares de un plan usan `httpUrl`.
- **Corregido:** `watch.link` de TMDB llegaba tal cual a un `href`. Ahora solo se acepta `https://(www.)themoviedb.org/…`. La prueba en `tmdbClient.test.js` rechaza `javascript:` y otro host.
- La API valida tipo, longitud, enumeraciones, UUID, `limit` 1–50 y fecha ISO, y nunca concatena SQL (PostgREST con filtros codificados).

### H-07 Paginación y límites (P1) → corregido
- `listPlans` trae los **200 más recientes** (antes, todos). También tienen tope las funciones (100) y ofertas (20) por título (lectura anónima), los grupos (100), los planes de un grupo (200) y los aliados pendientes (100). PostgREST tiene `max_rows = 500` como tope de servidor.
- API: `GET /api/v1/plans?limit=1..50&before=<ISO>` con paginación por cursor (`nextBefore`).
- Cuota por IP en la API: 120/min general y 10/min en registro y login, compartida en Redis (`prefix cinet:api`, separada del presupuesto TMDB). Sin Redis responde **503** (falla cerrada).
- **No se añadieron índices:** la auditoría pide `EXPLAIN (ANALYZE, BUFFERS)` con datos representativos en staging, y en local no hay volumen que lo justifique.

### H-08 HTTPS, códigos HTTP y errores (P1) → corregido
- `vercel.json`: `Strict-Transport-Security: max-age=63072000`, sin `includeSubDomains`/`preload` hasta verificar los subdominios.
- **404 real:** el fallback ya no es `/(.*)`. Solo las rutas del router reescriben a `index.html` y una ruta desconocida recibe `404.html` con **HTTP 404**; la pantalla React «Página no encontrada» se mantiene. `securityHeaders.test.js` falla si se añade una ruta al router sin añadirla a Vercel.
- **403 con pantalla:** `/admin` con rol `user` muestra «Acceso restringido (error 403)» en vez de redirigir sin explicación (`ForbiddenPage`, e2e `auth-entry`).
- Contrato de error de la API: `{ error: { code, message, requestId } }` + cabecera `x-request-id`, sin SQL ni stack.

### H-09 Observabilidad (P2) → parcial
- La API registra una línea JSON por petición: `requestId`, método, **patrón** de ruta, estado y ms. No registra IP, correo, token ni cuerpo; la prueba lo verifica.
- **Pendiente:** conectar un drain de logs de Vercel con alertas (5xx, 429, latencia, caída de Redis o Supabase) y definir la retención.

### H-10 Despliegue y rollback (P1 operación) → procedimiento + gate
- `scripts/smoke.mjs` + `.github/workflows/deploy-smoke.yml`: smoke HTTP real sobre cada despliegue de Vercel (`deployment_status`).
- `docs/DESPLIEGUE-Y-ROLLBACK.md`: preview → promoción del mismo artefacto → Instant Rollback, migraciones expand/contract y backup/restauración.
- **Pendiente:** activar *Deployment Checks* en Vercel exigiendo `smoke`, y hacer un rollback de ensayo y una restauración de backup en staging.

## Pedido añadido: JWT con dos roles de extremo a extremo

1. **Base:** `public.custom_access_token_hook` añade `app_role` = `admin` | `user` al JWT desde `profiles.role` (moderator → user). Solo lo ejecuta `supabase_auth_admin`; un `app_role` inyectado en el evento se sobrescribe. El claim `role` de Postgres sigue siendo `authenticated`.
2. **API:** Supabase Auth valida el token (firma, caducidad, sesión) y luego se lee el claim. Cada consulta viaja con el JWT de quien llama, así que la RLS vuelve a decidir: un claim `admin` viejo sin rol real en la base recibe 403.
3. **Web:** `AuthContext` toma el rol del claim (o de `profiles.role` si el hook no está activo) y `ProtectedRoute roles={["admin"]}` muestra el 403.
4. **E2E real:** el Supabase de pruebas firma HS256 y pasa los claims por el hook de la migración. `e2e/api-roles.spec.js` prueba user → 403 en admin, admin → 200, y que un `app_role` forjado dé 401.

**Activar en Supabase:** Authentication > Hooks > Custom Access Token → `public.custom_access_token_hook`. En local lo hace `config.toml`.

## Pedido añadido: API REST `/api/v1`

| Método | Ruta | Rol | Éxito | Errores |
|---|---|---|---|---|
| GET | `/health` | público | 200 | 503 sin configuración o Redis |
| POST | `/auth/register` `{name,email,password,captchaToken?}` | público | **202** neutro | 400, 415, 422, 429 |
| POST | `/auth/login` `{email,password,captchaToken?}` | público | 200 `{access_token, refresh_token, role}` | 401, 403 correo sin confirmar, 429 |
| POST | `/auth/refresh` `{refresh_token}` | público | 200 | 401 |
| GET | `/me` | user, admin | 200 | 401 |
| GET | `/plans?limit&before` | user, admin | 200 `{items,nextBefore}` | 401, 422 |
| GET | `/plans/:id` | user, admin | 200 | 401, 404 (no existe o no eres miembro) |
| GET | `/admin/organizations` | admin | 200 | 401, **403** |
| PATCH | `/admin/organizations/:id` `{status}` | admin | 200 | 401, 403, 404, 422 |

En todas: un método equivocado da **405** con `Allow`, OPTIONS da 204 con `Allow`, una ruta desconocida da 404, un cuerpo de más de 16 KB da 413 y un cuerpo lento da 408. Código: `server/api.js`, `api/v1.js`.

Ejemplo:
```bash
curl -i -X POST https://<dominio>/api/v1/auth/login -H 'content-type: application/json' -d '{"email":"a@b.co","password":"…"}'
curl -i https://<dominio>/api/v1/admin/organizations -H "authorization: Bearer $TOKEN"   # user → 403, admin → 200
curl -i https://<dominio>/api/v1/auth/register                                          # 405, Allow: POST, OPTIONS
```

## Verificación remota pendiente (antes de declarar producción segura)

- [ ] **Rotar el token TMDB** (`origin/gh-pages` ya se borró).
- [ ] `supabase db push` de la migración 20261113100000 en staging y luego en producción. Activar el Custom Access Token Hook.
- [ ] Auth alojado: confirmación, CAPTCHA, OTP de 900 s, SMTP, Redirect URLs y `max_rows`.
- [ ] Vercel: variables de `/api/v1` (`SUPABASE_PUBLISHABLE_KEY`, Upstash), Deployment Checks con `smoke` y `npm run smoke -- https://<preview>` en verde.
- [ ] A/B/C reales contra REST, RPC, Storage y Realtime (H-02, H-03).
- [ ] Varias instancias compartiendo la cuota Redis; `X-Forwarded-For` falsificado no evade el límite (configurar `TRUSTED_IP_HEADER` en staging).
- [ ] `EXPLAIN (ANALYZE, BUFFERS)` de `plans` ordenado por `created_at` con datos representativos.
- [ ] Drain de logs con alertas, y un ensayo de rollback y de restauración de backup.
