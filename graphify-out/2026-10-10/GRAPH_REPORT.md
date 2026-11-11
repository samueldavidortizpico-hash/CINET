# Graph Report - CINET  (2026-10-10)

## Corpus Check
- 243 files · ~220,085 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1535 nodes · 4222 edges · 81 communities (72 shown, 5 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 48 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `5c102f83`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- 20261010120000_duo_rooms.sql
- recommender.js
- DuoSeenStep.jsx
- movieService.js
- HeroCarousel.jsx
- package.json
- duoService.js
- Avatares de CINET
- tmdbClient.js
- Milestone 2 — React Frontend
- MoviesPage.jsx
- authService.js
- recommender.test.js
- vercel.json
- DuoRoomPage.jsx
- historyService.js
- check-avatar-policies.mjs
- Intervención 2026-10-09 — Claude Code (Claude Opus 5.5) · Fase P0 de `docs/PROMPT-CODEX-CINET.md`
- planRepository.js
- FunctionsPage.jsx
- public/images/SOURCES.md
- 20261009120000_shared_plans.sql
- CINET: prompt para Claude — continuación, experiencia y crecimiento
- isTmdbEnabled
- tmdbProxy.js
- Prompt de ejecución para Codex: CINET
- analytics.js
- fake-supabase.mjs
- CINET: de elegir una película a hacer un plan
- Progreso
- devDependencies
- 20260929024739_create_profiles.sql
- scripts
- router.jsx
- dependencies
- react-router-dom
- react
- DuoPage.jsx
- WatchModal.jsx
- partnerRepository.js
- plus.test.js
- DuoResults.jsx
- partnerWebhook.js
- useToast
- duo.js
- naturalQuery.js
- Copia desde aquí para ejecutar
- usePlans
- 20261012120000_groups.sql
- CineHub (marca visible: CINET)
- Analítica de producto de CINET
- 20261014120000_partners.sql
- Prompt para Claude: Duo visual, divertido y con mejores recomendaciones
- Duo: ocasiones, decisión breve y siguiente plan
- Funcionalidades principales
- DuoMarathon.jsx
- @playwright/test
- useAsync
- groupRepository.js
- planService.js
- supabaseClient.js
- ogMeta.js
- PartnerListings.jsx
- 20261013120000_plan_time_poll.sql
- PreferencesPanel.jsx
- rooms.test.js
- 20261015120000_plus_sandbox.sql
- Costos y salida al mercado — documento de preparación
- Piloto con cines — documento de preparación
- partners.test.js
- groups.test.js
- toPlanError
- vite.config.js
- 20261011120000_user_preferences.sql
- ShowtimeOptions.jsx
- MovieBackdrop.jsx
- public.plans

## God Nodes (most connected - your core abstractions)
1. `react` - 79 edges
2. `useAsync()` - 45 edges
3. `useDocumentTitle()` - 45 edges
4. `useToast()` - 44 edges
5. `Button()` - 41 edges
6. `useAuth()` - 41 edges
7. `react-router-dom` - 38 edges
8. `isTmdbEnabled()` - 38 edges
9. `DuoPage()` - 30 edges
10. `usePlans()` - 25 edges

## Surprising Connections (you probably didn't know these)
- `restWrite()` --calls--> `as()`  [EXTRACTED]
  e2e/support/fake-supabase.mjs → supabase/tests/db.js
- `restGet()` --calls--> `as()`  [EXTRACTED]
  e2e/support/fake-supabase.mjs → supabase/tests/db.js
- `rpc()` --calls--> `as()`  [EXTRACTED]
  e2e/support/fake-supabase.mjs → supabase/tests/db.js
- `public.plan_members` --references--> `auth()`  [EXTRACTED]
  supabase/migrations/20261009120000_shared_plans.sql → e2e/support/fake-supabase.mjs
- `public.plans` --references--> `auth()`  [EXTRACTED]
  supabase/migrations/20261009120000_shared_plans.sql → e2e/support/fake-supabase.mjs

## Import Cycles
- None detected.

## Communities (81 total, 5 thin omitted)

### Community 0 - "20261010120000_duo_rooms.sql"
Cohesion: 0.10
Nodes (24): pg_publication_tables, public.touch_room, plan_members_touch, public.choose_room_title(), public.close_room_round(), public.create_duo_room(), public.drop_room_member(), public.duo_rooms (+16 more)

### Community 1 - "recommender.js"
Cohesion: 0.13
Nodes (29): item(), profile, familyFilter(), buildProfile(), byRank(), checkTitle(), clamp01(), closest() (+21 more)

### Community 2 - "DuoSeenStep.jsx"
Cohesion: 0.15
Nodes (19): search(), DuoSeenStep(), findTitles(), popularTitles(), INITIAL_FILTERS, MovieContext, MovieProvider(), EMPTY (+11 more)

### Community 3 - "movieService.js"
Cohesion: 0.09
Nodes (33): ALIASES, BY_TMDB_ID, capitalize(), COLLECTIONS, countryName(), favoriteGenres(), favoriteSeeds(), findMovie() (+25 more)

### Community 4 - "HeroCarousel.jsx"
Cohesion: 0.06
Nodes (51): DiceButton(), PosterImage(), CRITERIA, DuoRecommendationCard(), fitState(), hitText(), ORDER, SeatFit() (+43 more)

### Community 5 - "package.json"
Cohesion: 0.15
Nodes (14): description, name, private, type, version, @electric-sql/pglite, eslint, @eslint/js (+6 more)

### Community 6 - "duoService.js"
Cohesion: 0.18
Nodes (21): genreKeysFor(), genreLabel(), GENRES, LANGUAGES, TV_LABELS, discoverForDuo(), discoverParams(), enrich() (+13 more)

### Community 7 - "Avatares de CINET"
Cohesion: 0.22
Nodes (8): Archivos de la implementación, Avatares de CINET, Cómo funciona, Estado y alcance, Probar en localhost, Pruebas locales reproducibles, Seguridad, SQL manual en Supabase

### Community 8 - "tmdbClient.js"
Cohesion: 0.12
Nodes (28): DuoModeStep(), ActorPicker(), listOf(), cache, config, CONNECTION_ERRORS, discoverMovies(), discoverTv() (+20 more)

### Community 9 - "Milestone 2 — React Frontend"
Cohesion: 0.20
Nodes (10): Arquitectura, Capa offline (HW07), Cartelera y cadenas de cine, CineHub Duo, Cómo ejecutarlo, Decisiones clave (para la defensa), Milestone 2 — React Frontend, Prototipo anterior (+2 more)

### Community 10 - "MoviesPage.jsx"
Cohesion: 0.16
Nodes (17): AdvancedFilters(), RATINGS, RUNTIMES, MovieFilters(), DEPARTMENTS, MovieSearch(), thumb(), REGIONS (+9 more)

### Community 11 - "authService.js"
Cohesion: 0.10
Nodes (26): App(), router, AuthContext, AuthProvider(), ToastContext, ToastProvider(), client(), continueAsGuest() (+18 more)

### Community 12 - "recommender.test.js"
Cohesion: 0.15
Nodes (16): DEFAULT_MARATHON, DUO_SESSION_KEY, stepsFor(), asList(), asNumber(), asPerson(), asSession(), isObject() (+8 more)

### Community 13 - "vercel.json"
Cohesion: 0.29
Nodes (6): includeFiles, functions, api/og.js, headers, rewrites, $schema

### Community 14 - "DuoRoomPage.jsx"
Cohesion: 0.09
Nodes (28): Room(), RoomGate(), STATUS_TEXT, useRoomState(), DECK_SIZE, describeResult(), ROOM_VOTES, roomSession() (+20 more)

### Community 15 - "historyService.js"
Cohesion: 0.14
Nodes (27): RFC-4180, DuoHistoryDialog(), FORMAT_NAMES, ImportPage(), label(), applyImport(), catalogMatchers(), CSV_LIMITS (+19 more)

### Community 17 - "Intervención 2026-10-09 — Claude Code (Claude Opus 5.5) · Fase P0 de `docs/PROMPT-CODEX-CINET.md`"
Cohesion: 0.10
Nodes (20): AI-LOG — CINET (antes CineHub), Cambios realizados, Cambios realizados, Cambios realizados, Continuación 2026-10-09/10 · Fase P1 (salas de Duo e invitados), Continuación 2026-10-10 · Fases P2–P4 (detalle en `docs/IMPLEMENTACION-CINET.md`), Intervención 2026-09-27 — Claude Code (Claude Opus 5.5), Intervención 2026-10-09 — Claude Code (Claude Opus 5.5) (+12 more)

### Community 18 - "planRepository.js"
Cohesion: 0.17
Nodes (25): PlanGroupPanel(), PlanTimePoll(), pad(), toISODate(), acceptInvite(), call(), cancelPlan(), chooseTime() (+17 more)

### Community 19 - "FunctionsPage.jsx"
Cohesion: 0.12
Nodes (19): FunctionsPage, RecapPage, Button(), BookingSummary(), ShowtimeStep(), EMPTY, PlanForm(), CINEMA_CHAINS (+11 more)

### Community 21 - "20261009120000_shared_plans.sql"
Cohesion: 0.16
Nodes (19): pg_catalog.pg_timezone_names, public.accept_plan_invite(), public.cancel_plan(), public.cinet_fail(), public.create_plan(), public.create_plan_invite(), public.delete_plan(), public.is_plan_member() (+11 more)

### Community 22 - "CINET: prompt para Claude — continuación, experiencia y crecimiento"
Cohesion: 0.10
Nodes (19): A1. Corrige los fallos detectados, A2. Completa el recorrido de plan e invitación, A3. Horarios, copy, CI y medición, A. Cierra primero P0: planes reales y confianza, B. Haz social Duo: cada persona desde su celular, C. Personalización y descubrimiento que ahorran tiempo, CINET: prompt para Claude — continuación, experiencia y crecimiento, D. Grupos, familias y planes completos (+11 more)

### Community 23 - "isTmdbEnabled"
Cohesion: 0.16
Nodes (14): COLLECTIONS, generatedAt, snapshot, CinemaPage(), getDuoCandidates(), getCollection(), toDiscoverParams(), checkTmdbConnection() (+6 more)

### Community 24 - "tmdbProxy.js"
Cohesion: 0.16
Nodes (10): APPEND, createTmdbProxy(), fail(), json(), nodeHandler(), PARAMS, ROUTES, calls (+2 more)

### Community 25 - "Prompt de ejecución para Codex: CINET"
Cohesion: 0.12
Nodes (16): 1A. TMDB en servidor, 1B. Persistencia compartida y permisos, 1C. Honestidad y entrega continua, Entregables y condición de cierre, Estado de partida que debes revalidar, Fase 0. Auditoría y contratos, Fase 1. Base segura y un plan realmente compartido, Fase 2. Duo desde cada celular (+8 more)

### Community 26 - "analytics.js"
Cohesion: 0.08
Nodes (27): AnalyticsConsent(), BrandLogo(), LABELS, TmdbStatus(), Toast(), Footer(), Header(), Layout() (+19 more)

### Community 27 - "fake-supabase.mjs"
Cohesion: 0.17
Nodes (21): addUser(), asValue(), auth(), authUser(), b64(), exclusive(), filters(), ident() (+13 more)

### Community 28 - "CINET: de elegir una película a hacer un plan"
Cohesion: 0.18
Nodes (10): 1. La apuesta, 2. Lo que el código ya ofrece, 3. Las ideas prioritarias, 4. Cómo puede crecer, 5. La oferta para los cines, 6. Ingresos, en orden de validación, 7. Qué medir y qué significa, 8. Orden de ejecución (+2 more)

### Community 29 - "Progreso"
Cohesion: 0.09
Nodes (21): Backlog ejecutable, CINET — registro de implementación, Contratos decididos, Fase 0 · Auditoría (2026-10-09), Hallazgos verificados en el código, P0-1 · Proxy de TMDB — HECHO y verificado localmente, P0-2 · Planes compartidos (servidor) — HECHO y verificado localmente, P0-3 · Plan compartido entre dos cuentas — ahora verificado en navegador (+13 more)

### Community 30 - "devDependencies"
Cohesion: 0.18
Nodes (11): devDependencies, @electric-sql/pglite, eslint, @eslint/js, eslint-plugin-react-hooks, eslint-plugin-react-refresh, globals, @playwright/test (+3 more)

### Community 31 - "20260929024739_create_profiles.sql"
Cohesion: 0.22
Nodes (6): public.handle_new_user, public.profiles_before_update, on_auth_user_created, profiles_before_update, public.profiles, auth.users

### Community 32 - "scripts"
Cohesion: 0.22
Nodes (9): scripts, build, catalog:snapshot, dev, lint, preview, test, test:e2e (+1 more)

### Community 33 - "router.jsx"
Cohesion: 0.08
Nodes (30): AboutPage, AdminPage, CinemaPage, CinemaTicketsPage, CreatePlanPage, DashboardPage, DuoPage, DuoRoomPage (+22 more)

### Community 34 - "dependencies"
Cohesion: 0.33
Nodes (6): dependencies, qrcode-generator, react, react-dom, react-router-dom, @supabase/supabase-js

### Community 35 - "react-router-dom"
Cohesion: 0.15
Nodes (13): react-router-dom, MovieDetailPage, PlusPage, Loading(), MovieActions(), MovieInfo(), ProtectedRoute(), useMovie() (+5 more)

### Community 39 - "react"
Cohesion: 0.12
Nodes (28): react, ProfilePage, AuthForm(), FIELDS, AvatarUpload(), ProfileCard(), ROLE_LABELS, FIELDS (+20 more)

### Community 40 - "DuoPage.jsx"
Cohesion: 0.13
Nodes (25): DuoProgress(), SeatAvatar(), DuoSummary(), DEFAULT_PERSON, personName(), candidatesKey(), DuoPage(), FRESH_RESULTS (+17 more)

### Community 41 - "WatchModal.jsx"
Cohesion: 0.13
Nodes (12): Modal(), trapFocus(), formatDate(), MovieExtras(), LOGOS, PlatformLogo(), TrailerModal(), WatchModal() (+4 more)

### Community 42 - "partnerRepository.js"
Cohesion: 0.13
Nodes (33): RFC-5545, PendingPartners(), addListing(), addMember(), addOffer(), addVenue(), audit(), db() (+25 more)

### Community 43 - "plus.test.js"
Cohesion: 0.11
Nodes (23): as(), asAdmin(), createDb(), createUsers(), errorCode(), MIGRATIONS, rpc(), createPlan() (+15 more)

### Community 44 - "DuoResults.jsx"
Cohesion: 0.16
Nodes (23): DuoCommonStep(), names(), toneNames(), valueLabel(), DuoEmptyState(), REASONS, Availability(), DuoResults() (+15 more)

### Community 45 - "partnerWebhook.js"
Cohesion: 0.13
Nodes (25): handle, handler(), store, handle, handler(), secrets(), store, createBillingWebhook() (+17 more)

### Community 46 - "useToast"
Cohesion: 0.20
Nodes (18): GroupsPage, DuoFinal(), voteOf(), RsvpPanel(), useShare(), useToast(), CinemaTicketsPage(), GroupDetail() (+10 more)

### Community 47 - "duo.js"
Cohesion: 0.07
Nodes (44): Icon(), Chip(), ChoiceChips(), Question(), COUNTS, GroupPicker(), MARATHON_TYPES, DuoPersonStep() (+36 more)

### Community 48 - "naturalQuery.js"
Cohesion: 0.13
Nodes (18): CHAPTERS, DuoIntro(), POSTERS, DEFAULT_DUO_SESSION, MAX_PEOPLE, DUO_OCCASIONS, moodLabel(), describeQuery() (+10 more)

### Community 49 - "Copia desde aquí para ejecutar"
Cohesion: 0.15
Nodes (13): 10. Orden de entregas y aceptación, 11. Evaluación de recomendación y UX, 12. Pruebas y condición de cierre, 1. La experiencia que vamos a construir, 2. Dirección visual: transformar el recorrido, 3. Movimiento y diversión con propósito, 4. Aprender gustos con películas, sin convertirlo en examen, 5. Mejorar el motor: corrección, señales y tres propuestas como conjunto (+5 more)

### Community 50 - "usePlans"
Cohesion: 0.20
Nodes (14): FaqItem(), FaqSection(), HomeExperiences(), PlansPreview(), PlanCard(), PlanStats(), FAQ, usePlans() (+6 more)

### Community 51 - "20261012120000_groups.sql"
Cohesion: 0.14
Nodes (15): public.plan_members, public.accept_group_invite(), public.create_group(), public.create_group_invite(), public.group_invites, public.group_members, public.group_owned(), public.groups (+7 more)

### Community 52 - "CineHub (marca visible: CINET)"
Cohesion: 0.20
Nodes (10): CineHub (marca visible: CINET), Figma, Invitado, Justificación de la aplicación web, Organizador del plan, Problema, Restricciones del proyecto (verificadas), Roles de usuario (+2 more)

### Community 53 - "Analítica de producto de CINET"
Cohesion: 0.25
Nodes (7): Analítica de producto de CINET, Envío, Estado, Eventos, Métricas que permite, Principios, Retención y borrado (política propuesta, la confirma quien opere el servicio)

### Community 54 - "20261014120000_partners.sql"
Cohesion: 0.17
Nodes (14): public.profiles, public.attribution_events, public.can_publish(), public.is_platform_admin(), public.listings, public.offers, public.org_audit, public.org_is_verified() (+6 more)

### Community 55 - "Prompt para Claude: Duo visual, divertido y con mejores recomendaciones"
Cohesion: 0.33
Nodes (3): Diagnóstico previo: qué necesita cambiar, Fuentes y alcance de las propuestas, Prompt para Claude: Duo visual, divertido y con mejores recomendaciones

### Community 56 - "Duo: ocasiones, decisión breve y siguiente plan"
Cohesion: 0.33
Nodes (6): Archivos principales, Cómo revisar, Duo: ocasiones, decisión breve y siguiente plan, Evidencia local, Ideas siguientes, ordenadas por valor, Problema y resultado

### Community 57 - "Funcionalidades principales"
Cohesion: 0.33
Nodes (6): 1. Buscar y explorar películas, 2. Consultar una película y sus funciones, 3. Crear un plan, 4. Consultar un plan, 5. Responder a un plan, Funcionalidades principales

### Community 58 - "DuoMarathon.jsx"
Cohesion: 0.21
Nodes (19): clock(), DuoMarathon(), getShowtimes(), recommendedStart(), toPlanMovie(), buildMarathon(), byRelease(), chooseNext() (+11 more)

### Community 59 - "@playwright/test"
Cohesion: 0.11
Nodes (4): openRoom(), signIn(), NO_SECRETS, @playwright/test

### Community 60 - "useAsync"
Cohesion: 0.27
Nodes (10): SkeletonRow(), CollectionSection(), MovieGrid(), CinephileProfile(), useAsync(), useDuoHistory(), useFavorites(), DashboardPage() (+2 more)

### Community 61 - "groupRepository.js"
Cohesion: 0.24
Nodes (16): acceptInvite(), call(), client(), createGroup(), createInvite(), deleteGroup(), getGroup(), groupPlans() (+8 more)

### Community 62 - "planService.js"
Cohesion: 0.25
Nodes (14): asList(), asMap(), PlanContext, PlanProvider(), createPlan(), buildPlan(), canManagePlan(), getRsvpStatus() (+6 more)

### Community 63 - "supabaseClient.js"
Cohesion: 0.20
Nodes (11): @supabase/supabase-js, day(), Status(), call(), cancelPlusSandbox(), getPlusStatus(), PLUS_PRICE_COP, rows() (+3 more)

### Community 64 - "ogMeta.js"
Cohesion: 0.25
Nodes (9): clip(), createOgHandler(), DEFAULT, escapeHtml(), injectMeta(), ogFor(), PRIVATE, publicTitle() (+1 more)

### Community 65 - "PartnerListings.jsx"
Cohesion: 0.29
Nodes (11): PartnerListings(), updated(), capitalize(), describeStart(), formatBudget(), getListingsForTitle(), getOffersForTitle(), isCurrent() (+3 more)

### Community 66 - "20261013120000_plan_time_poll.sql"
Cohesion: 0.24
Nodes (10): plan_time_options_touch, plan_time_votes_touch, public.choose_plan_time(), public.owned_active_plan(), public.plan_time_options, public.plan_time_votes, public.propose_plan_times(), auth.users (+2 more)

### Community 67 - "PreferencesPanel.jsx"
Cohesion: 0.36
Nodes (9): EMPTY, PreferencesForm(), PreferencesPanel(), useAccountPreferences(), accountPreferencesAvailable(), deleteMyPreferences(), exportPreferences(), getMyPreferences() (+1 more)

### Community 68 - "rooms.test.js"
Cohesion: 0.17
Nodes (8): A, B, C, D, deck, FILL, G, L

### Community 69 - "20261015120000_plus_sandbox.sql"
Cohesion: 0.25
Nodes (6): public.activate_plus_sandbox(), public.billing_config, public.billing_events, public.entitlements, public.has_plus(), auth.users

### Community 70 - "Costos y salida al mercado — documento de preparación"
Cohesion: 0.20
Nodes (9): 1. Qué usa CINET hoy (verificado en el código), 2. Modelo de ingresos (hipótesis a validar), 3. Costos operativos a estimar (sin cifras inventadas), 4. Obligaciones antes de abrir al público (por revisar con asesoría legal), 5. Salida al mercado (borrador), 6. Decisiones pendientes (de negocio), Costos y salida al mercado — documento de preparación, Pasarela de pagos (antes de cobrar Plus) (+1 more)

### Community 71 - "Piloto con cines — documento de preparación"
Cohesion: 0.20
Nodes (9): 1. Propuesta de valor para el cine, 2. Alcance del piloto (propuesto), 3. Lo que ya está construido (verificado localmente, no desplegado), 4. Reglas de medición (propuestas), 5. Guía de entrevista (30 min, antes de proponer nada), 6. Responsabilidades (borrador), 7. Borrador de acuerdo — SOLO PARA REVISIÓN HUMANA, 8. Clubes y eventos (+1 more)

### Community 72 - "partners.test.js"
Cohesion: 0.22
Nodes (7): A, A2, B, C, json(), listing(), OP

### Community 73 - "groups.test.js"
Cohesion: 0.22
Nodes (5): A, B, C, D, G

### Community 74 - "toPlanError"
Cohesion: 0.36
Nodes (8): client(), getPlan(), isRemoteId(), listInvites(), listPlans(), subscribePlan(), toPlanError(), toUiPlan()

### Community 77 - "ShowtimeOptions.jsx"
Cohesion: 0.70
Nodes (4): CinemaOptions(), DateOptions(), optionClass(), TimeOptions()

### Community 78 - "MovieBackdrop.jsx"
Cohesion: 1.00
Nodes (3): createParticles(), MovieBackdrop(), prefersReducedMotion()

## Knowledge Gaps
- **310 isolated node(s):** `store`, `store`, `PORT`, `ROOT`, `TYPES` (+305 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 468 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **5 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `react` to `recommender.js`, `DuoSeenStep.jsx`, `HeroCarousel.jsx`, `package.json`, `MoviesPage.jsx`, `authService.js`, `recommender.test.js`, `DuoRoomPage.jsx`, `historyService.js`, `planRepository.js`, `FunctionsPage.jsx`, `analytics.js`, `router.jsx`, `react-router-dom`, `DuoPage.jsx`, `WatchModal.jsx`, `DuoResults.jsx`, `useToast`, `duo.js`, `naturalQuery.js`, `usePlans`, `DuoMarathon.jsx`, `useAsync`, `planService.js`, `PreferencesPanel.jsx`, `MovieBackdrop.jsx`?**
  _High betweenness centrality (0.219) - this node is a cross-community bridge._
- **Why does `@electric-sql/pglite` connect `package.json` to `plus.test.js`?**
  _High betweenness centrality (0.169) - this node is a cross-community bridge._
- **Why does `auth()` connect `fake-supabase.mjs` to `20261010120000_duo_rooms.sql`, `20261015120000_plus_sandbox.sql`, `20261012120000_groups.sql`, `20261009120000_shared_plans.sql`, `20261014120000_partners.sql`?**
  _High betweenness centrality (0.093) - this node is a cross-community bridge._
- **What connects `store`, `store`, `PORT` to the rest of the system?**
  _310 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `20261010120000_duo_rooms.sql` be split into smaller, more focused modules?**
  _Cohesion score 0.10338680926916222 - nodes in this community are weakly interconnected._
- **Should `recommender.js` be split into smaller, more focused modules?**
  _Cohesion score 0.1319073083778966 - nodes in this community are weakly interconnected._
- **Should `movieService.js` be split into smaller, more focused modules?**
  _Cohesion score 0.09365079365079365 - nodes in this community are weakly interconnected._