# CINET — registro de implementación

Registro vivo de la ejecución de `docs/PROMPT-CODEX-CINET.md` (estrategia en `docs/CINET-ESTRATEGIA-2026-10-09.md`).
Cada fase anota qué se hizo, con qué evidencia y qué queda pendiente. Si la ejecución se corta, la siguiente tarea
exacta está al final.

## Fase 0 · Auditoría (2026-10-09)

**Línea base propia** (antes de cambiar nada): `npm run lint` sin errores · `npm test` 57/57 · `npm run build` correcto,
JS de entrada 500,84 kB (146,76 kB gzip), CSS 201,64 kB, aviso de chunk > 500 kB. Sin Docker ni `psql` en el equipo:
las pruebas de base de datos usan PostgreSQL 17 real en WASM (PGlite), como ya hacía `scripts/check-avatar-policies.mjs`.

Cambios previos sin commit que se conservan: rediseño de Duo para 1–8 personas, limpieza de 74 archivos,
`scripts/check-avatar-policies.mjs`, `supabase/AVATARS.md` y los documentos de estrategia.

### Hallazgos verificados en el código

| Área | Estado real | Riesgo |
| --- | --- | --- |
| Planes | `PlanContext` guarda en `localStorage` (`cinehub-plans`); id `cinehub-<timestamp>`; dueño por `ownerEmail`; RSVP por nombre (`setRsvp`). Planes sin dueño los gestiona cualquiera (`canManagePlan`). | El enlace compartido no funciona en otro dispositivo; dos personas con el mismo nombre se pisan. |
| TMDB | `tmdbClient.js` lee `import.meta.env` como objeto: Vite incrusta **todas** las variables `VITE_*`, incluido el token, en el bundle. | Token público. |
| Funciones de cine | `showtimes.js`: 3 sedes y 4 horas fijas presentadas como funciones. `/cine` lista títulos en cartelera regional (TMDB), no funciones por sede. | Planes con horarios ficticios. |
| Copy | `MovieActions`: «Ver película» abre plataformas o cadenas; no reproduce nada. «Ver funciones» lleva a horarios inventados. | Expectativa falsa. |
| Auth | Supabase Auth con email; `toAppUser` asume `user.email` (falla con invitados anónimos). Anónimos desactivados en `config.toml`. | Bloquea invitados sin corregir el contrato. |
| Despliegue | `vercel.json` reescribe todo a `index.html` (incluiría `/api/*`). `.github/workflows/` vacío. | Sin API ni CI. |
| Gustos | Favoritos, historial y sesión Duo en claves globales del navegador. | Se mezclan cuentas en un navegador compartido. |

### Contratos decididos

- **Identidad.** Cuenta permanente = usuario de Supabase Auth con email. Invitado = sesión anónima de Supabase
  (`is_anonymous`), sin rol de admin, convertible a cuenta permanente; requiere habilitarla en el proyecto remoto.
  Un miembro de un plan o sala se identifica por `auth.uid()`; el nombre visible es una copia elegida al unirse y
  **nunca** autoriza nada.
- **Privacidad de planes.** Privados por defecto: solo los miembros leen. El dueño edita, cancela, invita, revoca y
  expulsa; cada miembro cambia solo su RSVP. Escrituras solo por funciones RPC con comprobaciones explícitas; las
  tablas no aceptan `insert/update/delete` directos desde el cliente.
- **Invitaciones.** Token aleatorio de 256 bits generado en el servidor, se guarda solo su SHA-256, caduca
  (14 días por defecto), se puede revocar y lleva contador de usos. El canje es idempotente.
- **Concurrencia.** `create_plan` es idempotente por `(owner_id, client_ref)`; editar exige la `version` leída
  (conflicto = `CN409`). Capacidad: 30 miembros por plan, comprobada con bloqueo de fila.
- **Errores de servidor** (SQLSTATE propio): `CN403` sin permiso · `CN404` no existe o no es visible ·
  `CN409` conflicto de versión · `CN410` caducado, revocado o cancelado · `CN422` dato inválido · `CN429` cupo lleno.
- **Datos locales.** Se conservan. Importar a la cuenta es opcional, con vista previa y deduplicación por id local;
  los RSVP antiguos por nombre no se convierten en confirmaciones autenticadas.
- **Horarios.** `time_source = 'organizer'` (hora propuesta por quien organiza, a confirmar en el sitio oficial) o
  `'showtime'` (función de una fuente autorizada, fase 4). Sin fuente, CINET no afirma funciones, precio ni cupos.
- **Fases de sala Duo (fase 2).** lobby → votación → revelación → elección → cerrada/caducada; baraja y participantes
  congelados por ronda; votos privados hasta el cierre.

### Backlog ejecutable

