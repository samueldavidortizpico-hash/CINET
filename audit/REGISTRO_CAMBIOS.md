# Registro de cambios de auditoría

## Seguimiento de estabilización — 2026-11-05 (continuación)

- Rama `audit/cinet-2026-11-05`, HEAD base `c73d524726d2d0cc4d314f0794349339f4dd5819`; checkout ya tenía modificaciones staged (ninguna), unstaged y archivos nuevos. Se conserva todo y no se atribuyen los cambios previos a esta continuación.
- Se corrigió el build E2E: `accounts` ahora compila con URL/clave exclusivas del fake Supabase; el bundle local sigue compilándose sin conexión. Los puertos de prueba pueden configurarse con `CINET_E2E_LOCAL_PORT` y `CINET_E2E_ROOMS_PORT`.
- Se eliminó `process.exit(0)` del cierre del fake Supabase para permitir salida natural. La suite aún no demostró cierre natural: quedan procesos del intento y el runner no terminó durante la observación.
- Ataque/reproducción de registro E2E obtuvo `net::ERR_FAILED` porque el bundle enviaba la solicitud al puerto fijo 4176 mientras el servidor usaba puerto alternativo. El build ahora deriva URL del mismo puerto; la repetición sigue bloqueada por el control de puertos/runner, por lo que no se declara corregido ni E2E PASS.
- Pruebas locales: `npm test` 180/180 PASS; `npm run lint` PASS; `npm run build` PASS; `git diff --check` pendiente al cierre.
- Auditoría del checkout: `npm audit` 8 advisories (6 moderados, 1 alto, 1 crítico); `npm audit --omit=dev` 0. `@capacitor/cli@6.2.3` requiere tar 6 y llama `tar.extract`; override 7.5.21 retira tar del audit pero `npx cap sync android` falla en `extractTemplate` al leer `extract` de `undefined`. No se aplicó al checkout.
- PostgreSQL real no disponible; T09–T13 y T18 siguen BLOCKED para concurrencia. No se ejecutó CI Linux ni proveedor/staging.
- Archivos de artefactos `.playwright-mcp/`, `.vercel/`, `snapshots/`, `test-results/` y archivos de usuario preexistentes quedan fuera del commit.

## 2026-11-05 — diagnóstico inicial

- **Archivos añadidos:** `audit/INFORME_AUDITORIA_CINET.md`, `audit/MATRIZ_38_CASOS.md`, `audit/PLAN_REMEDIACION.md`, este registro.
- **Motivo:** registrar commit/entorno, evidencia de línea base, estados de los 36 hallazgos y resultado/cobertura de casos sin asumir que el informe histórico sigue vigente.
- **Archivos de producto editados:** `server/tmdbProxy.js`, `server/tmdbProxy.test.js`, `src/services/tmdbClient.js`, `src/services/tmdbClient.test.js`, `src/data/duo.js`, `src/components/duo/DuoModeStep.jsx`, `src/hooks/useDuoSession.js`, `src/hooks/useDuoSession.test.js`, `supabase/migrations/20261105120000_reject_null_plan_version.sql`, `supabase/tests/plans.test.js`.
- **Correcciones:** purga solo de cuotas expiradas; errores de lectura del body/adaptador normalizados; `Retry-After` en segundos o fecha HTTP con máximo de 30 s y cooldown de pestaña; control optimista SQL rechaza NULL con `IS DISTINCT FROM`; validación estricta del estado de maratón persistido.
- **Pruebas ejecutadas:** `npm test` final tras migración (169/169 PASS; baseline 163/163), targeted proxy/TMDB (20/20 PASS), `supabase/tests/plans.test.js` (10/10 PASS tras migración), `src/hooks/useDuoSession.test.js` (2/2 PASS), lint dirigido `eslint src server api` (PASS), `npm run build` (PASS), `npm run lint` (FAIL: 210 errores en assets minificados Android), `npm audit` (11 vulnerabilidades), `npm audit --omit=dev` (0), Playwright (31 resultados PASS, 2 capturas omitidas; proceso no cerró y fue interrumpido, código 1).
- **Migraciones:** nueva migración aditiva con `CREATE OR REPLACE`, aplicada solo al PGlite efímero del harness. No se aplicó a Supabase remoto.
- **Rollback:** revertir únicamente los cambios de proxy/cliente TMDB listados y retirar los cuatro archivos `audit/`; no revertir ni limpiar cambios preexistentes del árbol.
- **Riesgo:** el checkout tenía cambios locales y artefactos no seguidos antes de empezar; el build se ejecutó y puede haber actualizado `dist/`. Revisar `git status` antes de integrar.
# Seguimiento de cambios — 2026-11-05 (segunda etapa)

