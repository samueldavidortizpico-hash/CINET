# Graph Report - CINET  (2026-10-09)

## Corpus Check
- 178 files · ~160,637 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1006 nodes · 2908 edges · 60 communities (52 shown, 5 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 37 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `5c102f83`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- router.jsx
- recommender.js
- isTmdbEnabled
- movieService.js
- HeroCarousel.jsx
- package.json
- duoService.js
- Avatares de CINET
- tmdbClient.js
- Milestone 2 — React Frontend
- react
- App.jsx
- DuoPage.jsx
- vercel.json
- duo.js
- historyService.js
- check-avatar-policies.mjs
- Intervención 2026-09-27 — Claude Code (Claude Opus 5.5)
- planRepository.js
- FunctionsPage.jsx
- public/images/SOURCES.md
- 20261009120000_shared_plans.sql
- CINET: prompt para Claude — continuación, experiencia y crecimiento
- tmdbClient.test.js
- tmdbProxy.js
- Prompt de ejecución para Codex: CINET
- analytics.js
- plans.test.js
- CINET: de elegir una película a hacer un plan
- Fase 0 · Auditoría (2026-10-09)
- devDependencies
- 20260929024739_create_profiles.sql
- scripts
- tmdbProxy.test.js
- dependencies
- MovieDetailPage.jsx
- useAuth
- DuoResults.jsx
- regionName
- Button.jsx
- PlanPage.jsx
- listEs
- palette.js
- recommender.test.js
- DuoPersonStep.jsx
- DuoMarathon
- Copia desde aquí para ejecutar
- DuoSeats.jsx
- AdvancedFilters.jsx
- CineHub (marca visible: CINET)
- Analítica de producto de CINET
- DuoModeStep.jsx
- Prompt para Claude: Duo visual, divertido y con mejores recomendaciones
- Duo: ocasiones, decisión breve y siguiente plan
- Funcionalidades principales
- marathonTitles
- @playwright/test

## God Nodes (most connected - your core abstractions)
1. `react` - 66 edges
2. `isTmdbEnabled()` - 35 edges
3. `useDocumentTitle()` - 33 edges
4. `Button()` - 32 edges
5. `useToast()` - 32 edges
6. `react-router-dom` - 31 edges
7. `useAuth()` - 29 edges
8. `useAsync()` - 25 edges
9. `useLocalStorage()` - 24 edges
10. `DuoPage()` - 24 edges

## Surprising Connections (you probably didn't know these)
- `search()` --calls--> `searchCatalog()`  [EXTRACTED]
  scripts/tmdb-live.mjs → src/services/movieService.js
- `tmdbDevProxy()` --calls--> `createTmdbProxy()`  [EXTRACTED]
  vite.config.js → server/tmdbProxy.js
- `tmdbDevProxy()` --calls--> `nodeHandler()`  [EXTRACTED]
  vite.config.js → server/tmdbProxy.js
- `DuoResults()` --indirect_call--> `genreName()`  [INFERRED]
  src/components/duo/DuoResults.jsx → src/services/recommender.js
- `hitText()` --indirect_call--> `genreName()`  [INFERRED]
  src/components/duo/DuoSeats.jsx → src/services/recommender.js

## Import Cycles
- None detected.

## Communities (60 total, 5 thin omitted)

### Community 0 - "router.jsx"
Cohesion: 0.10
Nodes (29): react-router-dom, AboutPage, AdminPage, CinemaPage, CinemaTicketsPage, CreatePlanPage, DashboardPage, DuoPage (+21 more)

### Community 1 - "recommender.js"
Cohesion: 0.14
Nodes (27): item(), profile, buildProfile(), byRank(), checkTitle(), clamp01(), closest(), diversify() (+19 more)

### Community 2 - "isTmdbEnabled"
Cohesion: 0.31
Nodes (11): ActorPicker(), DuoSeenStep(), findTitles(), popularTitles(), CollectionSection(), useAsync(), CinemaPage(), getCollection() (+3 more)

### Community 3 - "movieService.js"
Cohesion: 0.07
Nodes (45): movies, CINEMA_CHAINS, MONTHS, WEEKDAYS, ALIASES, BY_TMDB_ID, capitalize(), COLLECTIONS (+37 more)

### Community 4 - "HeroCarousel.jsx"
Cohesion: 0.07
Nodes (41): Icon(), Modal(), trapFocus(), CHAPTERS, DuoIntro(), POSTERS, FaqItem(), FaqSection() (+33 more)

### Community 5 - "package.json"
Cohesion: 0.18
Nodes (12): description, name, private, type, version, eslint, @eslint/js, eslint-plugin-react-hooks (+4 more)

### Community 6 - "duoService.js"
Cohesion: 0.22
Nodes (18): FORMAT_GENRES, SERIES_STATUS, VOTE_POINTS, discoverForDuo(), discoverParams(), enrich(), fetchSources(), genreIds() (+10 more)

### Community 7 - "Avatares de CINET"
Cohesion: 0.22
Nodes (8): Archivos de la implementación, Avatares de CINET, Cómo funciona, Estado y alcance, Probar en localhost, Pruebas locales reproducibles, Seguridad, SQL manual en Supabase

### Community 8 - "tmdbClient.js"
Cohesion: 0.13
Nodes (27): matchesTitleDetails(), cache, config, CONNECTION_ERRORS, discoverMovies(), discoverTv(), getTitleDetails(), getTitleList() (+19 more)

### Community 9 - "Milestone 2 — React Frontend"
Cohesion: 0.20
Nodes (10): Arquitectura, Capa offline (HW07), Cartelera y cadenas de cine, CineHub Duo, Cómo ejecutarlo, Decisiones clave (para la defensa), Milestone 2 — React Frontend, Prototipo anterior (+2 more)

### Community 10 - "react"
Cohesion: 0.18
Nodes (18): react, AdvancedFilters(), MovieFilters(), DEPARTMENTS, MovieSearch(), thumb(), INITIAL_FILTERS, MovieContext (+10 more)

### Community 11 - "App.jsx"
Cohesion: 0.14
Nodes (18): @supabase/supabase-js, App(), router, AuthContext, AuthProvider(), ToastContext, ToastProvider(), client() (+10 more)

### Community 12 - "DuoPage.jsx"
Cohesion: 0.16
Nodes (22): DEFAULT_DUO_SESSION, DEFAULT_MARATHON, DEFAULT_PERSON, DUO_SESSION_KEY, stepsFor(), asList(), asNumber(), asPerson() (+14 more)

### Community 14 - "duo.js"
Cohesion: 0.12
Nodes (21): valueLabel(), DuoSummary(), genre(), label(), PersonChips(), AmbienceOptions(), AMBIENCES, EPISODE_OPTIONS (+13 more)

### Community 15 - "historyService.js"
Cohesion: 0.23
Nodes (15): DuoHistoryDialog(), MovieActions(), DUO_HISTORY_KEY, useDuoHistory(), addToHistory(), asHistory(), EMPTY_HISTORY, excludedGroups() (+7 more)

### Community 17 - "Intervención 2026-09-27 — Claude Code (Claude Opus 5.5)"
Cohesion: 0.14
Nodes (13): AI-LOG — CINET (antes CineHub), Cambios realizados, Cambios realizados, Intervención 2026-09-27 — Claude Code (Claude Opus 5.5), Intervención 2026-10-09 — Claude Code (Claude Opus 5.5), Línea base (ejecutada antes de tocar nada), Pendiente / limitaciones, Pendiente / limitaciones (+5 more)

### Community 18 - "planRepository.js"
Cohesion: 0.15
Nodes (27): PlanPage(), useRemotePlan(), acceptInvite(), call(), cancelPlan(), client(), createInvite(), createPlan() (+19 more)

### Community 19 - "FunctionsPage.jsx"
Cohesion: 0.17
Nodes (17): CinemaOptions(), DateOptions(), optionClass(), TimeOptions(), ShowtimeStep(), EMPTY, PlanForm(), chainCinema() (+9 more)

### Community 21 - "20261009120000_shared_plans.sql"
Cohesion: 0.15
Nodes (20): auth, pg_catalog.pg_timezone_names, pg_publication, public, public.accept_plan_invite(), public.cancel_plan(), public.cinet_fail(), public.create_plan() (+12 more)

### Community 22 - "CINET: prompt para Claude — continuación, experiencia y crecimiento"
Cohesion: 0.10
Nodes (19): A1. Corrige los fallos detectados, A2. Completa el recorrido de plan e invitación, A3. Horarios, copy, CI y medición, A. Cierra primero P0: planes reales y confianza, B. Haz social Duo: cada persona desde su celular, C. Personalización y descubrimiento que ahorran tiempo, CINET: prompt para Claude — continuación, experiencia y crecimiento, D. Grupos, familias y planes completos (+11 more)

### Community 23 - "tmdbClient.test.js"
Cohesion: 0.23
Nodes (7): search(), getDuoCandidates(), EMPTY_ADVANCED, getMovieById(), configureTmdb(), connect(), fakeApi()

### Community 24 - "tmdbProxy.js"
Cohesion: 0.18
Nodes (11): vite, @vitejs/plugin-react, APPEND, createTmdbProxy(), fail(), json(), nodeHandler(), PARAMS (+3 more)

### Community 25 - "Prompt de ejecución para Codex: CINET"
Cohesion: 0.12
Nodes (16): 1A. TMDB en servidor, 1B. Persistencia compartida y permisos, 1C. Honestidad y entrega continua, Entregables y condición de cierre, Estado de partida que debes revalidar, Fase 0. Auditoría y contratos, Fase 1. Base segura y un plan realmente compartido, Fase 2. Duo desde cada celular (+8 more)

### Community 26 - "analytics.js"
Cohesion: 0.11
Nodes (21): AnalyticsConsent(), BrandLogo(), LABELS, TmdbStatus(), Footer(), Header(), Layout(), subscribe() (+13 more)

### Community 27 - "plans.test.js"
Cohesion: 0.24
Nodes (10): @electric-sql/pglite, as(), asAdmin(), createDb(), createUsers(), errorCode(), MIGRATIONS, rpc() (+2 more)

### Community 28 - "CINET: de elegir una película a hacer un plan"
Cohesion: 0.18
Nodes (10): 1. La apuesta, 2. Lo que el código ya ofrece, 3. Las ideas prioritarias, 4. Cómo puede crecer, 5. La oferta para los cines, 6. Ingresos, en orden de validación, 7. Qué medir y qué significa, 8. Orden de ejecución (+2 more)

### Community 29 - "Fase 0 · Auditoría (2026-10-09)"
Cohesion: 0.20
Nodes (9): Backlog ejecutable, CINET — registro de implementación, Contratos decididos, Fase 0 · Auditoría (2026-10-09), Hallazgos verificados en el código, P0-1 · Proxy de TMDB — HECHO y verificado localmente, P0-2 · Planes compartidos (servidor) — HECHO y verificado localmente, P0-3 · Planes compartidos (cliente) — EN CURSO (+1 more)

### Community 30 - "devDependencies"
Cohesion: 0.18
Nodes (11): devDependencies, @electric-sql/pglite, eslint, @eslint/js, eslint-plugin-react-hooks, eslint-plugin-react-refresh, globals, @playwright/test (+3 more)

### Community 31 - "20260929024739_create_profiles.sql"
Cohesion: 0.22
Nodes (6): public.handle_new_user, public.profiles_before_update, on_auth_user_created, profiles_before_update, public.profiles, auth.users

### Community 32 - "scripts"
Cohesion: 0.25
Nodes (8): scripts, build, dev, lint, preview, test, test:e2e, test:tmdb

### Community 34 - "dependencies"
Cohesion: 0.40
Nodes (5): dependencies, react, react-dom, react-router-dom, @supabase/supabase-js

### Community 35 - "MovieDetailPage.jsx"
Cohesion: 0.29
Nodes (7): createParticles(), MovieBackdrop(), prefersReducedMotion(), MovieDetailPoster(), MovieInfo(), useMovie(), MovieDetailPage()

### Community 39 - "useAuth"
Cohesion: 0.08
Nodes (37): AuthForm(), FIELDS, AvatarUpload(), ProfileCard(), ROLE_LABELS, FIELDS, ProfileForm(), UserAvatar() (+29 more)

### Community 40 - "DuoResults.jsx"
Cohesion: 0.13
Nodes (21): DiceButton(), PosterImage(), SkeletonRow(), DuoFinal(), voteOf(), CRITERIA, DuoRecommendationCard(), DuoResults() (+13 more)

### Community 41 - "regionName"
Cohesion: 0.15
Nodes (13): DuoModeStep(), Availability(), formatDate(), MovieExtras(), WhereToWatch(), LOGOS, PlatformLogo(), WatchModal() (+5 more)

### Community 42 - "Button.jsx"
Cohesion: 0.24
Nodes (8): Button(), EmptyState(), BookingSummary(), PlansPreview(), PlanStats(), useReveal(), filterPlans(), getPlanStats()

### Community 43 - "PlanPage.jsx"
Cohesion: 0.35
Nodes (11): Toast(), PlanCard(), RsvpPanel(), useShare(), useToast(), InvitePanel(), getRsvpStatus(), getShareText() (+3 more)

### Community 44 - "listEs"
Cohesion: 0.22
Nodes (16): DuoCommonStep(), names(), toneNames(), DuoEmptyState(), REASONS, capitalize(), describeHit(), everyoneReason() (+8 more)

### Community 45 - "palette.js"
Cohesion: 0.25
Nodes (13): MovieCard(), MoviePoster(), _analyze(), _avg(), _cache, _complement(), extractPalette(), FALLBACK (+5 more)

### Community 46 - "recommender.test.js"
Cohesion: 0.15
Nodes (11): CinephileProfile(), getTasteStats(), isStrict(), MIN_RESULTS, NEAR_MINUTES, rollDice(), group(), person() (+3 more)

### Community 47 - "DuoPersonStep.jsx"
Cohesion: 0.22
Nodes (12): Chip(), ChoiceChips(), Question(), DuoPersonStep(), GENRE_INTENTS, genreState(), PLACEHOLDERS, STATE_MARK (+4 more)

### Community 48 - "DuoMarathon"
Cohesion: 0.26
Nodes (14): clock(), DuoMarathon(), buildMarathon(), byRelease(), chooseNext(), describeMarathon(), minutesOf(), preferStrict() (+6 more)

### Community 49 - "Copia desde aquí para ejecutar"
Cohesion: 0.15
Nodes (13): 10. Orden de entregas y aceptación, 11. Evaluación de recomendación y UX, 12. Pruebas y condición de cierre, 1. La experiencia que vamos a construir, 2. Dirección visual: transformar el recorrido, 3. Movimiento y diversión con propósito, 4. Aprender gustos con películas, sin convertirlo en examen, 5. Mejorar el motor: corrección, señales y tres propuestas como conjunto (+5 more)

### Community 50 - "DuoSeats.jsx"
Cohesion: 0.24
Nodes (11): DuoProgress(), fitState(), hitText(), ORDER, SeatAvatar(), SeatFit(), short(), VoteGrid() (+3 more)

### Community 51 - "AdvancedFilters.jsx"
Cohesion: 0.24
Nodes (8): RATINGS, RUNTIMES, genreKeysFor(), genreLabel(), GENRES, LANGUAGES, REGIONS, TV_LABELS

### Community 52 - "CineHub (marca visible: CINET)"
Cohesion: 0.20
Nodes (10): CineHub (marca visible: CINET), Figma, Invitado, Justificación de la aplicación web, Organizador del plan, Problema, Restricciones del proyecto (verificadas), Roles de usuario (+2 more)

### Community 53 - "Analítica de producto de CINET"
Cohesion: 0.25
Nodes (7): Analítica de producto de CINET, Envío, Estado, Eventos, Métricas que permite, Principios, Retención y borrado (política propuesta, la confirma quien opere el servicio)

### Community 54 - "DuoModeStep.jsx"
Cohesion: 0.33
Nodes (6): COUNTS, GroupPicker(), MARATHON_TYPES, groupOf(), GROUPS, MAX_PEOPLE

### Community 55 - "Prompt para Claude: Duo visual, divertido y con mejores recomendaciones"
Cohesion: 0.33
Nodes (3): Diagnóstico previo: qué necesita cambiar, Fuentes y alcance de las propuestas, Prompt para Claude: Duo visual, divertido y con mejores recomendaciones

### Community 56 - "Duo: ocasiones, decisión breve y siguiente plan"
Cohesion: 0.33
Nodes (6): Archivos principales, Cómo revisar, Duo: ocasiones, decisión breve y siguiente plan, Evidencia local, Ideas siguientes, ordenadas por valor, Problema y resultado

### Community 57 - "Funcionalidades principales"
Cohesion: 0.33
Nodes (6): 1. Buscar y explorar películas, 2. Consultar una película y sus funciones, 3. Crear un plan, 4. Consultar un plan, 5. Responder a un plan, Funcionalidades principales

### Community 58 - "marathonTitles"
Cohesion: 0.67
Nodes (4): PlanHero(), PlanSummary(), getPlanPoster(), marathonTitles()

## Knowledge Gaps
- **212 isolated node(s):** `name`, `private`, `version`, `description`, `type` (+207 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 286 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **5 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `react` to `router.jsx`, `recommender.js`, `isTmdbEnabled`, `HeroCarousel.jsx`, `package.json`, `App.jsx`, `DuoPage.jsx`, `historyService.js`, `FunctionsPage.jsx`, `analytics.js`, `MovieDetailPage.jsx`, `useAuth`, `DuoResults.jsx`, `regionName`, `Button.jsx`, `PlanPage.jsx`, `palette.js`, `DuoPersonStep.jsx`, `AdvancedFilters.jsx`?**
  _High betweenness centrality (0.158) - this node is a cross-community bridge._
- **Why does `react-router-dom` connect `router.jsx` to `recommender.js`, `isTmdbEnabled`, `MovieDetailPage.jsx`, `HeroCarousel.jsx`, `package.json`, `useAuth`, `DuoResults.jsx`, `regionName`, `Button.jsx`, `App.jsx`, `react`, `palette.js`, `DuoPage.jsx`, `historyService.js`, `PlanPage.jsx`, `FunctionsPage.jsx`, `analytics.js`?**
  _High betweenness centrality (0.058) - this node is a cross-community bridge._
- **Why does `@electric-sql/pglite` connect `plans.test.js` to `package.json`?**
  _High betweenness centrality (0.027) - this node is a cross-community bridge._
- **What connects `name`, `private`, `version` to the rest of the system?**
  _212 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `router.jsx` be split into smaller, more focused modules?**
  _Cohesion score 0.10121457489878542 - nodes in this community are weakly interconnected._
- **Should `recommender.js` be split into smaller, more focused modules?**
  _Cohesion score 0.1350806451612903 - nodes in this community are weakly interconnected._
- **Should `movieService.js` be split into smaller, more focused modules?**
  _Cohesion score 0.06693877551020408 - nodes in this community are weakly interconnected._