| ID | Problema del usuario | Resultado esperado | Validación |
| --- | --- | --- | --- |
| P0-1 | El token de TMDB es público | Proxy `/api/tmdb` con lista blanca, token solo en servidor | Pruebas del proxy; build con token sintético sin filtración |
| P0-2 | Un amigo no ve el plan | Planes, miembros e invitaciones en Supabase con RLS y RPC | Pruebas SQL con dueño, miembro, extraño y revocado (PGlite) |
| P0-3 | Confirmar en nombre de otro | RSVP por `auth.uid()`; misma persona con el mismo nombre no colisiona | Pruebas SQL + recorrido en navegador |
| P0-4 | Horarios inventados | Hora propuesta + enlace oficial; copy honesto | Revisión de UI y E2E |
| P0-5 | Sin CI | Workflow: instalación, lint, pruebas, pruebas de BD, build, E2E | Ejecución local de cada paso |
| P0-6 | Sin medición | Contrato de eventos + adaptador con consentimiento; sin proveedor = no-op | Pruebas unitarias |
| P1-1 | Votar cada quien desde su celular | Salas con código/QR, rondas y votos privados | Pruebas SQL de privacidad y concurrencia |
| P1-2 | Invitados sin cuenta | Auth anónima con `toAppUser` robusto | Pruebas de contrato |
| P2-* | Repetir con el grupo | Preferencias por cuenta, CSV, grupos, .ics, veto, familia, justicia, Open Graph | Ver fase 3 |
| P3-* | Conectar con cines | `showtimeService`, panel de aliado por organización, atribución | Ver fase 4 |
| P4-* | Comodidad e ingresos | Lenguaje natural, PWA, snapshot de catálogo, CSS, Plus en sandbox | Ver fase 5 |

## Progreso

### P0-1 · Proxy de TMDB — HECHO y verificado localmente
- `server/tmdbProxy.js` (núcleo: lista blanca de rutas y parámetros, solo GET, include_adult=false, TTL por tipo,
  errores sin secretos, límite por IP **por instancia**), `api/tmdb.js` (Vercel), middleware en `vite.config.js`
  (dev y preview), `vercel.json` (`/api/tmdb/:path*` → función; el fallback SPA excluye `/api/`).
- Cliente: `src/utils/env.js` lee variables clave por clave; `tmdbClient.js` en el navegador usa siempre
  `/api/tmdb` y nunca un token; respuesta `no-token` → modo catálogo local.
- Guardián `secretGuard` en `vite.config.js`: el build FALLA si un secreto del servidor aparece en el bundle.
- **Hallazgo:** el `dist/` anterior contenía el token real de TMDB (`import.meta.env` leído como objeto). Si ese build
  se desplegó, el token es público: **rotarlo en TMDB** (acción del dueño, no realizada) y en Vercel definir
  `TMDB_READ_TOKEN` y borrar `VITE_TMDB_READ_TOKEN`.
- Evidencia: `server/tmdbProxy.test.js` (5 pruebas); build con token sintético → 0 apariciones; build con el token
  real del .env → 0; build con un "secreto" presente en el código → falla con mensaje claro; navegador: `/cine`
  «TMDB conectado», 23 pósteres, 0 peticiones directas a TMDB, 0 cabeceras Authorization.
- Límite global: pendiente de almacén compartido (p. ej. Upstash Redis) si el tráfico lo exige.

### P0-2 · Planes compartidos (servidor) — HECHO y verificado localmente
- `supabase/migrations/20261009120000_shared_plans.sql`: plans, plan_members, plan_invites; RLS solo lectura para
  miembros; escrituras solo por RPC; invitaciones con hash SHA-256, caducidad, revocación, usos; cupo 30;
  versión para conflictos; invitado anónimo puede unirse/responder pero no crear.
- Banco de pruebas: `supabase/tests/db.js` (PGlite = PostgreSQL real, aplica TODAS las migraciones) y
  `supabase/tests/plans.test.js` (9 pruebas: dueño, miembro, extraño, mismo nombre, ataques directos a tablas,
  versión, revocación, caducidad, cupo, invitado anónimo, cancelación). `npm test` = 72/72.
- **Pendiente remoto:** aplicar la migración en el proyecto Supabase (`npx supabase db push`, con autorización).

### P0-3 · Planes compartidos (cliente) — EN CURSO
- Hecho: `src/services/planRepository.js` (RPC, `toUiPlan`, `toPlanError`, realtime), ayudantes de hora en
  `planService.js` (`to24h`, `toStartParts`, `describeStart`), `supabaseClient.js` vía `env.js`,
  `PlanContext.jsx` con modos remote/local, `isOwner`, importación de planes locales.
- Hecho también: `CreatePlanPage` (clientRef, aviso de modo local, errores), `RsvpPanel`/`PlanCard`/`PlanPage`/`ProfileCard`/`DashboardPage` usan la API nueva (`plan` en vez de id, `plan.isOwner`). P0-6: `src/services/analytics.js` + pruebas (contrato, consentimiento, sin proveedor = no-op). `npm test` 74/74; lint con 1 aviso pendiente de revisar.
- **Siguiente tarea exacta:** revisar el aviso de lint; adaptar a la API asíncrona de PlanContext: `CreatePlanPage` (clientRef con
  `crypto.randomUUID()`, aviso de modo local, estados de envío/error), `PlanPage` (cargar plan remoto por id con
  `repo.getPlan` + `subscribePlan`, panel del dueño: invitar/revocar/cancelar/eliminar/quitar miembro; miembro:
  RSVP propio y salir; banner de cancelado; «hora propuesta»), `RsvpPanel` (`respondToPlan(plan, person, status)`),
  `PlanCard` (`deletePlan(plan)`, `plan.isOwner`), `ProfileCard`/`DashboardPage` (`plan.isOwner` en vez de
  `ownerEmail`), `MyPlansPage` (aviso de importación), nueva ruta `/invite/:token` (`InvitePage`).
  Luego P0-4 (horarios honestos + copy de MovieActions), P0-5 (CI), P0-6 (analítica).