- **SQL:** `supabase/migrations/20261105130000_serialize_plan_operations.sql` serializa operaciones sensibles con orden estable de locks; `supabase/tests/plans.test.js` añade pruebas locales de JSON/timezone/idempotencia. No prueba carreras PostgreSQL reales.
- **Proxy:** `server/tmdbProxy.js`, `api/tmdb.js`, `vercel.json`, `.env.example`, `server/tmdbProxy.test.js`, `server/securityHeaders.test.js`: limitador Upstash atómico, IP confiable configurable, adulto coherente, JSON inválido y cabeceras. Configuración de Upstash obligatoria en función; sin staging real.
- **Frontend:** `src/hooks/useTitleSearch.js`, `src/utils/searchSuggestions.js`, `src/components/movies/MovieSearch.jsx`, `src/services/movieService.js`, `src/services/duoService.js`, `src/components/common/Modal.jsx`, `src/services/tmdbClient.js`, `src/hooks/useMovie.js`, `src/pages/MovieDetailPage.jsx`, `src/context/PlanContext.jsx`, `src/services/accountScopedImports.js`, `src/utils/storage.js`; pruebas nuevas en hooks, servicios y utilidades. Cobertura de navegador/teclado pendiente.
- **Herramientas:** `eslint.config.js` excluye solo bundle Android generado; `package.json`/`package-lock.json` actualizan dependencias compatibles; `playwright.config.js`, `scripts/build-e2e.mjs`, `e2e/support/fake-supabase.mjs` investigan build/servidores E2E y evitan incluir variables locales privadas en bundle de prueba.
- **Evidencia final disponible:** npm test 180/180; lint y build PASS; Playwright reporta pruebas pero no cierra con código 0; audit completo 8 advisories (1 critical), audit omit dev 0. No se tocó producción, no se hizo merge ni se cambió de rama.
- **Archivos preexistentes:** `git status` ya mostraba modificaciones antes de esta tanda. Se preservaron todos; este registro no atribuye fechas anteriores que Git no puede demostrar.

## Estado final de la continuación — 2026-11-05

- Playwright completo en clon limpio con `CINET_E2E_LOCAL_PORT=42973 CINET_E2E_ROOMS_PORT=42976 npm run test:e2e`: 30 PASS, 0 FAIL y 3 omitidos; los omitidos son capturas condicionadas a `DUO_CAPTURE=1`. No hubo código de salida final natural durante la observación, incluso tras cierre graceful; E2E BLOCKED.
- `npm ci` con el lockfile del checkout en clon limpio: PASS. El clon instaló sin override y mantuvo los 8 advisories; las 180 pruebas, lint, build y audit omit dev 0 PASS. `npm audit` FAIL (8).
- `git diff --check` PASS en checkout. CI Linux NOT RUN; PostgreSQL real BLOCKED; proveedor remoto/staging NOT RUN.
- Capacitor/Android lockfile vigente: `npx cap sync android` PASS en clon temporal. `android/gradlew.bat :app:assembleDebug --console=plain` BLOCKED: falta `ANDROID_HOME`/`sdk.dir` en la copia temporal; Gradle 8.2.1 arrancó y falló al localizar Android SDK.
