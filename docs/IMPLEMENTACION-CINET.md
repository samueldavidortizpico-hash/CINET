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

### P0-3 · Planes compartidos (cliente) — HECHO y verificado localmente (falta remoto)
- `src/services/planRepository.js` (RPC, `toUiPlan`, `toPlanError`, realtime), ayudantes de hora en `planService.js`
  (`to24h`, `toStartParts`, `describeStart`), `PlanContext.jsx` con modos remote (Supabase + sesión) / local.
- `CreatePlanPage` (clientRef idempotente, aviso de modo local), `PlanPage` (plan remoto por id + realtime; dueño:
  editar con control de versión, invitar/revocar enlaces, quitar personas, cancelar/eliminar; miembro: RSVP propio y
  salir; avisos de plan local y cancelado), `RsvpPanel` (remoto = respuesta de tu cuenta), `InvitePage`
  (`/invite/:token`: vista previa, iniciar sesión/crear cuenta con retorno, unirse con nombre visible; CN410 =
  invitación caducada/revocada), `MyPlansPage` (aviso de importación de planes locales con selección; estados de
  carga/error), `PlanCard` (no comparte la URL de un plan privado; estado CANCELADO), `PlanHero` («Hora propuesta» y
  enlace a la cartelera oficial).
- Evidencia: lint limpio; `npm test` 82/82 (incluye 9 pruebas SQL en PGlite); E2E local (abajo).
- **Pendiente remoto (requiere autorización):** aplicar la migración (`npx supabase db push`) y probar el recorrido
  dueño → enlace → segunda cuenta → RSVP en dos navegadores.

### P0-4 · Horarios honestos — HECHO
- Eliminados los cines y horarios ficticios (`CINEMAS`, `SHOW_TIMES`); `/functions` propone cadena oficial + sede
  opcional + fecha + hora propuesta (`timeSource: "organizer"`) y guarda `cinema.url` → el plan enlaza a la cartelera
  oficial. Copy: «Esta es una propuesta de salida, no una función confirmada».
- `official_booking_clicked` en `/functions` y `/cine/:id`.

### P0-5 · CI — HECHO (local); se ejecutará en GitHub al subir
- `.github/workflows/ci.yml`: `npm ci` → lint → `npm test` (unitarias, proxy, SQL en PGlite) → build (con guardián de
  secretos) → Playwright (Chromium) → artefactos si falla. Sin secretos.
- `playwright.config.js` + `e2e/plan-journey.spec.js` (modo local forzado: variables vacías ganan a `.env`):
  película → propuesta en cine oficial → plan → «Tal vez» → Mis planes, sin peticiones a TMDB/Supabase; invitación sin
  cuentas; Duo solo/pareja/grupo. `npm run test:e2e` → 3/3.

### P0-6 · Analítica — HECHO (sin proveedor)
- `src/services/analytics.js` (contrato cerrado, saneamiento, consentimiento, no-op sin endpoint) + `docs/ANALITICA.md`.
- `AnalyticsConsent` en el pie: aviso la primera vez y botón para cambiar de opinión (solo con endpoint).
- Eventos instrumentados: duo_started, preferences_completed, title_chosen, plan_created, invite_created,
  invite_accepted, rsvp_changed, official_booking_clicked.
- Evidencia en Chromium con endpoint de prueba: 0 eventos antes de aceptar; tras aceptar llega
  `{"event":"duo_started","props":{"group_size":2,"mode":"movie"},…}`; al retirar se borra el id local.
- Bug encontrado y corregido: si `sendBeacon` lanzaba, el `catch` se tragaba el evento sin intentar `fetch`.

### P1-1 · Salas de Duo desde cada teléfono — HECHO y verificado localmente (falta remoto)
- Migración `supabase/migrations/20261010120000_duo_rooms.sql`: `duo_rooms` (código de 6 caracteres sin 0/O/1/I,
  generado con bytes de `gen_random_uuid`), `room_members` (butaca 1–8 asignada con la sala bloqueada),
  `room_preferences` (solo las propias), `room_rounds` (baraja y participantes congelados), `round_votes` (solo los
  propios), `room_join_failures` (más de 10 códigos fallidos en 10 min → CN429).
