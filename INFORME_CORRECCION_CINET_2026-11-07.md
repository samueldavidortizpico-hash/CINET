# Informe técnico — corrección de la segunda auditoría de CINET

Fecha: 2026-11-07/08 · Rama de trabajo: `fix/audit-2026-11-07` · Base: `a596ad2` (la rama local ya coincidía con el commit auditado) · Referencia: `Auditoria_CINET_2026-11-07.docx`.
Sin commit, push, deploy ni migración remota. Los cambios locales previos del propietario se respaldaron antes de empezar (`git stash` «backup owner WIP before audit fixes 2026-11-07», sin tocar el árbol) y se conservaron.

## A. Resumen ejecutivo

**Estado inicial.** Suite local verde (181 pruebas, lint limpio), pero con entradas adicionales se rompían contratos de datos, cupos, cuotas y orden de eventos (24 hallazgos).

**Qué se hizo.** 23 de los 24 hallazgos tienen corrección en código con pruebas locales superadas; N17 (Realtime) **no** se modificó (requiere verificar en staging, ver F). Se añadieron 3 migraciones nuevas (no se editó ninguna histórica), un módulo de contrato de datos, una puerta única de acceso a TMDB, lector de webhooks acotado, `<dialog>` nativo, recuperación por ruta, CSP completa verificada en navegador y CI ampliado.

**Evidencia más fuerte.** Concurrencia con **PostgreSQL 17.5 real y conexiones reales** (no PGlite): antes de la corrección, una segunda creación de sala superó el cupo (6 salas con máximo 5) y aceptar/revocar produjo `40P01`; después: `CN429`, `CN410` y 0 deadlocks (`audit/2026-11-07/V13-V43-V44-concurrency-*.json`).

**Riesgos restantes.** (1) Nada se ha verificado en Supabase, Redis, Vercel, SMTP o GitHub remotos. (2) La APK **no se pudo construir** (Gradle sin acceso a `dl.google.com`). (3) 2 avisos `npm audit` en herramientas de desarrollo (Capacitor CLI) exigen migrar a Capacitor 8. (4) N17 sin cerrar. (5) Las ráfagas simples no reprodujeron el exceso de cuota «antes» (es no determinista); sí lo hicieron las intercalaciones con barreras.

## B. Matriz de los 24 hallazgos

Estado: ✅ corregido y probado localmente · 🟡 corregido localmente, falta verificación remota · ⛔ no cerrado.

