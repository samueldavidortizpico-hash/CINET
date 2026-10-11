# Graph Report - CINET  (2026-10-10)

## Corpus Check
- 251 files · ~692,989 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1642 nodes · 4483 edges · 95 communities (85 shown, 5 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 58 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `5c102f83`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- 20261010120000_duo_rooms.sql
- recommender.js
- useTitleSearch.js
- movieService.js
- FunctionsPage.jsx
- package.json
- duoService.js
- Avatares de CINET
- tmdbClient.js
- Milestone 2 — React Frontend
- react
- avatarService.js
- duo.js
- vercel.json
- DuoRoomPage.jsx
- csvImport.js
- check-avatar-policies.mjs
- Intervención 2026-10-09 — Claude Code (Claude Opus 5.5) · Fase P0 de `docs/PROMPT-CODEX-CINET.md`
- planRepository.js
- recap.js
- public/images/SOURCES.md
- 20261009120000_shared_plans.sql
- CINET: prompt para Claude — continuación, experiencia y crecimiento
- useAsync
- tmdbProxy.js
- Prompt de ejecución para Codex: CINET
- analytics.js
- fake-supabase.mjs
- CINET: de elegir una película a hacer un plan
- Progreso
- devDependencies
- 20260929024739_create_profiles.sql
- scripts
- useDocumentTitle
- dependencies
- router.jsx
- useAuth
- DuoPage.jsx
- platforms.js
- partnerRepository.js
- plus.test.js
- DuoCommonStep.jsx
- partnerWebhook.js
- useToast
- DuoPersonStep.jsx
- naturalQuery.js
- Copia desde aquí para ejecutar
- PlansPreview.jsx
- 20261012120000_groups.sql
- CineHub (marca visible: CINET)
- Analítica de producto de CINET
- 20261014120000_partners.sql
- Prompt para Claude: Duo visual, divertido y con mejores recomendaciones
- Duo: ocasiones, decisión breve y siguiente plan
- Funcionalidades principales
- track
- @playwright/test
- CinephileProfile.jsx
- groupRepository.js
- planService.js
- PlusPage.jsx
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
- duo-eval.mjs
- vite.config.js
- 20261011120000_user_preferences.sql
- ProfileForm.jsx
- authService.js
- public.plans
- DuoModeStep.jsx
- Layout.jsx
- HomePage.jsx
- data/tmdb.js
- recommender.test.js
- useToast.js
- palette.js
- usePrefersReducedMotion.js
- DuoResults.jsx
- services.test.js
- MyPlansPage.jsx
- DuoSummary.jsx
- time-poll.test.js

## God Nodes (most connected - your core abstractions)
1. `react` - 83 edges
2. `useAsync()` - 47 edges
3. `useDocumentTitle()` - 45 edges
4. `useToast()` - 44 edges
5. `Button()` - 42 edges
6. `useAuth()` - 41 edges
7. `react-router-dom` - 39 edges
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

## Communities (95 total, 5 thin omitted)

### Community 0 - "20261010120000_duo_rooms.sql"
Cohesion: 0.10
Nodes (24): pg_publication_tables, public.touch_room, plan_members_touch, public.choose_room_title(), public.close_room_round(), public.create_duo_room(), public.drop_room_member(), public.duo_rooms (+16 more)

### Community 1 - "recommender.js"
Cohesion: 0.06
Nodes (71): DuoEmptyState(), REASONS, item(), profile, clock(), DuoMarathon(), chainCinema(), FunctionsPage() (+63 more)

### Community 2 - "useTitleSearch.js"
Cohesion: 0.36
Nodes (7): AdvancedFilters(), EMPTY, unique(), useDebounced(), useTitleSearch(), hasFilters(), isAdvancedActive()

### Community 3 - "movieService.js"
Cohesion: 0.08
Nodes (38): search(), ALIASES, BY_TMDB_ID, capitalize(), COLLECTIONS, countryName(), discovered(), favoriteGenres() (+30 more)

### Community 4 - "FunctionsPage.jsx"
Cohesion: 0.05
Nodes (59): react-router-dom, CinemaTicketsPage, Button(), DuoFinal(), endTime(), voteOf(), Availability(), CRITERIA (+51 more)

### Community 5 - "package.json"
Cohesion: 0.15
Nodes (14): description, name, private, type, version, eslint, @eslint/js, eslint-plugin-react-hooks (+6 more)

### Community 6 - "duoService.js"
Cohesion: 0.23
Nodes (18): discoverForDuo(), discoverParams(), enrich(), fetchSources(), genreIds(), getDuoCandidates(), pairSources(), sagaParts() (+10 more)

### Community 7 - "Avatares de CINET"
Cohesion: 0.22
Nodes (8): Archivos de la implementación, Avatares de CINET, Cómo funciona, Estado y alcance, Probar en localhost, Pruebas locales reproducibles, Seguridad, SQL manual en Supabase

### Community 8 - "tmdbClient.js"
Cohesion: 0.09
Nodes (35): LABELS, TmdbStatus(), listOf(), cache, checkTmdbConnection(), config, configureTmdb(), CONNECTION_ERRORS (+27 more)

### Community 9 - "Milestone 2 — React Frontend"
Cohesion: 0.20
Nodes (10): Arquitectura, Capa offline (HW07), Cartelera y cadenas de cine, CineHub Duo, Cómo ejecutarlo, Decisiones clave (para la defensa), Milestone 2 — React Frontend, Prototipo anterior (+2 more)

### Community 10 - "react"
Cohesion: 0.11
Nodes (24): react, PosterImage(), HeroCarousel(), SCENE_COLORS, shorten(), RATINGS, RUNTIMES, MovieFilters() (+16 more)

### Community 11 - "avatarService.js"
Cohesion: 0.22
Nodes (11): AvatarUpload(), AVATAR_ACCEPT, AVATAR_BUCKET, avatarFileError(), EXTENSIONS, MAX_AVATAR_BYTES, ownedAvatarPath(), removeFile() (+3 more)

### Community 12 - "duo.js"
Cohesion: 0.11
Nodes (27): DuoProgress(), DEFAULT_MARATHON, DEFAULT_PERSON, DUO_SCENES, DUO_SESSION_KEY, FAMILY_CERTS, FORMAT_GENRES, MIN_PEOPLE (+19 more)

### Community 13 - "vercel.json"
Cohesion: 0.29
Nodes (6): includeFiles, functions, api/og.js, headers, rewrites, $schema

### Community 14 - "DuoRoomPage.jsx"
Cohesion: 0.09
Nodes (30): DuoRoomPage, DuoRoomPage(), Room(), RoomGate(), STATUS_TEXT, useRoomState(), DECK_SIZE, describeResult() (+22 more)

### Community 15 - "csvImport.js"
Cohesion: 0.25
Nodes (16): RFC-4180, FORMAT_NAMES, ImportPage(), label(), applyImport(), catalogMatchers(), CSV_LIMITS, CsvError (+8 more)

### Community 17 - "Intervención 2026-10-09 — Claude Code (Claude Opus 5.5) · Fase P0 de `docs/PROMPT-CODEX-CINET.md`"
Cohesion: 0.07
Nodes (26): AI-LOG — CINET (antes CineHub), Cambios, Cambios realizados, Cambios realizados, Cambios realizados, Continuación 2026-10-09/10 · Fase P1 (salas de Duo e invitados), Continuación 2026-10-10 · Fases P2–P4 (detalle en `docs/IMPLEMENTACION-CINET.md`), Intervención 2026-09-27 — Claude Code (Claude Opus 5.5) (+18 more)

### Community 18 - "planRepository.js"
Cohesion: 0.14
Nodes (29): PlanTimePoll(), PlanPage(), useRemotePlan(), acceptInvite(), call(), cancelPlan(), chooseTime(), clearTimes() (+21 more)

### Community 19 - "recap.js"
Cohesion: 0.43
Nodes (4): MONTHS, buildRecap(), counted(), recapShareText()

### Community 21 - "20261009120000_shared_plans.sql"
Cohesion: 0.16
Nodes (19): pg_catalog.pg_timezone_names, public.accept_plan_invite(), public.cancel_plan(), public.cinet_fail(), public.create_plan(), public.create_plan_invite(), public.delete_plan(), public.is_plan_member() (+11 more)

### Community 22 - "CINET: prompt para Claude — continuación, experiencia y crecimiento"
Cohesion: 0.10
Nodes (19): A1. Corrige los fallos detectados, A2. Completa el recorrido de plan e invitación, A3. Horarios, copy, CI y medición, A. Cierra primero P0: planes reales y confianza, B. Haz social Duo: cada persona desde su celular, C. Personalización y descubrimiento que ahorran tiempo, CINET: prompt para Claude — continuación, experiencia y crecimiento, D. Grupos, familias y planes completos (+11 more)

### Community 23 - "useAsync"
Cohesion: 0.13
Nodes (24): COLLECTIONS, generatedAt, snapshot, answerOf(), DuoCalibration(), loadDeck(), snapshot(), suggestions() (+16 more)

### Community 24 - "tmdbProxy.js"
Cohesion: 0.16
Nodes (10): APPEND, createTmdbProxy(), fail(), json(), nodeHandler(), PARAMS, ROUTES, calls (+2 more)

### Community 25 - "Prompt de ejecución para Codex: CINET"
Cohesion: 0.12
Nodes (16): 1A. TMDB en servidor, 1B. Persistencia compartida y permisos, 1C. Honestidad y entrega continua, Entregables y condición de cierre, Estado de partida que debes revalidar, Fase 0. Auditoría y contratos, Fase 1. Base segura y un plan realmente compartido, Fase 2. Duo desde cada celular (+8 more)

### Community 26 - "analytics.js"
Cohesion: 0.18
Nodes (12): Header(), useLocalStorage(), useTheme(), analytics, createAnalytics(), EVENTS, sanitize(), getRaw() (+4 more)

### Community 27 - "fake-supabase.mjs"
Cohesion: 0.17
Nodes (21): addUser(), asValue(), auth(), authUser(), b64(), exclusive(), filters(), ident() (+13 more)

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

### Community 33 - "useDocumentTitle"
Cohesion: 0.12
Nodes (18): AboutPage, EmptyState(), MovieGrid(), STEPS, TEAM, useDocumentTitle(), AboutPage(), DashboardPage() (+10 more)

### Community 34 - "dependencies"
Cohesion: 0.33
Nodes (6): dependencies, qrcode-generator, react, react-dom, react-router-dom, @supabase/supabase-js

### Community 35 - "router.jsx"
Cohesion: 0.11
Nodes (18): CinemaPage, DashboardPage, DuoPage, FunctionsPage, GroupsPage, ImportPage, InvitePage, MovieDetailPage (+10 more)

### Community 39 - "useAuth"
Cohesion: 0.17
Nodes (13): ProfilePage, ProfileCard(), ROLE_LABELS, UserAvatar(), LINKS, Navbar(), LINKS, STAFF_LINKS (+5 more)

### Community 40 - "DuoPage.jsx"
Cohesion: 0.21
Nodes (17): candidatesKey(), DuoPage(), FRESH_RESULTS, NEEDS_CANDIDATES, mergeRoundVotes(), groupRejected(), setVote(), decayed() (+9 more)

### Community 41 - "platforms.js"
Cohesion: 0.18
Nodes (10): Modal(), trapFocus(), LOGOS, PlatformLogo(), TrailerModal(), WatchModal(), withAvailability(), OFFER_TYPES (+2 more)

### Community 42 - "partnerRepository.js"
Cohesion: 0.12
Nodes (36): RFC-5545, AdminPage, AdminPage(), PendingPartners(), TOOLS, addListing(), addMember(), addOffer() (+28 more)

### Community 43 - "plus.test.js"
Cohesion: 0.14
Nodes (21): @electric-sql/pglite, as(), asAdmin(), createDb(), createUsers(), errorCode(), MIGRATIONS, rpc() (+13 more)

### Community 44 - "DuoCommonStep.jsx"
Cohesion: 0.23
Nodes (13): DuoCommonStep(), limitsOf(), names(), toneNames(), valueLabel(), DuoPersonStep(), SeatAvatar(), FAMILY_LEVELS (+5 more)

### Community 45 - "partnerWebhook.js"
Cohesion: 0.13
Nodes (25): handle, handler(), store, handle, handler(), secrets(), store, createBillingWebhook() (+17 more)

### Community 46 - "useToast"
Cohesion: 0.36
Nodes (13): PlanCard(), RsvpPanel(), usePlans(), useShare(), useToast(), GroupDetail(), InvitePanel(), RecapPage() (+5 more)

### Community 47 - "DuoPersonStep.jsx"
Cohesion: 0.15
Nodes (16): Chip(), ChoiceChips(), Question(), GENRE_INTENTS, GenreEditor(), genreState(), PLACEHOLDERS, STATE_MARK (+8 more)

### Community 48 - "naturalQuery.js"
Cohesion: 0.21
Nodes (14): DuoIntro(), DEFAULT_DUO_SESSION, describeQuery(), GENRE_WORDS, genreName(), MOOD_WORDS, negated(), norm() (+6 more)

### Community 49 - "Copia desde aquí para ejecutar"
Cohesion: 0.15
Nodes (13): 10. Orden de entregas y aceptación, 11. Evaluación de recomendación y UX, 12. Pruebas y condición de cierre, 1. La experiencia que vamos a construir, 2. Dirección visual: transformar el recorrido, 3. Movimiento y diversión con propósito, 4. Aprender gustos con películas, sin convertirlo en examen, 5. Mejorar el motor: corrección, señales y tres propuestas como conjunto (+5 more)

### Community 50 - "PlansPreview.jsx"
Cohesion: 0.39
Nodes (5): FaqItem(), FaqSection(), PlansPreview(), FAQ, useReveal()

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

### Community 58 - "track"
Cohesion: 0.16
Nodes (21): DuoHistoryDialog(), MovieActions(), LIKED, LIKED_TEXT, PlanAfterglow(), DUO_HISTORY_KEY, useDuoHistory(), useFavorites() (+13 more)

### Community 59 - "@playwright/test"
Cohesion: 0.09
Nodes (6): answer(), prepareNight(), openRoom(), signIn(), NO_SECRETS, @playwright/test

### Community 60 - "CinephileProfile.jsx"
Cohesion: 0.43
Nodes (4): SkeletonRow(), CinephileProfile(), getMoviesByIds(), getTasteStats()

### Community 61 - "groupRepository.js"
Cohesion: 0.24
Nodes (16): acceptInvite(), call(), client(), createGroup(), createInvite(), deleteGroup(), getGroup(), groupPlans() (+8 more)

### Community 62 - "planService.js"
Cohesion: 0.15
Nodes (20): CreatePlanPage, EMPTY, PlanForm(), PlanHero(), PlanSummary(), asList(), asMap(), PlanContext (+12 more)

### Community 63 - "PlusPage.jsx"
Cohesion: 0.24
Nodes (13): PlusPage, day(), FREE, PLUS, PlusPage(), price, Status(), call() (+5 more)

### Community 64 - "ogMeta.js"
Cohesion: 0.25
Nodes (9): clip(), createOgHandler(), DEFAULT, escapeHtml(), injectMeta(), ogFor(), PRIVATE, publicTitle() (+1 more)

### Community 65 - "PartnerListings.jsx"
Cohesion: 0.35
Nodes (9): PartnerListings(), updated(), formatBudget(), getListingsForTitle(), getOffersForTitle(), isCurrent(), lookups(), row (+1 more)

### Community 66 - "20261013120000_plan_time_poll.sql"
Cohesion: 0.24
Nodes (10): plan_time_options_touch, plan_time_votes_touch, public.choose_plan_time(), public.owned_active_plan(), public.plan_time_options, public.plan_time_votes, public.propose_plan_times(), auth.users (+2 more)

### Community 67 - "PreferencesPanel.jsx"
Cohesion: 0.36
Nodes (10): EMPTY, PreferencesForm(), PreferencesPanel(), useAccountPreferences(), toPlanError(), accountPreferencesAvailable(), deleteMyPreferences(), exportPreferences() (+2 more)

### Community 68 - "rooms.test.js"
Cohesion: 0.17
Nodes (8): A, B, C, D, deck, FILL, G, L

### Community 69 - "20261015120000_plus_sandbox.sql"
Cohesion: 0.25
Nodes (6): public.activate_plus_sandbox(), public.billing_config, public.billing_events, public.entitlements, public.has_plus(), auth.users

### Community 70 - "Costos y salida al mercado — documento de preparación"
Cohesion: 0.18
Nodes (10): 1. Qué usa CINET hoy (verificado en el código), 2. Modelo de ingresos (hipótesis a validar), 3. Costos operativos a estimar (sin cifras inventadas), 4. Obligaciones antes de abrir al público (por revisar con asesoría legal), 5. Salida al mercado (borrador), 6. Decisiones pendientes (de negocio), Costos y salida al mercado — documento de preparación, Duo: lo gratuito y lo que Plus podría ofrecer (propuesta del 2026-10-10, nada activado) (+2 more)

### Community 71 - "Piloto con cines — documento de preparación"
Cohesion: 0.20
Nodes (9): 1. Propuesta de valor para el cine, 2. Alcance del piloto (propuesto), 3. Lo que ya está construido (verificado localmente, no desplegado), 4. Reglas de medición (propuestas), 5. Guía de entrevista (30 min, antes de proponer nada), 6. Responsabilidades (borrador), 7. Borrador de acuerdo — SOLO PARA REVISIÓN HUMANA, 8. Clubes y eventos (+1 more)

### Community 72 - "partners.test.js"
Cohesion: 0.22
Nodes (7): A, A2, B, C, json(), listing(), OP

### Community 73 - "groups.test.js"
Cohesion: 0.22
Nodes (5): A, B, C, D, G

### Community 74 - "duo-eval.mjs"
Cohesion: 0.14
Nodes (11): jaccard(), NETFLIX, person(), root, rows, SCENARIOS, session(), setQuality() (+3 more)

### Community 77 - "ProfileForm.jsx"
Cohesion: 0.28
Nodes (13): AuthForm(), FIELDS, FIELDS, ProfileForm(), hasErrors(), normalizeProfile(), PROFILE_LIMITS, validateEmail() (+5 more)

### Community 78 - "authService.js"
Cohesion: 0.27
Nodes (12): client(), continueAsGuest(), getProfile(), login(), logout(), MESSAGES, register(), toAppUser() (+4 more)

### Community 81 - "DuoModeStep.jsx"
Cohesion: 0.21
Nodes (13): COUNTS, DuoModeStep(), FANS, MARATHON_TYPES, poster(), seatsArt(), SessionTicket(), DuoSummary() (+5 more)

### Community 82 - "Layout.jsx"
Cohesion: 0.22
Nodes (9): AnalyticsConsent(), BrandLogo(), Footer(), Layout(), subscribe(), useNetworkStatus(), analyticsEnabled, getAnalyticsConsent (+1 more)

### Community 83 - "HomePage.jsx"
Cohesion: 0.26
Nodes (8): Icon(), CHAPTERS, POSTERS, DuoSpotlight(), HomeExperiences(), PATHS, DUO_PREFERENCES_KEY, useSceneMotion()

### Community 84 - "data/tmdb.js"
Cohesion: 0.19
Nodes (9): formatDate(), MovieExtras(), WhereToWatch(), genreKeysFor(), genreLabel(), LANGUAGES, regionName(), REGIONS (+1 more)

### Community 85 - "recommender.test.js"
Cohesion: 0.21
Nodes (8): MAX_PEOPLE, diversify(), rankTitles(), group(), person(), rank(), SERIES, session()

### Community 86 - "useToast.js"
Cohesion: 0.24
Nodes (6): App(), router, Toast(), AuthProvider(), ToastContext, ToastProvider()

### Community 87 - "palette.js"
Cohesion: 0.38
Nodes (10): _analyze(), _avg(), _cache, _complement(), FALLBACK, _fromHsv(), _hex(), _hsv() (+2 more)

### Community 88 - "usePrefersReducedMotion.js"
Cohesion: 0.38
Nodes (7): DiceButton(), applyMotionChoice(), setLessMotion(), subscribe(), useLessMotion(), usePrefersReducedMotion(), userChoice()

### Community 89 - "DuoResults.jsx"
Cohesion: 0.39
Nodes (8): COUNT, DuoResults(), learnedText(), learningSummary(), newRound(), groupLiked(), fillBoard(), findSimilar()

### Community 90 - "services.test.js"
Cohesion: 0.39
Nodes (7): PlanGroupPanel(), repeatPlan(), scheduleNextPlan(), setPlanRepeat(), sharePlanWithGroup(), to24h(), toStartParts()

### Community 91 - "MyPlansPage.jsx"
Cohesion: 0.36
Nodes (5): MyPlansPage, PlanStats(), MyPlansPage(), filterPlans(), getPlanStats()

### Community 92 - "DuoSummary.jsx"
Cohesion: 0.36
Nodes (6): genre(), label(), PersonChips(), MARATHON_SCOPES, MODES, SESSION_LENGTHS

### Community 93 - "time-poll.test.js"
Cohesion: 0.29
Nodes (3): A, B, C

## Knowledge Gaps
- **350 isolated node(s):** `store`, `store`, `PORT`, `ROOT`, `TYPES` (+345 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 515 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **5 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `react` to `recommender.js`, `useTitleSearch.js`, `FunctionsPage.jsx`, `package.json`, `tmdbClient.js`, `avatarService.js`, `duo.js`, `DuoRoomPage.jsx`, `csvImport.js`, `planRepository.js`, `useAsync`, `analytics.js`, `useDocumentTitle`, `router.jsx`, `useAuth`, `DuoPage.jsx`, `platforms.js`, `partnerRepository.js`, `useToast`, `DuoPersonStep.jsx`, `PlansPreview.jsx`, `track`, `planService.js`, `PlusPage.jsx`, `PreferencesPanel.jsx`, `ProfileForm.jsx`, `DuoModeStep.jsx`, `Layout.jsx`, `HomePage.jsx`, `useToast.js`, `usePrefersReducedMotion.js`, `DuoResults.jsx`, `services.test.js`, `MyPlansPage.jsx`?**
  _High betweenness centrality (0.207) - this node is a cross-community bridge._
- **Why does `@electric-sql/pglite` connect `plus.test.js` to `package.json`?**
  _High betweenness centrality (0.191) - this node is a cross-community bridge._
- **Why does `auth()` connect `fake-supabase.mjs` to `20261010120000_duo_rooms.sql`, `20261015120000_plus_sandbox.sql`, `20261012120000_groups.sql`, `20261009120000_shared_plans.sql`, `20261014120000_partners.sql`?**
  _High betweenness centrality (0.122) - this node is a cross-community bridge._
- **What connects `store`, `store`, `PORT` to the rest of the system?**
  _350 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `20261010120000_duo_rooms.sql` be split into smaller, more focused modules?**
  _Cohesion score 0.10338680926916222 - nodes in this community are weakly interconnected._
- **Should `recommender.js` be split into smaller, more focused modules?**
  _Cohesion score 0.06127206127206127 - nodes in this community are weakly interconnected._
- **Should `movieService.js` be split into smaller, more focused modules?**
  _Cohesion score 0.08013937282229965 - nodes in this community are weakly interconnected._