- Fases: lobby → voting → revealed → chosen → closed (o caducada a las 24 h). Quien entra tarde vota en la siguiente
  ronda. Cierre canónico en servidor (`finish_room_round`): `match` solo si todas las participantes dijeron Sí;
  si no, `top` (Sí = 2, Quizá = 1, luego menos No, luego orden de la baraja) o `none`; nunca se inventa consenso.
  Cerrar dos veces devuelve el mismo resultado; el último voto cierra solo. Retirar/salir borra los votos de la
  ronda abierta y quita el acceso (RLS).
- El anfitrión recibe los gustos sin nombres ni ids y en orden aleatorio (`room_deck_preferences`) y calcula la
  baraja con el MISMO motor de Duo (`src/services/duoRoom.js` → `buildProfile`/`getDuoCandidates`/`rankTitles`).
  En salas de 2 se avisa de que se deduce el gusto de la otra persona.
- Realtime: solo `duo_rooms` y `room_rounds`; los cambios de miembros "tocan" la sala. **Corrección de P0:**
  `plan_members` sale de la publicación (los DELETE de Realtime no pasan por RLS y enviarían su clave a cualquier
  suscriptor); sus cambios "tocan" `plans`. El cliente relee el estado al recibir un aviso, al volver a la pestaña y
  al recuperar conexión (Realtime no es la fuente de verdad).
- Cliente: `src/services/roomRepository.js`, `src/pages/DuoRoomPage.jsx` (`/duo/sala`, `/duo/sala/:code`): abrir
  sala, entrar con código/enlace/QR (SVG propio con `qrcode-generator`, sin innerHTML), gustos privados, progreso
  (cuántos votó cada quien, nunca qué), votos, resultado con conteos, elegir título → planear en cine o en casa,
  retirar/salir/cerrar, «Pantalla grande» para TV o computador. Entrada desde la portada de Duo.
- Evidencia: 12 pruebas SQL (`supabase/tests/rooms.test.js`: extraño, enumeración, normalización de código,
  butacas, gustos validados y privados, cupo 8, baraja validada (sin `javascript:`), votos privados e idempotentes,
  retirada, cierre automático y doble, `top`/`none`, tardío, sala cerrada, publicación Realtime); 4 de lógica pura
  (`src/services/duoRoom.test.js`). E2E con navegadores separados contra la SQL real (`e2e/duo-room.spec.js`):
  Ana abre, Bea entra por el enlace con su cuenta, ambas marcan gustos, se arma la baraja, votan y aparece
  «¡Coincidencia!» en las dos; Ana elige y Bea ve el título. Capturas a 390/834/1440 px sin desbordamiento;
  corregidos tras verlas: código de sala pequeño (especificidad CSS), «Quizá» partido en 390 px, progreso
  desalineado en móvil y la tarjeta «¿Otra ronda?» antes del resultado.
- Límite honesto de la verificación: PGlite es una sola conexión, así que «última plaza simultánea» y «doble cierre»
  se prueban en serie (la exclusión la dan los `for update`); falta repetirlos con concurrencia real en Supabase.

### P1-2 · Invitados sin email — HECHO en cliente y SQL (Auth anónima por habilitar en remoto)
- `toAppUser` ya no rompe con email nulo y marca `guest`; `continueAsGuest(name)` usa `signInAnonymously` y, si el
  proveedor está deshabilitado, lo dice. Un invitado puede unirse y votar en salas y unirse/responder planes; no
  crea salas ni planes (comprobado en SQL con `is_anonymous` del JWT). Perfil y menú muestran «Cuenta de invitado».
- Riesgos documentados: la sesión de invitado vive en ese navegador (cerrar sesión o borrar datos = perder acceso);
  abuso: límite de fallos por código, cupo de 8 y de 5 salas abiertas por anfitrión; el trigger de perfiles solo
  copia el nombre visible (sin email). Conversión segura a cuenta permanente (`updateUser({ email })` + verificación):
  pendiente, no construida.
- E2E: un invitado entra con su nombre a una sala y no puede abrir una (`e2e/duo-room.spec.js`).

### P0-3 · Plan compartido entre dos cuentas — ahora verificado en navegador
- `e2e/shared-plan.spec.js` (contra la SQL real): Ana propone salida en Cine Colombia con hora propuesta, crea el
  plan y un enlace; Bea lo abre en otro navegador, inicia sesión, ve la vista previa, se une, confirma «Sí»; Ana
  recarga y ve a Bea confirmada. Bea no ve el panel de invitar.