| ID | Sev. | Causa raíz | Corrección | Prueba | Estado |
|---|---|---|---|---|---|
| N01 | Alta | CHECK solo validaba objeto + tamaño | Contrato v1 en SQL (`plan_contract_problem`, CHECK `plans_contract_v1`, CN422 en `create_plan`), decodificadores `planContract.js`, `toUiPlans` aísla filas, reparación de históricos con cuarentena | `contracts.test.js` V01–V04 | ✅ |
| N02 | Alta | `pg_timezone_names` ≠ `Intl` (p. ej. `Factory`) | 32 zonas canónicas idénticas en SQL y JS (prueba que las compara); UTC informado conservando el instante; ICS verificado | `contracts.test.js` V04/V05 | ✅ |
| N03 | Media | `repeat_plan` insertaba plan ∪ grupo sin contar | Unión por UUID en arrays, tope 30 → CN429 atómico; misma regla en `share_plan_with_group` y `schedule_next_plan`; sin RSVP copiado | V07/V08 (antes 59 miembros) | ✅ |
| N04 | Media | `add_org_member` leía `auth.users` y daba de alta | Invitaciones con hash de correo, vencen a 7 días, revocables, cupos 20/50, solo organización verificada, aceptación explícita; el nombre antiguo ya no devuelve nada | `partners.test.js` V09/V10 + 2 | ✅ |
| N05 | Alta | Sin fila de control: el primer `expired` no dejaba barrera | `billing_state` por usuario, registros monótonos grant/stop por `(occurred_at, event_id)`, estado derivado | `billing-order.test.js`: 24 permutaciones → 1 estado; concurrencia real | ✅ (sin pasarela: no habilitar cobros) |
| N06 | Alta | Lua incrementaba el global antes de comprobar la identidad | Script: identidad → global de trabajo admitido → suma; rechazos a contador aparte | `tmdbProxy.test.js` + Lua real ejecutado en VM (fengari, Redis simulado) | 🟡 falta Redis real |
| N07 | Alta | `api/og` creaba otro proxy sin Redis | `createTmdbAccess` única; OG con identidad y presupuesto propios; sin Redis → 503 / vista genérica | V16/V17 | 🟡 falta 2 instancias reales |
| N08 | Media | Límite por caracteres, listener vivo | Lector en bytes, 413/408, limpia listeners, `resume()`, Buffer exacto para HMAC | V22/V23/V28 | ✅ |
| N09 | Media | Tope de 30 s recortaba `Retry-After` | Se respeta íntegro, bloqueo compartido, jitter posterior, error con `retryAt` | V30/V31 | ✅ |
| N10 | Media | Rama de texto sin `SORTERS` | `sortTitles` con desempate estable; `sortScope` declarado; reordena lo cargado al paginar; aviso en UI | V32 | ✅ |
| N11 | Media | Filtro de actores sin validar tipos | Esquema v2 por fragmento, aviso de lo descartado, versión futura descartada, `RouteError` de Duo que solo borra `cinehub-duo-session` | `useDuoSession.test.js` V36/V37 + E2E | ✅ |
| N12 | Media | Trampa de foco en JS; el iframe no propaga teclas | `Modal` sobre `<dialog>` + `showModal()` (fondo inerte), Escape nativo, foco devuelto | E2E V38/V39 (reproductor cargado y fallido) | ✅ |
| N13 | Media | Una fila inválida rechazaba todo | Zona/título/URL validados en SQL y por fila en JS; funciones y ofertas con error y reintento independientes | V06 | ✅ |
| N14 | Media | Locks invitación→grupo vs grupo→invitación | `accept_group_invite` bloquea grupo→invitación y revalida | PostgreSQL real con barrera: antes `40P01`, después `CN410` | ✅ local · 🟡 staging |
| N15 | Media | Contar antes de insertar | Advisory lock transaccional por propietario en salas, grupos y solicitudes | PostgreSQL real con barrera: antes 6 salas, después 5 + `CN429` | ✅ local · 🟡 staging |
| N16 | Media | Identidad por IP sin contrato | `clientIp`: socket por defecto, `TRUSTED_IP_HEADER`/`HOPS` opcionales validados como IP, clave HMAC (sin IP cruda); procedimiento de staging | V20 | 🟡 falta confirmar topología en Vercel |
| N17 | Baja | DELETE de `plans`/`duo_rooms`/`room_rounds` fuera de RLS | **Sin cambio**; procedimiento de verificación y plan | — | ⛔ |
| N18 | Media | Sin CSP | CSP completa (script por hash, sin comodines generales), prueba de hash, E2E con la cabecera real y script inyectado bloqueado | `securityHeaders.test.js` + E2E: 0 violaciones | ✅ (efectiva en Vercel: 🟡) |
| N19 | Media | Árbol de herramientas | Overrides `minimatch`/`rimraf`: 8 → 2 avisos; `tar` no se fuerza (rompe `cap sync`, comprobado) | `npm audit` | 🟡 parcial |
| N20 | Media | `server.url` remoto fijo | Sin `server.url`; `VITE_APP_ORIGIN` para enlaces de Auth; procedimiento | `distribution.test.js`; APK **no construida** | 🟡 sin APK |
| N21 | Media | `push` solo a `main` | PR, `fix/**`, `audit/**`, dispatch, auditoría de dependencias, artefactos con SHA | `distribution.test.js` | 🟡 sin ejecución en GitHub |
| N22 | Media | Fallos convertidos en vacío | `loadMoviesByIds` (movies/failed/missing), favoritos parciales con reintento, `RouteError` por ruta | V48 | ✅ |
| N23 | Media | `fetch` sin plazo | `AbortSignal` 4 s, 503 reintentable con `Retry-After`, idempotencia, log sin datos sensibles | V29 | ✅ |
| N24 | Media | Matriz operativa | Matriz y procedimientos en `docs/OPERACION-STAGING.md` | — | 🟡 documentación |

## C. Seguimiento de los 36 hallazgos anteriores

Sin regresiones detectadas por la suite: AD01–AD07, AD10–AD12, API02–API03, API06, FE01–FE03/FE05 y OP04 se cubren con pruebas existentes que siguen pasando (ver E). Se modificaron dos expectativas de pruebas viejas, deliberadamente: `describeStart` ahora añade `zoneFallback`; y en `plus.test.js` una renovación anterior a la cancelación pero llegada tarde ahora extiende el periodo (antes `stale`, dependiente del orden de llegada, justo lo que N05 corrige). **Necesitan nueva verificación en staging:** AD02 (Realtime entre dos cuentas) y AD01 con enlaces vigentes/vencidos.

## D. Cambios realizados

