# Despliegue, promoción y rollback (auditoría H-10)

Hosting: Vercel (web + `api/*`). Base y Auth: Supabase. Cuotas: Upstash Redis.
Responsable de promoción y rollback: la persona dueña del proyecto en Vercel (hoy, una sola cuenta).

## 1. Fase preview / staging

1. Abrir un PR. El CI (`.github/workflows/ci.yml`) corre lint, pruebas unitarias y SQL (PGlite), build con guardián de secretos, E2E y **gitleaks** (bloquea secretos en el historial).
2. Vercel crea un **preview** del mismo SHA. Al terminar, GitHub recibe `deployment_status` y corre **Deploy smoke** (`.github/workflows/deploy-smoke.yml` → `scripts/smoke.mjs`):
   cabeceras (HSTS, CSP, nosniff), `/login` 200, ruta inexistente **404**, `/api/v1/health` 200, `/api/v1/me` 401, `GET /api/v1/auth/register` 405, 415 en cuerpo no JSON, `/api/tmdb/configuration` 200 y HTTP→HTTPS.
3. Migraciones: **solo expand** en esta fase (añadir tablas, columnas nulas, políticas, funciones). Se aplican a staging con `supabase db push` contra el proyecto de staging, antes del preview que las necesita. Nunca `drop`/`rename` en la misma entrega que el código que deja de usarlos.
4. Pruebas manuales con cuentas sintéticas A/B/C en staging (ver la lista de verificación remota del informe).

## 2. Promoción a producción

1. En Vercel > Settings > **Deployment Checks**, exigir el check `smoke`: Vercel no asigna el dominio de producción si el smoke falla.
2. Promover **el mismo despliegue** que pasó en preview (Vercel > Deployments > Promote): mismo artefacto y mismo SHA, sin reconstruir.
3. Antes de promover, aplicar a producción **solo** las migraciones expand que ya pasaron en staging. Un backup reciente es requisito previo (Supabase > Database > Backups; en el plan Pro, PITR).
4. Tras promover, el smoke vuelve a correr contra producción (`deployment_status` de producción). Si falla → rollback.

## 3. Rollback

- **Frontend/API:** Vercel > Deployments > último despliegue sano > **Instant Rollback**. Tarda segundos y no reconstruye.
- **Criterio automático:** smoke de producción en rojo, o 5xx de `/api/*` por encima del 2 % durante 5 minutos (alerta en Vercel Observability o en el proveedor de logs).
- **Después del rollback:** correr `npm run smoke -- https://<dominio>` manualmente y revisar que `x-request-id` aparezca en las respuestas de la API.
- **Límite:** el rollback de Vercel no revierte la base. Por eso las migraciones son expand/contract. El código viejo debe funcionar con el esquema nuevo. Si una migración rompió datos: restaurar backup/PITR en un proyecto nuevo, verificar y cambiar `SUPABASE_URL` (procedimiento manual, con ventana de mantenimiento).
- **Contract** (borrar lo viejo): en una entrega posterior, cuando ningún despliegue activo ni reversible use lo que se borra.

## 4. Backup y restauración (por probar)

- [ ] Restaurar el backup diario de staging en un proyecto temporal y correr `supabase/tests` contra él (o el smoke con esa URL). Anotar fecha y tiempo de restauración.
- [ ] Repetirlo cada trimestre.

## 5. Secretos

- Nunca en PRs desde forks: `deploy-smoke` solo usa `VERCEL_AUTOMATION_BYPASS_SECRET` (si el preview está protegido), y GitHub no lo entrega a forks.
- Variables de servidor en Vercel por entorno (Preview ≠ Production): `TMDB_READ_TOKEN`, `UPSTASH_REDIS_REST_*`, `SUPABASE_SERVICE_ROLE_KEY` (solo webhooks), `*_WEBHOOK_SECRET*`.
- Rotación: al rotar, primero se crea el secreto nuevo en el proveedor, luego en Vercel, se redespliega y al final se revoca el viejo.