- Banco E2E: `e2e/support/fake-supabase.mjs` sirve el build y traduce REST/RPC/Auth de Supabase a PGlite con TODAS
  las migraciones (sin Realtime: las pruebas disparan la relectura). No sustituye la verificación en Supabase real.

### P2 (parte 1) · Gustos por cuenta, CSV, calendario y veto — HECHO y verificado localmente
- **Gustos privados por cuenta** (`20261011120000_user_preferences.sql`, RLS solo propia; escribir/borrar por RPC
  validada; solo claves conocidas): panel «Mis gustos» en el perfil (región, plataformas, géneros, evitar, duración)
  con **descargar (.json)** y **borrar**. Al empezar Duo, la persona 1 parte de ellos (`withAccountTaste`); al entrar a
  una sala, sus gustos de sala también. La caché va en memoria con la clave del id de cuenta: otra cuenta en el mismo
  navegador no ve nada (E2E `e2e/account-preferences.spec.js`). 3 pruebas SQL + 1 de lógica.
- **Importar CSV de Letterboxd/IMDb** (`/importar`, `src/services/csvImport.js`): parser RFC 4180 (comillas, comillas
  dobles, saltos internos, CRLF, BOM), máx. 2 MB / 5000 filas, búsqueda por tandas de 300, emparejado por id de IMDb
  (`/find/tt…` añadido al proxy, solo `external_source=imdb_id`) o por título+año; dudosos los elige la persona
  («Ninguna» por defecto), no encontrados se listan. Pasa a «Ya vistas» de Duo; repetir no duplica ni borra. El
  archivo no se sube. **Bug encontrado por el E2E y corregido:** sin token TMDB en el servidor todo salía «no
  encontrado»; ahora cae al catálogo local como el resto de la app. 4 pruebas + E2E.
- **Calendario (.ics)** en el plan (`src/utils/calendar.js`): RFC 5545 con escapado y plegado por octetos, hora local
  → UTC con su zona IANA (probado con cambio de horario), duración real de la película + margen, sin asistentes.
  Copy: «CINET no envía recordatorios». 3 pruebas + E2E que descarga el archivo y comprueba `DTSTART`.
- **Veto en salas**: un 🚫 por persona y ronda (índice único parcial), privado; un vetado nunca gana ni puede elegirse
  a mano; si todo queda vetado → «sin coincidencia» + `all_vetoed` (no se rellena con vetados). 1 prueba SQL + E2E.

### P2 (parte 2) · Open Graph, familia, grupos y turnos — HECHO y verificado localmente
- **Open Graph en servidor** (`server/ogMeta.js`, `api/og.js`, reescrituras en `vercel.json` + `includeFiles`):
  `/movie/:id` con título, año, sinopsis y póster (catálogo local o TMDB vía el núcleo del proxy); `/plan`, `/invite`
  y `/duo/sala` siempre genéricos con `noindex` (ni nombres, ni fechas, ni tokens ni códigos); todo escapado; origen
  desde `APP_ORIGIN`/`VERCEL_PROJECT_PRODUCTION_URL`, nunca desde `Host`. Imagen por defecto `public/og-cinet.png`
  (1200×630). 3 pruebas + verificación contra el `dist/index.html` real. **Pendiente:** comprobar en Vercel
  (`includeFiles`, reescrituras) y con depuradores de redes.
- **Modo familia**: lista EXACTA de clasificaciones (`certification=G|PG`), porque comprobamos con TMDB real que
  `certification.lte` deja pasar títulos `NR` e incluso `R`. TMDB no tiene clasificación colombiana: México usa la
  suya; el resto, EE. UU., y la interfaz lo dice. Sin catálogo en vivo, con series o si TMDB falla: no se muestra nada
  (desconocida ≠ apta); en sagas no se añaden partes sin filtrar. 3 pruebas (una captura las URL enviadas) +
  verificación en vivo: los 8 primeros de «Niñas y niños» son PG.
- **Grupos guardados y repetir plan** (`20261012120000_groups.sql`, `/grupos`, `/grupos/:id`, `/grupos/unirse/:token`,
  `PlanGroupPanel`): grupos privados con enlace (hash, caducidad, revocación, cupo 30), retirar/salir/eliminar;
  «Sumar al plan» añade a quien está hoy en el grupo sin respuesta; entrar al grupo no abre planes anteriores;
  «Repetir con las mismas personas» crea otro plan en otra fecha sin copiar confirmaciones (idempotente).
  4 pruebas SQL + E2E con dos navegadores. Corregido de paso: `p_title` no guardaba `runtime` (el .ics de planes de
  cuenta usaba 120 min).
