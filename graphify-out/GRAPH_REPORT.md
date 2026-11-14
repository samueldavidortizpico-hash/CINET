# Graph Report - CINET  (2026-11-13)

## Corpus Check
- 325 files · ~941,696 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 2124 nodes · 5344 edges · 141 communities (113 shown, 16 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 69 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `a596ad2b`
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
- MoviesPage.jsx
- partnerRepository.js
- duoExperience.js
- vercel.json
- DuoRoomPage.jsx
- duo-eval.mjs
- check-avatar-policies.mjs
- Intervención 2026-10-11 — Claude Code (Claude Opus 5.5) · Entrada de app, panel de cuenta y centro legal
- planRepository.js
- RecapPage.jsx
- public/images/SOURCES.md
- 20261009120000_shared_plans.sql
- CINET: prompt para Claude — continuación, experiencia y crecimiento
- isTmdbEnabled
- tmdbProxy.js
- Prompt de ejecución para Codex: CINET
- DuoSeats.jsx
- fake-supabase.mjs
- CINET: de elegir una película a hacer un plan
- Progreso
- devDependencies
- 20260929024739_create_profiles.sql
- scripts
- react
- dependencies
- react-router-dom
- useToast
- DuoPage.jsx
- platforms.js
- calendar.js
- rooms.test.js
- DuoCommonStep.jsx
- partnerWebhook.js
- PlanPage.jsx
- DuoPersonStep.jsx
- naturalQuery.js
- Copia desde aquí para ejecutar
- HomePage.jsx
- 20261012120000_groups.sql
- CineHub (marca visible: CINET)
- Analítica de producto de CINET
- 20261014120000_partners.sql
- Prompt para Claude: Duo visual, divertido y con mejores recomendaciones
- Duo: ocasiones, decisión breve y siguiente plan
- Funcionalidades principales
- DashboardPage.jsx
- @playwright/test
- PlanContext.jsx
- api.js
- planService.js
- MovieBackdrop.jsx
- ogMeta.js
- tmdbClient.test.js
- 20261013120000_plan_time_poll.sql
- AUDITORÍA FINAL CINET
- DuoNightExperience.jsx
- 20261015120000_plus_sandbox.sql
- Costos y salida al mercado — documento de preparación
- Piloto con cines — documento de preparación
- DuoMarathon.jsx
- HeroCarousel.jsx
- Legal y privacidad — decisiones pendientes (documento interno)
- vite.config.js
- 20261011120000_user_preferences.sql
- AuthPage.jsx
- expo
- public.plans
- duo.js
- Auditoría técnica CINET — diagnóstico inicial
- useDuoSession.js
- groupRepository.js
- recommender.test.js
- db.js
- palette.js
- DuoShortlist.jsx
- Evidencia y hallazgos
- Por hallazgo
- router.jsx
- searchCatalog
- 20261107100000_plan_data_contracts.sql
- concurrency.mjs
- 20261107120000_billing_order_and_quotas.sql
- planContract.js
- PreferencesPanel.jsx
- 20261107110000_org_invitations.sql
- Operación y verificación en staging (auditoría 2026-11-07)
- api.test.js
- contracts.test.js
- Informe técnico — corrección de la segunda auditoría de CINET
- partners.test.js
- ExampleInstrumentedTest.java
- PLAN_REMEDIACION.md
- plusRepository.js
- groups.test.js
- plus.test.js
- PlanTimePoll.jsx
- analytics.js
- rpc
- lua-probe.mjs
- Rendimiento CINET — seguimiento 2026-11-05
- Seguridad CINET — seguimiento 2026-11-05
- Despliegue, promoción y rollback (auditoría H-10)
- 20261105130000_serialize_plan_operations.sql
- time-poll.test.js
- Registro de cambios de auditoría
- smoke.mjs
- api-roles.spec.js
- duo-journey.spec.js
- duo-room.spec.js
- gradlew
- API real de CINET — 2026-11-06
- Matriz de ejecuciÃ³n T01â€“T38
- securityHeaders.test.js
- MainActivity.java
- overrides
- build-e2e.mjs
- Seguridad CINET — 2026-11-06
- public.update_plan
- public.custom_access_token_hook

## God Nodes (most connected - your core abstractions)
1. `react` - 88 edges
2. `useAsync()` - 48 edges
3. `useDocumentTitle()` - 48 edges
4. `useToast()` - 46 edges
5. `react-router-dom` - 44 edges
6. `Button()` - 43 edges
7. `useAuth()` - 43 edges
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

## Communities (141 total, 16 thin omitted)

### Community 0 - "20261010120000_duo_rooms.sql"
Cohesion: 0.10
Nodes (24): pg_publication_tables, public.touch_room, plan_members_touch, public.choose_room_title(), public.close_room_round(), public.create_duo_room(), public.drop_room_member(), public.duo_rooms (+16 more)

### Community 1 - "recommender.js"
Cohesion: 0.10
Nodes (43): item(), profile, excludedIds(), byRank(), calibrationLike(), checkTitle(), clamp01(), closest() (+35 more)

### Community 2 - "fallbackPoster"
Cohesion: 0.15
Nodes (17): DuoFinal(), endTime(), voteOf(), DuoRecommendationCard(), DuoVoteRound(), KEYS, voteOf(), SlideMedia() (+9 more)

### Community 3 - "movieService.js"
Cohesion: 0.09
Nodes (32): ALIASES, BY_TMDB_ID, capitalize(), COLLECTIONS, countryName(), discovered(), favoriteGenres(), favoriteSeeds() (+24 more)

### Community 4 - "FunctionsPage.jsx"
Cohesion: 0.17
Nodes (16): BookingSummary(), AmbienceOptions(), CinemaOptions(), DateOptions(), optionClass(), TimeOptions(), ShowtimeStep(), AMBIENCES (+8 more)

### Community 5 - "package.json"
Cohesion: 0.12
Nodes (17): description, name, private, type, version, @capacitor/android, @capacitor/cli, @capacitor/core (+9 more)

### Community 6 - "duoService.js"
Cohesion: 0.15
Nodes (21): FORMAT_GENRES, SERIES_STATUS, VOTE_POINTS, PLATFORMS, discoverForDuo(), discoverParams(), enrich(), fetchSources() (+13 more)

### Community 7 - "Avatares de CINET"
Cohesion: 0.22
Nodes (8): Archivos de la implementación, Avatares de CINET, Cómo funciona, Estado y alcance, Probar en localhost, Pruebas locales reproducibles, Seguridad, SQL manual en Supabase

### Community 8 - "tmdbClient.js"
Cohesion: 0.11
Nodes (33): ActorPicker(), matchesTitleDetails(), cache, config, CONNECTION_ERRORS, counts, discoverMovies(), discoverTv() (+25 more)

### Community 9 - "Milestone 2 — React Frontend"
Cohesion: 0.20
Nodes (10): Arquitectura, Capa offline (HW07), Cartelera y cadenas de cine, CineHub Duo, Cómo ejecutarlo, Decisiones clave (para la defensa), Milestone 2 — React Frontend, Prototipo anterior (+2 more)

### Community 10 - "MoviesPage.jsx"
Cohesion: 0.11
Nodes (22): MoviesPage, AdvancedFilters(), RATINGS, RUNTIMES, MovieFilters(), DEPARTMENTS, MovieSearch(), thumb() (+14 more)

### Community 11 - "partnerRepository.js"
Cohesion: 0.06
Nodes (66): @supabase/supabase-js, AuthContext, AuthProvider(), PendingPartners(), appUrl(), client(), continueAsGuest(), getProfile() (+58 more)

### Community 12 - "duoExperience.js"
Cohesion: 0.33
Nodes (6): DEFAULT_DUO_SESSION, DEFAULT_PERSON, DUO_OCCASIONS, shortlistItems(), startOccasion(), withAccountTaste()

### Community 13 - "vercel.json"
Cohesion: 0.29
Nodes (6): includeFiles, functions, api/og.js, headers, rewrites, $schema

### Community 14 - "DuoRoomPage.jsx"
Cohesion: 0.09
Nodes (30): Room(), RoomGate(), STATUS_TEXT, useRoomState(), DECK_SIZE, describeResult(), ROOM_VOTES, roomSession() (+22 more)

### Community 15 - "duo-eval.mjs"
Cohesion: 0.08
Nodes (38): RFC-4180, jaccard(), NETFLIX, person(), root, rows, SCENARIOS, session() (+30 more)

### Community 17 - "Intervención 2026-10-11 — Claude Code (Claude Opus 5.5) · Entrada de app, panel de cuenta y centro legal"
Cohesion: 0.06
Nodes (35): AI-LOG — CINET (antes CineHub), Cambios, Cambios, Cambios realizados, Cambios realizados, Cambios realizados, Configuración externa (no se tocó nada remoto), Continuación 2026-10-09/10 · Fase P1 (salas de Duo e invitados) (+27 more)

### Community 18 - "planRepository.js"
Cohesion: 0.12
Nodes (32): PlanGroupPanel(), PlanPage(), useRemotePlan(), acceptInvite(), call(), cancelPlan(), client(), createInvite() (+24 more)

### Community 19 - "RecapPage.jsx"
Cohesion: 0.36
Nodes (6): MONTHS, WEEKDAYS, RecapPage(), buildRecap(), counted(), recapShareText()

### Community 21 - "20261009120000_shared_plans.sql"
Cohesion: 0.16
Nodes (19): pg_catalog.pg_timezone_names, public.accept_plan_invite(), public.cancel_plan(), public.cinet_fail(), public.create_plan(), public.create_plan_invite(), public.delete_plan(), public.is_plan_member() (+11 more)

### Community 22 - "CINET: prompt para Claude — continuación, experiencia y crecimiento"
Cohesion: 0.10
Nodes (19): A1. Corrige los fallos detectados, A2. Completa el recorrido de plan e invitación, A3. Horarios, copy, CI y medición, A. Cierra primero P0: planes reales y confianza, B. Haz social Duo: cada persona desde su celular, C. Personalización y descubrimiento que ahorran tiempo, CINET: prompt para Claude — continuación, experiencia y crecimiento, D. Grupos, familias y planes completos (+11 more)

### Community 23 - "isTmdbEnabled"
Cohesion: 0.20
Nodes (13): COLLECTIONS, generatedAt, snapshot, CinemaPage, DuoSeenStep(), findTitles(), popularTitles(), CinemaPage() (+5 more)

### Community 24 - "tmdbProxy.js"
Cohesion: 0.13
Nodes (20): ipOptions, apiNodeHandler(), APPEND, clientIp(), clientIpOptions(), createTmdbAccess(), createTmdbProxy(), createUpstashRateLimiter() (+12 more)

### Community 25 - "Prompt de ejecución para Codex: CINET"
Cohesion: 0.12
Nodes (16): 1A. TMDB en servidor, 1B. Persistencia compartida y permisos, 1C. Honestidad y entrega continua, Entregables y condición de cierre, Estado de partida que debes revalidar, Fase 0. Auditoría y contratos, Fase 1. Base segura y un plan realmente compartido, Fase 2. Duo desde cada celular (+8 more)

### Community 26 - "DuoSeats.jsx"
Cohesion: 0.18
Nodes (13): DiceButton(), Availability(), CRITERIA, fitState(), hitText(), ORDER, SeatFit(), short() (+5 more)

### Community 27 - "fake-supabase.mjs"
Cohesion: 0.14
Nodes (30): addUser(), api, asValue(), auth(), authUser(), b64(), exclusive(), filters() (+22 more)

### Community 28 - "CINET: de elegir una película a hacer un plan"
Cohesion: 0.18
Nodes (10): 1. La apuesta, 2. Lo que el código ya ofrece, 3. Las ideas prioritarias, 4. Cómo puede crecer, 5. La oferta para los cines, 6. Ingresos, en orden de validación, 7. Qué medir y qué significa, 8. Orden de ejecución (+2 more)

### Community 29 - "Progreso"
Cohesion: 0.04
Nodes (43): 1. Lo que ya existe (verificado en el código y con E2E local), 2. Por qué Capacitor y no reescribir, 3. Bloqueos a resolver ANTES de empaquetar, 4. Pasos (para cuando se autorice; no ejecutados), 5. Publicación (requiere decisión y cuentas de la persona responsable), 6. Orden recomendado, CINET en el celular: PWA hoy, Android con Capacitor después, 1. Auditoría breve (estado antes de editar) (+35 more)

### Community 30 - "devDependencies"
Cohesion: 0.17
Nodes (12): devDependencies, @capacitor/cli, @electric-sql/pglite, eslint, @eslint/js, eslint-plugin-react-hooks, eslint-plugin-react-refresh, globals (+4 more)

### Community 31 - "20260929024739_create_profiles.sql"
Cohesion: 0.22
Nodes (6): public.handle_new_user, public.profiles_before_update, on_auth_user_created, profiles_before_update, public.profiles, auth.users

### Community 32 - "scripts"
Cohesion: 0.15
Nodes (13): scripts, apk, build, catalog:snapshot, dev, eas-build-post-install, lint, pretest:e2e (+5 more)

### Community 33 - "react"
Cohesion: 0.17
Nodes (14): react, PartnerPage, PartnerListings(), updated(), CollectionSection(), useAsync(), TOOLS, findTitles() (+6 more)

### Community 34 - "dependencies"
Cohesion: 0.25
Nodes (8): dependencies, @capacitor/android, @capacitor/core, qrcode-generator, react, react-dom, react-router-dom, @supabase/supabase-js

### Community 35 - "react-router-dom"
Cohesion: 0.27
Nodes (8): react-router-dom, GroupsPage, Button(), EmptyState(), GroupList(), GroupsPage(), JoinGroup(), names()

### Community 39 - "useToast"
Cohesion: 0.22
Nodes (14): AvatarUpload(), ProfileCard(), ROLE_LABELS, FIELDS, ProfileForm(), UserAvatar(), LINKS, STAFF_LINKS (+6 more)

### Community 40 - "DuoPage.jsx"
Cohesion: 0.16
Nodes (21): DuoPersonStep(), DuoSummary(), personName(), stepsFor(), candidatesKey(), DuoPage(), FRESH_RESULTS, NEEDS_CANDIDATES (+13 more)

### Community 41 - "platforms.js"
Cohesion: 0.13
Nodes (11): Modal(), formatDate(), MovieExtras(), WhereToWatch(), LOGOS, PlatformLogo(), TrailerModal(), WatchModal() (+3 more)

### Community 42 - "calendar.js"
Cohesion: 0.26
Nodes (11): RFC-5545, displayZone(), downloadIcs(), escapeText(), fold(), pad(), planStart(), planToIcs() (+3 more)

### Community 43 - "rooms.test.js"
Cohesion: 0.17
Nodes (8): A, B, C, D, deck, FILL, G, L

### Community 44 - "DuoCommonStep.jsx"
Cohesion: 0.26
Nodes (13): DuoCommonStep(), limitsOf(), names(), toneNames(), valueLabel(), DuoEmptyState(), REASONS, SeatAvatar() (+5 more)

### Community 45 - "partnerWebhook.js"
Cohesion: 0.13
Nodes (30): handle, handler(), store, handle, handler(), secrets(), store, createBillingWebhook() (+22 more)

### Community 46 - "PlanPage.jsx"
Cohesion: 0.21
Nodes (16): SkeletonRow(), MovieActions(), LIKED, LIKED_TEXT, PlanAfterglow(), RsvpPanel(), useDuoHistory(), useLocalStorage() (+8 more)

### Community 47 - "DuoPersonStep.jsx"
Cohesion: 0.11
Nodes (22): Chip(), ChoiceChips(), Question(), GENRE_INTENTS, GenreEditor(), genreState(), PLACEHOLDERS, STATE_MARK (+14 more)

### Community 48 - "naturalQuery.js"
Cohesion: 0.17
Nodes (16): CHAPTERS, DuoIntro(), POSTERS, useSceneMotion(), describeQuery(), GENRE_WORDS, genreName(), MOOD_WORDS (+8 more)

### Community 49 - "Copia desde aquí para ejecutar"
Cohesion: 0.15
Nodes (13): 10. Orden de entregas y aceptación, 11. Evaluación de recomendación y UX, 12. Pruebas y condición de cierre, 1. La experiencia que vamos a construir, 2. Dirección visual: transformar el recorrido, 3. Movimiento y diversión con propósito, 4. Aprender gustos con películas, sin convertirlo en examen, 5. Mejorar el motor: corrección, señales y tres propuestas como conjunto (+5 more)

### Community 50 - "HomePage.jsx"
Cohesion: 0.29
Nodes (8): FaqItem(), FaqSection(), DuoSpotlight(), HomeExperiences(), PATHS, FAQ, useReveal(), HomePage()

### Community 51 - "20261012120000_groups.sql"
Cohesion: 0.14
Nodes (15): public.accept_group_invite(), public.create_group(), public.create_group_invite(), public.group_invites, public.group_members, public.group_owned(), public.groups, public.is_group_member() (+7 more)

### Community 52 - "CineHub (marca visible: CINET)"
Cohesion: 0.20
Nodes (10): CineHub (marca visible: CINET), Figma, Invitado, Justificación de la aplicación web, Organizador del plan, Problema, Restricciones del proyecto (verificadas), Roles de usuario (+2 more)

### Community 53 - "Analítica de producto de CINET"
Cohesion: 0.25
Nodes (7): Analítica de producto de CINET, Envío, Estado, Eventos, Métricas que permite, Principios, Retención y borrado (política propuesta, la confirma quien opere el servicio)

### Community 54 - "20261014120000_partners.sql"
Cohesion: 0.17
Nodes (14): public.attribution_events, public.can_publish(), public.is_platform_admin(), public.listings, public.offers, public.org_audit, public.org_is_verified(), public.org_members (+6 more)

### Community 55 - "Prompt para Claude: Duo visual, divertido y con mejores recomendaciones"
Cohesion: 0.33
Nodes (3): Diagnóstico previo: qué necesita cambiar, Fuentes y alcance de las propuestas, Prompt para Claude: Duo visual, divertido y con mejores recomendaciones

### Community 56 - "Duo: ocasiones, decisión breve y siguiente plan"
Cohesion: 0.33
Nodes (6): Archivos principales, Cómo revisar, Duo: ocasiones, decisión breve y siguiente plan, Evidencia local, Ideas siguientes, ordenadas por valor, Problema y resultado

### Community 57 - "Funcionalidades principales"
Cohesion: 0.33
Nodes (6): 1. Buscar y explorar películas, 2. Consultar una película y sus funciones, 3. Crear un plan, 4. Consultar un plan, 5. Responder a un plan, Funcionalidades principales

### Community 58 - "DashboardPage.jsx"
Cohesion: 0.38
Nodes (7): MovieGrid(), CinephileProfile(), useFavorites(), DashboardPage(), getMoviesByIds(), getTasteStats(), loadMoviesByIds()

### Community 60 - "PlanContext.jsx"
Cohesion: 0.15
Nodes (17): App(), router, asList(), PlanContext, PlanProvider(), ToastContext, ToastProvider(), listeners (+9 more)

### Community 61 - "api.js"
Cohesion: 0.19
Nodes (26): API_ROUTES, appRole(), authenticate(), captcha(), createApi(), getPlan(), HttpError, invalid() (+18 more)

### Community 62 - "planService.js"
Cohesion: 0.17
Nodes (20): CreatePlanPage, PlansPreview(), PlanCard(), EMPTY, PlanForm(), PlanHero(), PlanStats(), PlanSummary() (+12 more)

### Community 63 - "MovieBackdrop.jsx"
Cohesion: 1.00
Nodes (3): createParticles(), MovieBackdrop(), prefersReducedMotion()

### Community 64 - "ogMeta.js"
Cohesion: 0.25
Nodes (9): clip(), createOgHandler(), DEFAULT, escapeHtml(), injectMeta(), ogFor(), PRIVATE, publicTitle() (+1 more)

### Community 65 - "tmdbClient.test.js"
Cohesion: 0.19
Nodes (11): LABELS, TmdbStatus(), checkTmdbConnection(), configureTmdb(), getTmdbStatus(), subscribeTmdbStatus(), connect(), fakeApi() (+3 more)

### Community 66 - "20261013120000_plan_time_poll.sql"
Cohesion: 0.24
Nodes (10): plan_time_options_touch, plan_time_votes_touch, public.choose_plan_time(), public.owned_active_plan(), public.plan_time_options, public.plan_time_votes, public.propose_plan_times(), auth.users (+2 more)

### Community 67 - "AUDITORÍA FINAL CINET"
Cohesion: 0.08
Nodes (23): 10. HW12 — MongoDB/Mongoose, 11. HW13 — Full stack y autenticación, 12. HW15 — Seguridad, 13. Problemas y correcciones, 14. Archivos modificados y añadidos, 15. Resultados de validación, 16. Despliegue y variables pendientes, 17. Intervención y autorización necesarias (+15 more)

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

### Community 72 - "DuoMarathon.jsx"
Cohesion: 0.29
Nodes (14): clock(), DuoMarathon(), buildMarathon(), byRelease(), chooseNext(), describeMarathon(), minutesOf(), preferStrict() (+6 more)

### Community 73 - "HeroCarousel.jsx"
Cohesion: 0.21
Nodes (12): HeroCarousel(), SCENE_COLORS, shorten(), useSceneVisibility(), getHeroPreferences(), HERO_PREFERENCES_KEY, getHeroSlides(), getMovieById() (+4 more)

### Community 74 - "Legal y privacidad — decisiones pendientes (documento interno)"
Cohesion: 0.29
Nodes (6): Aceptación, «Acerca de» retirado, Cobros: qué falta antes de activar pagos, Cómo se redactaron, Decisiones que necesitan una persona responsable, Legal y privacidad — decisiones pendientes (documento interno)

### Community 77 - "AuthPage.jsx"
Cohesion: 0.06
Nodes (52): AuthForm(), FIELD_NAMES, TEXT_FIELDS, Captcha(), loadTurnstile(), CAPTCHA_MISSING, captchaEnabled, TURNSTILE_SITE_KEY (+44 more)

### Community 78 - "expo"
Cohesion: 0.40
Nodes (4): projectId, expo, extra, eas

### Community 81 - "duo.js"
Cohesion: 0.09
Nodes (31): DuoModeStep(), FANS, MARATHON_TYPES, poster(), seatsArt(), SessionTicket(), DuoProgress(), genre() (+23 more)

### Community 82 - "Auditoría técnica CINET — diagnóstico inicial"
Cohesion: 0.11
Nodes (18): AD — planes, identidad y datos, API — proxy TMDB y operación, Auditoría técnica CINET — diagnóstico inicial, Calidad y riesgos residuales, Cierre de esta ejecución, Compatibilidad y estado del checkout, Correcciones locales y evidencia, FE — búsqueda, Duo, accesibilidad y persistencia (+10 more)

### Community 83 - "useDuoSession.js"
Cohesion: 0.29
Nodes (17): CALIBRATION_ANSWERS, DEFAULT_MARATHON, asList(), asMarathon(), asMarathonPlan(), asNumber(), asPerson(), asRound() (+9 more)

### Community 84 - "groupRepository.js"
Cohesion: 0.22
Nodes (17): acceptInvite(), call(), client(), createGroup(), createInvite(), deleteGroup(), getGroup(), groupPlans() (+9 more)

### Community 85 - "recommender.test.js"
Cohesion: 0.15
Nodes (16): COUNT, DuoResults(), learnedText(), learningSummary(), newRound(), groupLiked(), fillBoard(), findSimilar() (+8 more)

### Community 86 - "db.js"
Cohesion: 0.21
Nodes (8): users, applyMigrations(), asAdmin(), createDb(), createUsers(), errorCode(), MIGRATIONS, ANON_READABLE

### Community 87 - "palette.js"
Cohesion: 0.38
Nodes (10): _analyze(), _avg(), _cache, _complement(), FALLBACK, _fromHsv(), _hex(), _hsv() (+2 more)

### Community 88 - "DuoShortlist.jsx"
Cohesion: 0.19
Nodes (14): PosterImage(), answerOf(), DuoCalibration(), loadDeck(), snapshot(), suggestions(), availabilityText(), COUNT (+6 more)

### Community 89 - "Evidencia y hallazgos"
Cohesion: 0.12
Nodes (16): Auditoría de seguridad y operación de CINET para Claude, Evidencia que falta antes de declarar cierre, Evidencia y hallazgos, H-01 — Perfil consultable públicamente (P1), H-02 — Modelo de acceso por UUID, dueño y membresía (P1), H-03 — Realtime y datos indirectos (P1, verificar en staging), H-04 — Caducidad de recuperación, confirmación y rate limits de Auth (P1, configuración remota pendiente), H-05 — Endpoints, secretos y disponibilidad pública (P1) (+8 more)

### Community 90 - "Por hallazgo"
Cohesion: 0.12
Nodes (16): Evidencia local (2026-11-13), H-01 Perfiles públicos (P1) → corregido, H-02 Matriz de acceso y SECURITY DEFINER (P1) → invariantes automáticas, H-03 Realtime (P1, staging), H-04 Auth: recuperación, confirmación, CAPTCHA (P1) → corregido en código y config local, H-05 Secretos (P1) → **acción tuya pendiente**, H-06 Validación y XSS (P1 defensa en profundidad) → corregido, H-07 Paginación y límites (P1) → corregido (+8 more)

### Community 91 - "router.jsx"
Cohesion: 0.07
Nodes (39): AdminPage, CinemaTicketsPage, DashboardPage, DuoPage, DuoRoomPage, FunctionsPage, ImportPage, InvitePage (+31 more)

### Community 92 - "searchCatalog"
Cohesion: 0.23
Nodes (12): search(), applySearchError(), EMPTY, mergeSearchPage(), unique(), useTitleSearch(), hasFilters(), isAdvancedActive() (+4 more)

### Community 93 - "20261107100000_plan_data_contracts.sql"
Cohesion: 0.16
Nodes (5): public.plan_contract_repair(), public.share_plan_with_group(), public.group_members, public.plan_members, public.plans

### Community 95 - "concurrency.mjs"
Cohesion: 0.18
Nodes (8): BOOTSTRAP, admin, asUser(), conn(), open(), results, server, U

### Community 96 - "20261107120000_billing_order_and_quotas.sql"
Cohesion: 0.15
Nodes (9): public.duo_rooms, public.group_invites, public.groups, public.accept_group_invite(), public.billing_state, public.create_duo_room(), auth.users, public.group_members (+1 more)

### Community 97 - "planContract.js"
Cohesion: 0.35
Nodes (12): decodeDetails(), decodeMarathon(), decodePlace(), decodeTitle(), httpUrl(), isObject(), number(), scalar() (+4 more)

### Community 98 - "PreferencesPanel.jsx"
Cohesion: 0.35
Nodes (10): EMPTY, PreferencesForm(), PreferencesPanel(), useAccountPreferences(), toPlanError(), accountPreferencesAvailable(), deleteMyPreferences(), exportPreferences() (+2 more)

### Community 99 - "20261107110000_org_invitations.sql"
Cohesion: 0.26
Nodes (7): public.accept_org_invite(), public.list_my_org_invites(), public.my_email_hash(), public.org_invites, public.revoke_org_invite(), auth.users, public.organizations

### Community 100 - "Operación y verificación en staging (auditoría 2026-11-07)"
Cohesion: 0.18
Nodes (10): 0. Orden de aplicación de migraciones (staging primero, con respaldo), Cobros reales (N05), N06/N07 · Redis real (V15–V19), N16 · Identidad por IP, N17 · Realtime y eventos DELETE, N19 · Dependencias, N20 · Android (V49), N21 · GitHub Actions (+2 more)

### Community 101 - "api.test.js"
Cohesion: 0.24
Nodes (10): ADMIN, ADMIN_TOKEN, b64(), fakeSupabase(), FORGED, jwt(), reply(), setup() (+2 more)

### Community 102 - "contracts.test.js"
Cohesion: 0.22
Nodes (8): A, factoryInstantBefore, fixturePlanWithGroup(), legacy, many, plan(), as(), hasPlus()

### Community 103 - "Informe técnico — corrección de la segunda auditoría de CINET"
Cohesion: 0.20
Nodes (9): A. Resumen ejecutivo, B. Matriz de los 24 hallazgos, C. Seguimiento de los 36 hallazgos anteriores, D. Cambios realizados, E. Resultados de pruebas, F. Pendientes de infraestructura, G. Recomendación de liberación, Informe técnico — corrección de la segunda auditoría de CINET (+1 more)

### Community 104 - "partners.test.js"
Cohesion: 0.22
Nodes (7): A, A2, B, C, json(), listing(), OP

### Community 105 - "ExampleInstrumentedTest.java"
Cohesion: 0.33
Nodes (5): ExampleInstrumentedTest, ExampleUnitTest, androidx.test.ext.junit.runners.AndroidJUnit4, org.junit.runner.RunWith, org.junit.Test

### Community 106 - "PLAN_REMEDIACION.md"
Cohesion: 0.22
Nodes (8): Evidencia final, Hecho en el checkout local, Pendiente externo o de entorno, Plan priorizado de remediación CINET, Responsables sugeridos, Secuencia sugerida, Seguimiento 2026-11-05, Seguimiento de estabilización — 2026-11-05

### Community 107 - "plusRepository.js"
Cohesion: 0.36
Nodes (8): day(), Status(), call(), cancelPlusSandbox(), getPlusStatus(), PLUS_PRICE_COP, rows(), startPlusSandbox()

### Community 108 - "groups.test.js"
Cohesion: 0.22
Nodes (5): A, B, C, D, G

### Community 109 - "plus.test.js"
Cohesion: 0.31
Nodes (7): A, adminRows(), asService(), B, G, json(), rows()

### Community 110 - "PlanTimePoll.jsx"
Cohesion: 0.46
Nodes (7): PlanTimePoll(), toISODate(), chooseTime(), clearTimes(), listTimeOptions(), proposeTimes(), toggleTimeVote()

### Community 111 - "analytics.js"
Cohesion: 0.32
Nodes (4): analytics, createAnalytics(), EVENTS, sanitize()

### Community 112 - "rpc"
Cohesion: 0.29
Nodes (6): rpc(), createPlan(), newPlan(), billing(), save(), vote()

### Community 113 - "lua-probe.mjs"
Cohesion: 0.38
Nodes (4): evalScript(), makeRedis(), run(), seq

### Community 114 - "Rendimiento CINET — seguimiento 2026-11-05"
Cohesion: 0.29
Nodes (6): Cierre de mediciones, Controles añadidos, Línea base y resultado local, Medición pendiente, Rendimiento CINET — seguimiento 2026-11-05, Seguimiento de rendimiento — 2026-11-05

### Community 115 - "Seguridad CINET — seguimiento 2026-11-05"
Cohesion: 0.29
Nodes (6): Cierre de verificación, Pendiente de plataforma, Pendiente de Supabase staging, Seguimiento de seguridad — 2026-11-05, Seguridad CINET — seguimiento 2026-11-05, Verificado localmente

### Community 116 - "Despliegue, promoción y rollback (auditoría H-10)"
Cohesion: 0.29
Nodes (6): 1. Fase preview / staging, 2. Promoción a producción, 3. Rollback, 4. Backup y restauración (por probar), 5. Secretos, Despliegue, promoción y rollback (auditoría H-10)

### Community 117 - "20261105130000_serialize_plan_operations.sql"
Cohesion: 0.43
Nodes (6): public.plan_invites, public.accept_plan_invite(), public.cancel_plan(), public.create_plan_invite(), public.set_plan_rsvp(), public.plans

### Community 118 - "time-poll.test.js"
Cohesion: 0.29
Nodes (3): A, B, C

### Community 119 - "Registro de cambios de auditoría"
Cohesion: 0.33
Nodes (5): 2026-11-05 — diagnóstico inicial, Estado final de la continuación — 2026-11-05, Registro de cambios de auditoría, Seguimiento de cambios — 2026-11-05 (segunda etapa), Seguimiento de estabilización — 2026-11-05 (continuación)

### Community 124 - "gradlew"
Cohesion: 0.83
Nodes (3): gradlew script, die(), warn()

### Community 125 - "API real de CINET — 2026-11-06"
Cohesion: 0.50
Nodes (3): API real de CINET — 2026-11-06, Arquitectura y contrato, Verificación

### Community 126 - "Matriz de ejecuciÃ³n T01â€“T38"
Cohesion: 0.50
Nodes (3): Cobertura adicional de comandos, Matriz de ejecuciÃ³n T01â€“T38, Seguimiento de esta continuaciÃ³n

### Community 129 - "overrides"
Cohesion: 0.67
Nodes (3): overrides, minimatch, rimraf

## Knowledge Gaps
- **516 isolated node(s):** `store`, `store`, `ipOptions`, `projectId`, `server` (+511 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 751 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **16 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `react` to `recommender.js`, `fallbackPoster`, `FunctionsPage.jsx`, `package.json`, `MoviesPage.jsx`, `partnerRepository.js`, `DuoRoomPage.jsx`, `duo-eval.mjs`, `planRepository.js`, `RecapPage.jsx`, `isTmdbEnabled`, `DuoSeats.jsx`, `react-router-dom`, `useToast`, `DuoPage.jsx`, `platforms.js`, `PlanPage.jsx`, `DuoPersonStep.jsx`, `naturalQuery.js`, `HomePage.jsx`, `DashboardPage.jsx`, `PlanContext.jsx`, `planService.js`, `MovieBackdrop.jsx`, `tmdbClient.test.js`, `DuoNightExperience.jsx`, `DuoMarathon.jsx`, `HeroCarousel.jsx`, `AuthPage.jsx`, `duo.js`, `useDuoSession.js`, `recommender.test.js`, `DuoShortlist.jsx`, `router.jsx`, `searchCatalog`, `PreferencesPanel.jsx`, `PlanTimePoll.jsx`?**
  _High betweenness centrality (0.112) - this node is a cross-community bridge._
- **Why does `auth()` connect `fake-supabase.mjs` to `20261010120000_duo_rooms.sql`, `20261015120000_plus_sandbox.sql`, `20261012120000_groups.sql`, `20261009120000_shared_plans.sql`, `20261014120000_partners.sql`?**
  _High betweenness centrality (0.091) - this node is a cross-community bridge._
- **Why does `react-router-dom` connect `react-router-dom` to `recommender.js`, `fallbackPoster`, `FunctionsPage.jsx`, `package.json`, `MoviesPage.jsx`, `DuoRoomPage.jsx`, `duo-eval.mjs`, `planRepository.js`, `RecapPage.jsx`, `isTmdbEnabled`, `DuoSeats.jsx`, `useToast`, `DuoPage.jsx`, `platforms.js`, `PlanPage.jsx`, `HomePage.jsx`, `DashboardPage.jsx`, `PlanContext.jsx`, `planService.js`, `DuoMarathon.jsx`, `HeroCarousel.jsx`, `AuthPage.jsx`, `DuoShortlist.jsx`, `router.jsx`?**
  _High betweenness centrality (0.032) - this node is a cross-community bridge._
- **What connects `store`, `store`, `ipOptions` to the rest of the system?**
  _516 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `20261010120000_duo_rooms.sql` be split into smaller, more focused modules?**
  _Cohesion score 0.10338680926916222 - nodes in this community are weakly interconnected._
- **Should `recommender.js` be split into smaller, more focused modules?**
  _Cohesion score 0.09840425531914894 - nodes in this community are weakly interconnected._
- **Should `movieService.js` be split into smaller, more focused modules?**
  _Cohesion score 0.09009009009009009 - nodes in this community are weakly interconnected._