**Migraciones nuevas:** `20261107100000_plan_data_contracts.sql`, `20261107110000_org_invitations.sql`, `20261107120000_billing_order_and_quotas.sql`.
**Funciones SQL nuevas/modificadas:** `create_plan`, `propose_plan_times`, `repeat_plan`, `share_plan_with_group`, `add_org_member`, `invite_org_member`, `accept/decline/revoke_org_invite`, `list_my_org_invites`, `apply_billing_event`, `accept_group_invite`, `create_duo_room`, `create_group`, `request_organization`, `is_supported_time_zone`, `plan_contract_problem/repair`, ayudantes `cn_*`.
**Servidor/API:** `server/tmdbProxy.js`, `ogMeta.js`, `partnerWebhook.js`, `billingWebhook.js`, `api/tmdb.js`, `api/og.js`, `api/partner-webhook.js`, `api/billing-webhook.js`.
**Cliente:** `planContract.js` (nuevo), `planRepository.js`, `planService.js`, `showtimeService.js`, `movieService.js`, `tmdbClient.js`, `authService.js`, `partnerRepository.js`, `groupRepository.js`, `useDuoSession.js`, `useTitleSearch.js`, `utils/calendar.js`, `utils/env.js`.
**Componentes/páginas:** `Modal.jsx`, `RouteError.jsx` (nuevo), `PartnerListings.jsx`, `PartnerPage.jsx`, `DashboardPage.jsx`, `DuoPage.jsx`, `MoviesPage.jsx`, `router.jsx`; CSS `trailer.css`.
**Configuración:** `vercel.json` (CSP), `capacitor.config.json`, `.github/workflows/ci.yml`, `package.json` (overrides), `.env.example`.
**Pruebas nuevas:** `supabase/tests/contracts.test.js`, `billing-order.test.js`, `e2e/audit-recovery.spec.js`, `server/distribution.test.js`, y ampliaciones en `partners`, `plus`, `tmdbClient`, `useDuoSession`, `tmdbProxy`, `partnerWebhook`, `securityHeaders`.
**Evidencia y sondas:** `audit/2026-11-07/` (sondas `concurrency.mjs`, `lua-probe.mjs`, resultados JSON/TXT).
**Documentación:** `docs/OPERACION-STAGING.md`, este informe.

## E. Resultados de pruebas

Base histórica (no es esta ejecución): 180 pruebas, 30 E2E + 3 omitidas. Resultados de **esta** ejecución: `audit/2026-11-07/exit-codes.txt`, `tests.txt`, `e2e.txt`, `lint.txt`, `build.txt`, `audit-full.txt`, `audit-prod.txt` (cifras en «Resultado final», al pie).

No ejecutado y por qué: APK (Gradle sin acceso a `dl.google.com`); Redis real, Supabase remoto, Realtime, SMTP, CAPTCHA y GitHub Actions (sin acceso/credenciales); deadlocks y cupos en el Supabase real (solo PostgreSQL local). PGlite no acredita deadlocks, por eso se usó PostgreSQL 17.5 con conexiones reales.

## F. Pendientes de infraestructura

Detalle y comandos en `docs/OPERACION-STAGING.md`. **Supabase remoto:** aplicar las 3 migraciones en staging con respaldo, revisar cuarentenas, Auth (CAPTCHA/SMTP/límites), Realtime (N17). **Redis:** repetir V15–V19. **Vercel:** cabecera de IP confiable, CSP efectiva, variables. **TMDB:** presupuesto real de bots de vista previa. **SMTP:** cuota y remitente. **GitHub Actions:** PR y checks requeridos. **Android:** construir e instalar la APK, `VITE_APP_ORIGIN`, migrar a Capacitor 8. **Backups:** restauración probada (V50).

## G. Recomendación de liberación

**Apto para staging** (con los pasos de F), **no apto para producción**: hay verificaciones operativas críticas pendientes (migraciones sin aplicar en un entorno real, Redis real, topología de IP, APK, N17 abierto y 2 avisos de dependencias de herramientas). No habilitar cobros reales: N05 está corregido y probado localmente, pero sin pasarela ni prueba contra staging.

## Resultado final (ejecución real, `audit/2026-11-07/`)

| Comprobación | Resultado |
|---|---|
| `npm run lint` | 0 errores (salida 0) |
| `npm test` (unitarias, servidor, SQL en PGlite) | **222 correctas, 0 fallos, 0 omitidas** |
| `npm run test:e2e` (Playwright, Chromium) | **40 correctas, 0 fallos, 3 omitidas** (las tres capturas Duo bajo demanda, ya omitidas en la línea base) |
| `npm run build` | correcto |
| `npm audit --omit=dev` | **0 vulnerabilidades** |
| `npm audit` completo | 2 (1 alto, 1 crítico: `@capacitor/cli` / `tar`); antes 8. Requiere Capacitor 8 |
| `git diff --check` | sin errores |
| Concurrencia, PostgreSQL 17.5 real, 2 conexiones | ver `V13-V43-V44-concurrency-{BEFORE,AFTER}.json` |
| Lua del limitador en VM Lua 5.3 con Redis simulado | `V15-V19-lua-rate-script.txt` (no es Redis real) |
| APK Android | **no construida** (Gradle sin red a `dl.google.com`) |

Incidente durante la validación: la primera pasada completa dio 3 fallos E2E (Duo completo). Causa: mi validación nueva de `finalists` en `useDuoSession.js` rechazaba `why` como lista de textos y descartaba todos los finalistas. Corregido y cubierto con una prueba de regresión; la segunda pasada completa quedó en verde. Recorrido que lo detectó: `e2e/duo-journey.spec.js`.