- **Turnos justos** (`src/services/fairness.js`): opt‑in, solo con lo que el grupo declara al final («¿alguien
  cedió?»), empujón acotado (máx. 9 puntos de ~100) solo a lo que le gusta a esa persona, decae a la mitad cada 30
  días, reinicio y sin saltar rechazos; la razón se explica («Turno de Bea: el grupo anotó que cedió»). 2 pruebas +
  E2E del interruptor.
- Estado: lint limpio; `npm test` 124/124; `npm run test:e2e` 10/10; build correcto.

### P2 (cierre) · Presupuesto, encuesta de horarios y resumen anual — HECHO y verificado localmente
- **Presupuesto aproximado por persona** (opcional al crear; local y de cuenta en `details.budget`): se muestra como
  «$45.000 por persona · estimado» y el formulario aclara que no es un precio verificado del cine. E2E (cuenta).
- **Encuesta acotada de horarios** (`20261013120000_plan_time_poll.sql`, `PlanTimePoll`): quien organiza propone de 2
  a 5 horarios futuros; cada cuenta marca los suyos (visible para el plan); solo quien organiza elige y eso pasa a
  ser la hora propuesta (versión +1) y cierra la encuesta. Realtime vía `touch_plan`. 3 pruebas SQL + E2E con dos
  navegadores.
- **Resumen del año** (`/resumen`, `src/services/recap.js`): cuenta planes con fecha (organizados o confirmados, no
  cancelados), cine/casa, mes más movido y género más planeado; «Ya vistas» como total (el historial no guarda
  fechas: no se inventa el año). Compartir es voluntario y solo lleva cifras propias. Sin rachas. 2 pruebas + E2E.
- Estado: lint limpio; `npm test` 129/129; E2E 10/10.

### P3 · Cines, aliados y descubrimiento — HECHO y verificado localmente (falta remoto)
- **Aliados** (`20261014120000_partners.sql`): organizaciones que se solicitan (pendientes) y verifica un operador
  (`profiles.role = 'admin'`) en `/admin`; sedes, funciones/eventos (`listings`) y ofertas con RLS **por
  organización**; auditoría automática (`org_audit`, quién/qué/cuándo); un trigger sella autor, fuente y hora (no se
  falsean desde el cliente); suspender oculta la cartelera. 6 pruebas SQL (aislamiento A/B, vencidas y canceladas
  ocultas, editor sin acceso a auditoría, ventas solo por servidor e idempotentes, suspensión).
- **Contrato de funciones** (`src/services/showtimeService.js`): título canónico, exhibidor y sede, hora con zona,
  formato, idioma, precio si existe, URL oficial, fuente, actualización, vigencia y estado. `/cine/:id` muestra
  «Funciones publicadas por cines aliados» con «Fuente: … (lo publica el aliado) · actualizado …»; sin datos no se
  muestra nada. Ofertas en bloque «Patrocinado», aparte y sin tocar el ranking. 2 pruebas del contrato.
- **Panel `/aliados`**: solicitar cuenta, sedes, publicar/cancelar funciones con buscador de títulos (TMDB o catálogo
  local), ofertas, equipo por correo y últimos cambios. Accesibilidad: los `<select>` anidados en `<label>` tomaban
  como nombre el texto de sus opciones; ahora tienen `aria-label`.
- **Ventas por webhook** (`server/partnerWebhook.js`, `api/partner-webhook.js`): HMAC‑SHA256 por aliado, ventana
  anti‑repetición de 5 min, idempotencia por `(org, id)`, reembolsos que anulan la comisión; un «clic» no es una
  venta. Secretos solo de servidor y añadidos al guardián del build. 3 pruebas. **Pendiente:** desplegar y probar con
  un aliado real.
- **Descubrimiento**: «Hecho en Colombia» en el inicio (TMDB `with_origin_country=CO`; verificado en vivo: María llena
  eres de gracia, Los niños perdidos, Medusa…; sin catálogo en vivo no se muestra) y ocasión «Plan en familia»
  (3 personas, modo familia «Niñas y niños»).
