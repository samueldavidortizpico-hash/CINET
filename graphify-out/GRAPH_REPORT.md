# Graph Report - CINET  (2026-10-11)

## Corpus Check
- 261 files · ~779,678 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1703 nodes · 4633 edges · 90 communities (80 shown, 5 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 58 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `5c102f83`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- 20261010120000_duo_rooms.sql
- recommender.js
- fallbackPoster
- movieService.js
- FunctionsPage.jsx
- package.json
- duoService.js
- Avatares de CINET
- tmdbClient.js
- Milestone 2 — React Frontend
- isTmdbEnabled
- analytics.js
- useDuoSession.js
- vercel.json
- roomRepository.js
- duo-eval.mjs
- check-avatar-policies.mjs
- Intervención 2026-10-11 — Claude Code (Claude Opus 5.5) · Entrada de app, panel de cuenta y centro legal
- planRepository.js
- RecapPage.jsx
- public/images/SOURCES.md
- 20261009120000_shared_plans.sql
- CINET: prompt para Claude — continuación, experiencia y crecimiento
- DuoSeenStep.jsx
- tmdbProxy.js
- Prompt de ejecución para Codex: CINET
- DuoSeats.jsx
- fake-supabase.mjs
- CINET: de elegir una película a hacer un plan
- Progreso
- devDependencies
- 20260929024739_create_profiles.sql
- scripts
- PartnerPage.jsx
- dependencies
- DuoRoomPage.jsx
- ProfileCard.jsx
- DuoPage.jsx
- regionName
- partnerRepository.js
- rooms.test.js
- DuoCommonStep.jsx
- partnerWebhook.js
- useToast
- DuoPersonStep.jsx
- naturalQuery.js
- Copia desde aquí para ejecutar
- useReveal
- 20261012120000_groups.sql
- CineHub (marca visible: CINET)
- Analítica de producto de CINET
- 20261014120000_partners.sql
- Prompt para Claude: Duo visual, divertido y con mejores recomendaciones
- Duo: ocasiones, decisión breve y siguiente plan
- Funcionalidades principales
- useAsync
- @playwright/test
- DuoFinal.jsx
- DuoMarathon.jsx
- planService.js
- react
- ogMeta.js
- tmdbClient.test.js
- 20261013120000_plan_time_poll.sql
- listEs
- DuoNightExperience.jsx
- 20261015120000_plus_sandbox.sql
- Costos y salida al mercado — documento de preparación
- Piloto con cines — documento de preparación
- buildMarathon
- HeroCarousel.jsx
- Legal y privacidad — decisiones pendientes (documento interno)
- vite.config.js
- 20261011120000_user_preferences.sql
- react-router-dom
- expo
- public.plans
- DuoModeStep.jsx
- duo.js
- data/tmdb.js
- recommender.test.js
- palette.js
- DuoVoteRound.jsx
- DuoResults.jsx
- router.jsx

## God Nodes (most connected - your core abstractions)
1. `react` - 86 edges
2. `useAsync()` - 47 edges
3. `useDocumentTitle()` - 47 edges
4. `useToast()` - 45 edges
5. `react-router-dom` - 43 edges
6. `useAuth()` - 43 edges
7. `Button()` - 42 edges
8. `isTmdbEnabled()` - 38 edges
9. `DuoPage()` - 33 edges
10. `track()` - 27 edges

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

## Communities (90 total, 5 thin omitted)

### Community 0 - "20261010120000_duo_rooms.sql"
Cohesion: 0.10
Nodes (24): pg_publication_tables, public.touch_room, plan_members_touch, public.choose_room_title(), public.close_room_round(), public.create_duo_room(), public.drop_room_member(), public.duo_rooms (+16 more)

### Community 1 - "recommender.js"
Cohesion: 0.11
Nodes (33): item(), profile, byRank(), calibrationLike(), checkTitle(), clamp01(), closest(), diversify() (+25 more)

### Community 2 - "fallbackPoster"
Cohesion: 0.17
Nodes (15): CinemaPage, answerOf(), DuoCalibration(), loadDeck(), snapshot(), suggestions(), SlideMedia(), MovieDetailPoster() (+7 more)

### Community 3 - "movieService.js"
Cohesion: 0.07
Nodes (45): search(), genreKeysFor(), genreLabel(), ALIASES, BY_TMDB_ID, capitalize(), COLLECTIONS, countryName() (+37 more)

### Community 4 - "FunctionsPage.jsx"
Cohesion: 0.18
Nodes (14): Button(), BookingSummary(), AmbienceOptions(), CinemaOptions(), DateOptions(), optionClass(), TimeOptions(), ShowtimeStep() (+6 more)

### Community 5 - "package.json"
Cohesion: 0.16
Nodes (13): description, name, private, type, version, eslint, @eslint/js, eslint-plugin-react-hooks (+5 more)

### Community 6 - "duoService.js"
Cohesion: 0.21
Nodes (19): FORMAT_GENRES, SERIES_STATUS, VOTE_POINTS, discoverForDuo(), discoverParams(), enrich(), fetchSources(), genreIds() (+11 more)

### Community 7 - "Avatares de CINET"
Cohesion: 0.22
Nodes (8): Archivos de la implementación, Avatares de CINET, Cómo funciona, Estado y alcance, Probar en localhost, Pruebas locales reproducibles, Seguridad, SQL manual en Supabase

### Community 8 - "tmdbClient.js"
Cohesion: 0.13
Nodes (27): ActorPicker(), cache, config, CONNECTION_ERRORS, counts, discoverMovies(), discoverTv(), getTitleList() (+19 more)

### Community 9 - "Milestone 2 — React Frontend"
Cohesion: 0.20
Nodes (10): Arquitectura, Capa offline (HW07), Cartelera y cadenas de cine, CineHub Duo, Cómo ejecutarlo, Decisiones clave (para la defensa), Milestone 2 — React Frontend, Prototipo anterior (+2 more)

### Community 10 - "isTmdbEnabled"
Cohesion: 0.23
Nodes (16): AdvancedFilters(), MovieFilters(), DEPARTMENTS, MovieSearch(), thumb(), useMovies(), EMPTY, unique() (+8 more)

### Community 11 - "analytics.js"
Cohesion: 0.05
Nodes (49): @supabase/supabase-js, App(), router, AvatarUpload(), PartnerListings(), updated(), AnalyticsConsent(), AuthContext (+41 more)

### Community 12 - "useDuoSession.js"
Cohesion: 0.18
Nodes (18): DEFAULT_DUO_SESSION, DEFAULT_PERSON, familyFilter(), stepsFor(), asList(), asNumber(), asPerson(), asRound() (+10 more)

### Community 13 - "vercel.json"
Cohesion: 0.29
Nodes (6): includeFiles, functions, api/og.js, headers, rewrites, $schema

### Community 14 - "roomRepository.js"
Cohesion: 0.12
Nodes (26): Room(), useRoomState(), DECK_SIZE, describeResult(), ROOM_VOTES, roomSession(), roundProgress(), safeImage() (+18 more)

### Community 15 - "duo-eval.mjs"
Cohesion: 0.08
Nodes (40): RFC-4180, jaccard(), NETFLIX, person(), root, rows, SCENARIOS, session() (+32 more)

### Community 17 - "Intervención 2026-10-11 — Claude Code (Claude Opus 5.5) · Entrada de app, panel de cuenta y centro legal"
Cohesion: 0.06
Nodes (34): AI-LOG — CINET (antes CineHub), Cambios, Cambios, Cambios realizados, Cambios realizados, Cambios realizados, Configuración externa (no se tocó nada remoto), Continuación 2026-10-09/10 · Fase P1 (salas de Duo e invitados) (+26 more)

### Community 18 - "planRepository.js"
Cohesion: 0.05
Nodes (79): EMPTY, PreferencesForm(), PreferencesPanel(), PlanGroupPanel(), PlanTimePoll(), asList(), asMap(), PlanContext (+71 more)

### Community 19 - "RecapPage.jsx"
Cohesion: 0.26
Nodes (8): CinemaTicketsPage, CINEMA_CHAINS, MONTHS, WEEKDAYS, RecapPage(), buildRecap(), counted(), recapShareText()

### Community 21 - "20261009120000_shared_plans.sql"
Cohesion: 0.16
Nodes (19): pg_catalog.pg_timezone_names, public.accept_plan_invite(), public.cancel_plan(), public.cinet_fail(), public.create_plan(), public.create_plan_invite(), public.delete_plan(), public.is_plan_member() (+11 more)

### Community 22 - "CINET: prompt para Claude — continuación, experiencia y crecimiento"
Cohesion: 0.10
Nodes (19): A1. Corrige los fallos detectados, A2. Completa el recorrido de plan e invitación, A3. Horarios, copy, CI y medición, A. Cierra primero P0: planes reales y confianza, B. Haz social Duo: cada persona desde su celular, C. Personalización y descubrimiento que ahorran tiempo, CINET: prompt para Claude — continuación, experiencia y crecimiento, D. Grupos, familias y planes completos (+11 more)

### Community 23 - "DuoSeenStep.jsx"
Cohesion: 0.15
Nodes (14): COLLECTIONS, generatedAt, snapshot, DuoSeenStep(), findTitles(), popularTitles(), INITIAL_FILTERS, MovieContext (+6 more)

### Community 24 - "tmdbProxy.js"
Cohesion: 0.16
Nodes (10): APPEND, createTmdbProxy(), fail(), json(), nodeHandler(), PARAMS, ROUTES, calls (+2 more)

### Community 25 - "Prompt de ejecución para Codex: CINET"
Cohesion: 0.12
Nodes (16): 1A. TMDB en servidor, 1B. Persistencia compartida y permisos, 1C. Honestidad y entrega continua, Entregables y condición de cierre, Estado de partida que debes revalidar, Fase 0. Auditoría y contratos, Fase 1. Base segura y un plan realmente compartido, Fase 2. Duo desde cada celular (+8 more)

### Community 26 - "DuoSeats.jsx"
Cohesion: 0.23
Nodes (14): fitState(), hitText(), ORDER, SeatFit(), short(), voteIcon(), voteLabel(), VoteSeats() (+6 more)

### Community 27 - "fake-supabase.mjs"
Cohesion: 0.15
Nodes (23): addUser(), asValue(), auth(), authUser(), b64(), exclusive(), filters(), ident() (+15 more)

### Community 28 - "CINET: de elegir una película a hacer un plan"
Cohesion: 0.18
Nodes (10): 1. La apuesta, 2. Lo que el código ya ofrece, 3. Las ideas prioritarias, 4. Cómo puede crecer, 5. La oferta para los cines, 6. Ingresos, en orden de validación, 7. Qué medir y qué significa, 8. Orden de ejecución (+2 more)

### Community 29 - "Progreso"
Cohesion: 0.04
Nodes (43): 1. Lo que ya existe (verificado en el código y con E2E local), 2. Por qué Capacitor y no reescribir, 3. Bloqueos a resolver ANTES de empaquetar, 4. Pasos (para cuando se autorice; no ejecutados), 5. Publicación (requiere decisión y cuentas de la persona responsable), 6. Orden recomendado, CINET en el celular: PWA hoy, Android con Capacitor después, 1. Auditoría breve (estado antes de editar) (+35 more)

### Community 30 - "devDependencies"
Cohesion: 0.18
Nodes (11): devDependencies, @electric-sql/pglite, eslint, @eslint/js, eslint-plugin-react-hooks, eslint-plugin-react-refresh, globals, @playwright/test (+3 more)

### Community 31 - "20260929024739_create_profiles.sql"
Cohesion: 0.22
Nodes (6): public.handle_new_user, public.profiles_before_update, on_auth_user_created, profiles_before_update, public.profiles, auth.users

### Community 32 - "scripts"
Cohesion: 0.22
Nodes (9): scripts, build, catalog:snapshot, dev, lint, preview, test, test:e2e (+1 more)

### Community 33 - "PartnerPage.jsx"
Cohesion: 0.28
Nodes (7): PartnerPage, findTitles(), OrgPanel(), PartnerPage(), STATUS, TitlePicker(), when()

### Community 34 - "dependencies"
Cohesion: 0.33
Nodes (6): dependencies, qrcode-generator, react, react-dom, react-router-dom, @supabase/supabase-js

### Community 35 - "DuoRoomPage.jsx"
Cohesion: 0.11
Nodes (21): DuoRoomPage, GroupsPage, InvitePage, PlusPage, EmptyState(), Loading(), ProtectedRoute(), useAuth() (+13 more)

### Community 39 - "ProfileCard.jsx"
Cohesion: 0.28
Nodes (6): ProfileCard(), ROLE_LABELS, UserAvatar(), LINKS, STAFF_LINKS, UserMenu()

### Community 40 - "DuoPage.jsx"
Cohesion: 0.17
Nodes (20): DuoPersonStep(), DuoSummary(), personName(), candidatesKey(), DuoPage(), FRESH_RESULTS, NEEDS_CANDIDATES, mergeRoundVotes() (+12 more)

### Community 41 - "regionName"
Cohesion: 0.18
Nodes (11): Modal(), trapFocus(), formatDate(), MovieExtras(), WhereToWatch(), WatchModal(), withAvailability(), OFFER_TYPES (+3 more)

### Community 42 - "partnerRepository.js"
Cohesion: 0.12
Nodes (36): RFC-5545, AdminPage, AdminPage(), PendingPartners(), TOOLS, addListing(), addMember(), addOffer() (+28 more)

### Community 43 - "rooms.test.js"
Cohesion: 0.05
Nodes (44): @electric-sql/pglite, as(), asAdmin(), createDb(), createUsers(), errorCode(), MIGRATIONS, rpc() (+36 more)

### Community 44 - "DuoCommonStep.jsx"
Cohesion: 0.26
Nodes (12): DuoCommonStep(), limitsOf(), names(), toneNames(), valueLabel(), SeatAvatar(), FAMILY_LEVELS, MARATHON_STYLES (+4 more)

### Community 45 - "partnerWebhook.js"
Cohesion: 0.13
Nodes (25): handle, handler(), store, handle, handler(), secrets(), store, createBillingWebhook() (+17 more)

### Community 46 - "useToast"
Cohesion: 0.33
Nodes (13): LIKED, LIKED_TEXT, PlanAfterglow(), RsvpPanel(), useShare(), useToast(), CinemaTicketsPage(), GroupDetail() (+5 more)

### Community 47 - "DuoPersonStep.jsx"
Cohesion: 0.15
Nodes (16): Chip(), ChoiceChips(), Question(), GENRE_INTENTS, GenreEditor(), genreState(), PLACEHOLDERS, STATE_MARK (+8 more)

### Community 48 - "naturalQuery.js"
Cohesion: 0.17
Nodes (16): CHAPTERS, DuoIntro(), POSTERS, useSceneMotion(), describeQuery(), GENRE_WORDS, genreName(), MOOD_WORDS (+8 more)

### Community 49 - "Copia desde aquí para ejecutar"
Cohesion: 0.15
Nodes (13): 10. Orden de entregas y aceptación, 11. Evaluación de recomendación y UX, 12. Pruebas y condición de cierre, 1. La experiencia que vamos a construir, 2. Dirección visual: transformar el recorrido, 3. Movimiento y diversión con propósito, 4. Aprender gustos con películas, sin convertirlo en examen, 5. Mejorar el motor: corrección, señales y tres propuestas como conjunto (+5 more)

### Community 50 - "useReveal"
Cohesion: 0.31
Nodes (7): FaqItem(), FaqSection(), DuoSpotlight(), HomeExperiences(), PATHS, FAQ, useReveal()

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

### Community 58 - "useAsync"
Cohesion: 0.21
Nodes (15): CollectionSection(), MovieActions(), MovieGrid(), CinephileProfile(), DUO_HISTORY_KEY, useAsync(), useDuoHistory(), useFavorites() (+7 more)

### Community 59 - "@playwright/test"
Cohesion: 0.08
Nodes (6): answer(), prepareNight(), openRoom(), signIn(), NO_SECRETS, @playwright/test

### Community 60 - "DuoFinal.jsx"
Cohesion: 0.20
Nodes (10): PosterImage(), SkeletonRow(), DuoFinal(), endTime(), voteOf(), SelectedMovie(), listeners, notify() (+2 more)

### Community 61 - "DuoMarathon.jsx"
Cohesion: 0.26
Nodes (13): DuoEmptyState(), REASONS, clock(), DuoMarathon(), getShowtimes(), recommendedStart(), toPlanMovie(), capitalize() (+5 more)

### Community 62 - "planService.js"
Cohesion: 0.17
Nodes (20): CreatePlanPage, PlansPreview(), PlanCard(), EMPTY, PlanForm(), PlanHero(), PlanStats(), PlanSummary() (+12 more)

### Community 63 - "react"
Cohesion: 0.26
Nodes (8): react, createParticles(), MovieBackdrop(), prefersReducedMotion(), MovieInfo(), TrailerModal(), useMovie(), MovieDetailPage()

### Community 64 - "ogMeta.js"
Cohesion: 0.25
Nodes (9): clip(), createOgHandler(), DEFAULT, escapeHtml(), injectMeta(), ogFor(), PRIVATE, publicTitle() (+1 more)

### Community 65 - "tmdbClient.test.js"
Cohesion: 0.22
Nodes (9): LABELS, TmdbStatus(), checkTmdbConnection(), configureTmdb(), getTmdbStatus(), subscribeTmdbStatus(), connect(), fakeApi() (+1 more)

### Community 66 - "20261013120000_plan_time_poll.sql"
Cohesion: 0.24
Nodes (10): plan_time_options_touch, plan_time_votes_touch, public.choose_plan_time(), public.owned_active_plan(), public.plan_time_options, public.plan_time_votes, public.propose_plan_times(), auth.users (+2 more)

### Community 67 - "listEs"
Cohesion: 0.38
Nodes (10): describeHit(), everyoneReason(), genreNames(), listEs(), pickFinalists(), pleasedIndexes(), reasonsFor(), sameSaga() (+2 more)

### Community 68 - "DuoNightExperience.jsx"
Cohesion: 0.56
Nodes (7): DuoNightExperience(), clock(), NIGHT_QUESTIONS, NIGHT_RITUALS, nightAgenda(), nightSummary(), normalizeNight()

### Community 69 - "20261015120000_plus_sandbox.sql"
Cohesion: 0.25
Nodes (6): public.activate_plus_sandbox(), public.billing_config, public.billing_events, public.entitlements, public.has_plus(), auth.users

### Community 70 - "Costos y salida al mercado — documento de preparación"
Cohesion: 0.18
Nodes (10): 1. Qué usa CINET hoy (verificado en el código), 2. Modelo de ingresos (hipótesis a validar), 3. Costos operativos a estimar (sin cifras inventadas), 4. Obligaciones antes de abrir al público (por revisar con asesoría legal), 5. Salida al mercado (borrador), 6. Decisiones pendientes (de negocio), Costos y salida al mercado — documento de preparación, Duo: lo gratuito y lo que Plus podría ofrecer (propuesta del 2026-10-10, nada activado) (+2 more)

### Community 71 - "Piloto con cines — documento de preparación"
Cohesion: 0.20
Nodes (9): 1. Propuesta de valor para el cine, 2. Alcance del piloto (propuesto), 3. Lo que ya está construido (verificado localmente, no desplegado), 4. Reglas de medición (propuestas), 5. Guía de entrevista (30 min, antes de proponer nada), 6. Responsabilidades (borrador), 7. Borrador de acuerdo — SOLO PARA REVISIÓN HUMANA, 8. Clubes y eventos (+1 more)

### Community 72 - "buildMarathon"
Cohesion: 0.42
Nodes (9): buildMarathon(), byRelease(), chooseNext(), minutesOf(), preferStrict(), sagaMarathon(), seriesMarathon(), split() (+1 more)

### Community 73 - "HeroCarousel.jsx"
Cohesion: 0.46
Nodes (6): HeroCarousel(), SCENE_COLORS, shorten(), useSceneVisibility(), getHeroSlides(), getMovieById()

### Community 74 - "Legal y privacidad — decisiones pendientes (documento interno)"
Cohesion: 0.29
Nodes (6): Aceptación, «Acerca de» retirado, Cobros: qué falta antes de activar pagos, Cómo se redactaron, Decisiones que necesitan una persona responsable, Legal y privacidad — decisiones pendientes (documento interno)

### Community 77 - "react-router-dom"
Cohesion: 0.08
Nodes (41): react-router-dom, AuthForm(), FIELD_NAMES, TEXT_FIELDS, PasswordField(), FIELDS, ProfileForm(), BrandLogo() (+33 more)

### Community 78 - "expo"
Cohesion: 0.40
Nodes (4): projectId, expo, extra, eas

### Community 81 - "DuoModeStep.jsx"
Cohesion: 0.12
Nodes (20): Icon(), COUNTS, DuoModeStep(), FANS, MARATHON_TYPES, poster(), seatsArt(), SessionTicket() (+12 more)

### Community 83 - "duo.js"
Cohesion: 0.18
Nodes (11): DuoProgress(), CALIBRATION_ANSWERS, DEFAULT_MARATHON, DUO_PREFERENCES_KEY, DUO_SCENES, DUO_SESSION_KEY, FAMILY_CERTS, MIN_PEOPLE (+3 more)

### Community 84 - "data/tmdb.js"
Cohesion: 0.31
Nodes (6): RATINGS, RUNTIMES, GENRES, LANGUAGES, REGIONS, TV_LABELS

### Community 85 - "recommender.test.js"
Cohesion: 0.21
Nodes (7): isStrict(), rollDice(), group(), person(), SERIES, session(), WEIGHTS

### Community 87 - "palette.js"
Cohesion: 0.38
Nodes (10): _analyze(), _avg(), _cache, _complement(), FALLBACK, _fromHsv(), _hex(), _hsv() (+2 more)

### Community 88 - "DuoVoteRound.jsx"
Cohesion: 0.17
Nodes (17): DuoVoteRound(), KEYS, voteOf(), VOTES, applyMotionChoice(), setLessMotion(), subscribe(), useLessMotion() (+9 more)

### Community 89 - "DuoResults.jsx"
Cohesion: 0.16
Nodes (14): DiceButton(), Availability(), CRITERIA, DuoRecommendationCard(), COUNT, DuoResults(), learnedText(), VoteGrid() (+6 more)

### Community 91 - "router.jsx"
Cohesion: 0.12
Nodes (17): DashboardPage, DuoPage, FunctionsPage, LegalPage, MovieDetailPage, MoviesPage, MyPlansPage, PlanPage (+9 more)

## Knowledge Gaps
- **369 isolated node(s):** `store`, `store`, `projectId`, `PORT`, `ROOT` (+364 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 540 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **5 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `react` to `recommender.js`, `fallbackPoster`, `FunctionsPage.jsx`, `package.json`, `isTmdbEnabled`, `analytics.js`, `useDuoSession.js`, `duo-eval.mjs`, `planRepository.js`, `RecapPage.jsx`, `DuoSeenStep.jsx`, `PartnerPage.jsx`, `DuoRoomPage.jsx`, `ProfileCard.jsx`, `DuoPage.jsx`, `regionName`, `partnerRepository.js`, `useToast`, `DuoPersonStep.jsx`, `naturalQuery.js`, `useReveal`, `useAsync`, `DuoFinal.jsx`, `DuoMarathon.jsx`, `planService.js`, `tmdbClient.test.js`, `DuoNightExperience.jsx`, `HeroCarousel.jsx`, `react-router-dom`, `DuoModeStep.jsx`, `data/tmdb.js`, `DuoVoteRound.jsx`, `DuoResults.jsx`, `router.jsx`?**
  _High betweenness centrality (0.212) - this node is a cross-community bridge._
- **Why does `@electric-sql/pglite` connect `rooms.test.js` to `package.json`?**
  _High betweenness centrality (0.197) - this node is a cross-community bridge._
- **Why does `auth()` connect `fake-supabase.mjs` to `20261010120000_duo_rooms.sql`, `20261015120000_plus_sandbox.sql`, `20261012120000_groups.sql`, `20261009120000_shared_plans.sql`, `20261014120000_partners.sql`?**
  _High betweenness centrality (0.114) - this node is a cross-community bridge._
- **What connects `store`, `store`, `projectId` to the rest of the system?**
  _369 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `20261010120000_duo_rooms.sql` be split into smaller, more focused modules?**
  _Cohesion score 0.10338680926916222 - nodes in this community are weakly interconnected._
- **Should `recommender.js` be split into smaller, more focused modules?**
  _Cohesion score 0.10668563300142248 - nodes in this community are weakly interconnected._
- **Should `movieService.js` be split into smaller, more focused modules?**
  _Cohesion score 0.07180851063829788 - nodes in this community are weakly interconnected._