- **`docs/PILOTO-CINES.md`**: propuesta de valor, piloto de una sede, guía de entrevista, datos, reglas de medición,
  responsabilidades y borrador de acuerdo marcado como PREPARACIÓN para revisión humana. Sin contactos ni convenios.
- E2E con tres navegadores (`e2e/partners.spec.js`): solicitud → verificación → función pública con fuente →
  cancelación la oculta. Estado: lint limpio; `npm test` 141/141; `npm run test:e2e` 11/11; build correcto.

### P4 · Comodidad, sostenibilidad e ingresos — HECHO y verificado localmente (falta remoto)
- **Lenguaje natural en Duo** (`src/services/naturalQuery.js`): intérprete local y determinista, sin IA ni red.
  Entiende personas («somos 5», «en pareja», «con los niños»), formato, géneros que apetecen y «nada de/sin/ni»,
  duración («máximo 2 horas», «corta»), plataformas y modo familia; evita trampas («solo comedia» no es «una
  persona», «máximo» no es HBO Max, «para 2 horas» no son 2 personas; tope de 8). Muestra «Entendí: …» antes de
  empezar; si no entiende nada lo dice y no avanza. Lo escrito son los gustos de la persona 1; los «no» filtran para
  todo el grupo; nadie más recibe gustos. El texto no se envía a analítica. 3 pruebas + E2E.
- **PWA**: `manifest.webmanifest`, iconos 192/512 y maskable (generados del favicon), `public/sw.js` registrado
  solo en producción. Guarda solo archivos públicos del propio sitio (index.html, `/assets` con hash, `/images`,
  iconos); nunca `/api`, Supabase, TMDB ni otros dominios; las páginas van a la red primero y no se guardan (sus
  metadatos OG pueden nombrar un plan). Versión = hash de los nombres del build (plugin `swVersion`): cada despliegue
  borra las cachés viejas. Al cerrar sesión se borran las cachés `cinet-*`. Aviso de sin conexión existente.
  `vercel.json`: `sw.js` con `no-cache`. E2E: carga sin red, caché versionada y sin rutas privadas. Un bug
  encontrado por la prueba: el reemplazo de versión tocaba el comentario y no la constante (`replaceAll`).
- **Respaldo del catálogo** (`npm run catalog:snapshot`, `scripts/catalog-snapshot.mjs`): 4 colecciones × 20 de
  TMDB, en serie y con pausa, fechado y con atribución y aviso «no es cartelera, clasificación ni disponibilidad».
  Excluye estrenos y proveedores. Si TMDB falla, cancela (no guarda el catálogo local como si fuera TMDB). Salida en
  `snapshots/` (ignorada por git). Verificado en vivo: 80 títulos. **Agenda no activada**: se ejecuta a mano.
- **Rendimiento (medido con el mismo Vite 8.3.1)**: línea base `1dd4e6c` = un único JS de 562,17 kB (176,54 kB
  gzip) con aviso de chunk > 500 kB y CSS 35,50 kB gzip. Ahora: JS inicial repartido en 9 archivos = 200,9 kB gzip
  (+24 kB con planes compartidos, salas, grupos, aliados, Plus y PWA; el resto de páginas es diferido), sin aviso y
  sin subir el umbral; CSS 42,2 kB gzip. Arreglo medido: `titleMeta` vivía en `recommender.js` y arrastraba todo el
  motor de Duo al inicio; ahora está en `src/utils/titleMeta.js` (entrada 96,85 → 91,78 kB gzip y `data/duo.js` sale
  del inicio). Falso positivo descartado: React Router 7.18 publica el mismo código en `dist/development` y
  `dist/production`. **Supabase pesa ~57 kB gzip del inicio** (Auth lo necesita para restaurar la sesión);
  cargarlo diferido exige un límite asíncrono en `AuthContext` y `PlanContext` → backlog con esta medición. CSS en
  un solo archivo: consolidarlo por página exige capturas antes/después → backlog.
- **CINET Plus en sandbox** (`20261015120000_plus_sandbox.sql`): `billing_config.sandbox` (apagado por defecto; lo
  enciende un operador por SQL), `entitlements` (cada quien lee lo suyo; nadie lo escribe desde el cliente),
  `has_plus()` en el servidor, prueba de 30 días sin pasarela ni cobro (no para invitados anónimos), cancelar
  conserva el acceso hasta el fin del periodo. Primera función Plus: **noche fija** (`set_plan_repeat`,
  `schedule_next_plan`: siguiente fecha futura a la misma hora local, mismas personas, idempotente). Lo gratuito no
  cambia. **Webhook de cobros** (`server/billingWebhook.js`, `api/billing-webhook.js`): contrato normalizado de
  CINET, firma y ventana compartidas con aliados (`checkSignature`), `apply_billing_event` solo para service role,
  idempotente y ordenado (un evento viejo no reactiva), `expired` corta el periodo; 503 sin variables. **No hay
  pasarela conectada.** `/plus`: matriz gratis/Plus (con «EN DISEÑO» donde no existe), estado de la cuenta y
  prueba de precio (COP 9.900 como hipótesis, `plus_price_answer` con consentimiento). 6 pruebas SQL + 3 del webhook
  + E2E (sin Plus el servidor niega; con la prueba programa la siguiente; cancelar conserva el periodo).
- **`docs/COSTOS-Y-MERCADO.md`**: lo que se usa hoy, licencia TMDB y pasarela por cotizar, modelo de ingresos como
  hipótesis, costos a estimar sin cifras inventadas, obligaciones por revisar (Ley 1581, consumo, publicidad) y
  salida al mercado por pilotos.
- Estado: lint limpio; `npm test` 153/153; `npm run test:e2e` 14/14; build correcto sin aviso de tamaño.

### Siguiente tarea exacta
Todo lo local de P0–P4 está hecho. Lo siguiente requiere autorización expresa de la persona responsable:
1. `npx supabase db push` (7 migraciones de 20261009 a 20261015, juntas: el cliente ya lee sus columnas).
2. Habilitar Auth anónima en Supabase; probar Realtime y concurrencia con dos teléfonos reales.
3. Vercel: `TMDB_READ_TOKEN` (rotado; quitar `VITE_TMDB_READ_TOKEN`), `APP_ORIGIN`, `SUPABASE_SERVICE_ROLE_KEY` y,
   cuando existan, `PARTNER_WEBHOOK_SECRETS` y `BILLING_WEBHOOK_SECRET`; desplegar y comprobar `/api/og` y los webhooks.
4. Decisiones de negocio de `docs/COSTOS-Y-MERCADO.md` (catálogo de pago, pasarela, términos) antes de cobrar.

### Duo avanzado (2026-10-10) · seis escenas, límites v2, calibración, finalistas, ronda reanudable — HECHO y verificado localmente
Detalle, storyboard, contratos y evidencia: [`DUO-DISENO-AVANZADO.md`](DUO-DISENO-AVANZADO.md). Móvil: [`APP-MOVIL-ANDROID.md`](APP-MOVIL-ANDROID.md).
- **Interfaz:** seis escenas (preparar · gustos · coincidencias · finalistas · decidir · organizar) con cabecera compacta, entrada de sesión con butacas, abanico de pósteres por ocasión, calibración por pósteres, mapa de coincidencias con límites aparte, finalistas protagonistas con papeles y diferencias, revelación omitible, plan con hora estimada y recuerdo revisable; resumen lateral/desplegable; «Menos movimiento» en toda la app.
- **Motor:** contrato de límites v2 (imprescindibles todos, duración/plataforma/temporadas/estado duros, desconocido ≠ cumplido, ampliación solo explícita con excedente exacto); señales personales (calibración y votos por persona); `pickFinalists` con papeles; búsqueda con presupuesto, exclusiones antes del detalle, cancelación y medición.
- **Decidir y repetir:** ronda persistida y reanudable (`session.round`); feedback «¿La vieron? ¿Les gustó?» después de la fecha (`PlanAfterglow`); `?time=` de Duo a `/functions`; botón de instalación de la PWA como opción.
- Estado: lint limpio; `npm test` 161/161; `npx playwright test` 19 pasan + 3 capturas bajo demanda; build sin aviso de tamaño. Evaluación `node scripts/duo-eval.mjs`: 58 → 0 títulos que violan un límite duro y 9 → 0 «comprobados» sin dato.
- Siguiente tarea exacta: línea base de «Cómo buscamos» con TMDB en vivo; finalistas y calibración en la sala; piloto consentido (ver §8 de `DUO-DISENO-AVANZADO.md`).
