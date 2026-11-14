# Graph Report - CINET  (2026-11-13)

## Corpus Check
- 321 files · ~292,175 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 2059 nodes · 5325 edges · 131 communities (101 shown, 17 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 68 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `24bc1454`
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
- duo.js
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
- catalog-snapshot.mjs
- tmdbProxy.js
- Prompt de ejecución para Codex: CINET
- DuoResults.jsx
- fake-supabase.mjs
- CINET: de elegir una película a hacer un plan
- Progreso
- devDependencies
- 20260929024739_create_profiles.sql
- scripts
- useAsync
- dependencies
- usePlans
- react
- DuoPage.jsx
- platforms.js
- calendar.js
- rooms.test.js
- commands.js
- partnerWebhook.js
- useToast
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
- TmdbStatus.jsx
- @playwright/test
- PlanContext.jsx
- api.js
- planService.js
- MovieDetailPage.jsx
- showtimeService.js
- tmdbClient.test.js
- 20261013120000_plan_time_poll.sql
- DuoFinal.jsx
- nightExperience.js
- 20261015120000_plus_sandbox.sql
- Costos y salida al mercado — documento de preparación
- Piloto con cines — documento de preparación
- DuoMarathon.jsx
- HeroCarousel.jsx
- Legal y privacidad — decisiones pendientes (documento interno)
- Auditoría de seguridad de CINET — 2026-11-10
- 20261011120000_user_preferences.sql
- AuthPage.jsx
- expo
- public.plans
- DuoModeStep.jsx
- billing-order.test.js
- useDuoSession.js
- groupRepository.js
- recommender.test.js
- db.js
- palette.js
- DuoSeats.jsx
- Evidencia y hallazgos
- Por hallazgo
- router.jsx
- isTmdbEnabled
- 20261107100000_plan_data_contracts.sql
- createDb
- 20261110140000_plan_place_url.sql
- 20261107120000_billing_order_and_quotas.sql
- planContract.js
- 20261110130000_partner_url_openable.sql
- 20261107110000_org_invitations.sql
- Operación y verificación en staging (auditoría 2026-11-07)
- contracts.test.js
- partners.test.js
- ExampleInstrumentedTest.java
- supabaseClient.js
- groups.test.js
- plus.test.js
- as
- Despliegue, promoción y rollback (auditoría H-10)
- 20261105130000_serialize_plan_operations.sql
- time-poll.test.js
- smoke.mjs
- api-roles.spec.js
- duo-journey.spec.js
- duo-room.spec.js
- gradlew
- securityHeaders.test.js
- MainActivity.java
- overrides
- build-e2e.mjs
- public.update_plan
- public.custom_access_token_hook

## God Nodes (most connected - your core abstractions)
1. `react` - 87 edges
2. `useAsync()` - 48 edges
3. `useDocumentTitle()` - 48 edges
4. `useToast()` - 46 edges
5. `useAuth()` - 45 edges
6. `react-router-dom` - 44 edges
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

## Communities (131 total, 17 thin omitted)

### Community 0 - "20261010120000_duo_rooms.sql"
Cohesion: 0.10
Nodes (24): pg_publication_tables, public.touch_room, plan_members_touch, public.choose_room_title(), public.close_room_round(), public.create_duo_room(), public.drop_room_member(), public.duo_rooms (+16 more)

### Community 1 - "recommender.js"
Cohesion: 0.09
Nodes (44): item(), profile, byRank(), calibrated(), calibrationLike(), capitalize(), checkTitle(), clamp01() (+36 more)

### Community 2 - "fallbackPoster"
Cohesion: 0.18
Nodes (14): DuoRecommendationCard(), DuoVoteRound(), KEYS, voteOf(), SlideMedia(), MovieDetailPoster(), MovieCard(), MoviePoster() (+6 more)

### Community 3 - "movieService.js"
Cohesion: 0.08
Nodes (33): WEEKDAYS, ALIASES, BY_TMDB_ID, capitalize(), COLLECTIONS, countryName(), discovered(), favoriteGenres() (+25 more)

### Community 4 - "FunctionsPage.jsx"
Cohesion: 0.14
Nodes (17): Button(), BookingSummary(), AmbienceOptions(), CinemaOptions(), DateOptions(), optionClass(), TimeOptions(), ShowtimeStep() (+9 more)

### Community 5 - "package.json"
Cohesion: 0.12
Nodes (17): description, name, private, type, version, @capacitor/android, @capacitor/cli, @capacitor/core (+9 more)

### Community 6 - "duoService.js"
Cohesion: 0.27
Nodes (15): discoverForDuo(), discoverParams(), enrich(), fetchSources(), genreIds(), mergeTitlesById(), pairSources(), sagaParts() (+7 more)

### Community 7 - "Avatares de CINET"
Cohesion: 0.22
Nodes (8): Archivos de la implementación, Avatares de CINET, Cómo funciona, Estado y alcance, Probar en localhost, Pruebas locales reproducibles, Seguridad, SQL manual en Supabase

### Community 8 - "tmdbClient.js"
Cohesion: 0.11
Nodes (33): listOf(), matchesTitleDetails(), cache, config, CONNECTION_ERRORS, counts, discoverMovies(), discoverTv() (+25 more)

### Community 9 - "Milestone 2 — React Frontend"
Cohesion: 0.20
Nodes (10): Arquitectura, Capa offline (HW07), Cartelera y cadenas de cine, CineHub Duo, Cómo ejecutarlo, Decisiones clave (para la defensa), Milestone 2 — React Frontend, Prototipo anterior (+2 more)

### Community 10 - "MoviesPage.jsx"
Cohesion: 0.13
Nodes (18): MoviesPage, AdvancedFilters(), RATINGS, RUNTIMES, MovieFilters(), INITIAL_FILTERS, MovieContext, LANGUAGES (+10 more)

### Community 11 - "partnerRepository.js"
Cohesion: 0.16
Nodes (30): PlanHero(), PendingPartners(), acceptOrgInvite(), addListing(), addOffer(), addVenue(), audit(), db() (+22 more)

### Community 12 - "duo.js"
Cohesion: 0.13
Nodes (18): DuoProgress(), CALIBRATION_ANSWERS, DEFAULT_DUO_SESSION, DEFAULT_MARATHON, DEFAULT_PERSON, DUO_HISTORY_KEY, DUO_PREFERENCES_KEY, DUO_SCENES (+10 more)

### Community 13 - "vercel.json"
Cohesion: 0.29
Nodes (6): includeFiles, functions, api/og.js, headers, rewrites, $schema

### Community 14 - "DuoRoomPage.jsx"
Cohesion: 0.07
Nodes (40): DuoRoomPage, EMPTY, PreferencesForm(), PreferencesPanel(), TasteFields(), toggleGenre(), useAccountPreferences(), Room() (+32 more)

### Community 15 - "duo-eval.mjs"
Cohesion: 0.08
Nodes (40): RFC-4180, jaccard(), NETFLIX, person(), root, rows, SCENARIOS, session() (+32 more)

### Community 17 - "Intervención 2026-10-11 — Claude Code (Claude Opus 5.5) · Entrada de app, panel de cuenta y centro legal"
Cohesion: 0.06
Nodes (35): AI-LOG — CINET (antes CineHub), Cambios, Cambios, Cambios realizados, Cambios realizados, Cambios realizados, Configuración externa (no se tocó nada remoto), Continuación 2026-10-09/10 · Fase P1 (salas de Duo e invitados) (+27 more)

### Community 18 - "planRepository.js"
Cohesion: 0.12
Nodes (35): PlanGroupPanel(), PlanTimePoll(), PlanPage(), useRemotePlan(), acceptInvite(), call(), cancelPlan(), chooseTime() (+27 more)

### Community 19 - "RecapPage.jsx"
Cohesion: 0.36
Nodes (6): RecapPage, MONTHS, RecapPage(), buildRecap(), counted(), recapShareText()

### Community 21 - "20261009120000_shared_plans.sql"
Cohesion: 0.16
Nodes (19): pg_catalog.pg_timezone_names, public.accept_plan_invite(), public.cancel_plan(), public.cinet_fail(), public.create_plan(), public.create_plan_invite(), public.delete_plan(), public.is_plan_member() (+11 more)

### Community 22 - "CINET: prompt para Claude — continuación, experiencia y crecimiento"
Cohesion: 0.10
Nodes (19): A1. Corrige los fallos detectados, A2. Completa el recorrido de plan e invitación, A3. Horarios, copy, CI y medición, A. Cierra primero P0: planes reales y confianza, B. Haz social Duo: cada persona desde su celular, C. Personalización y descubrimiento que ahorran tiempo, CINET: prompt para Claude — continuación, experiencia y crecimiento, D. Grupos, familias y planes completos (+11 more)

### Community 23 - "catalog-snapshot.mjs"
Cohesion: 0.40
Nodes (3): COLLECTIONS, generatedAt, snapshot

### Community 24 - "tmdbProxy.js"
Cohesion: 0.07
Nodes (31): ipOptions, vite, @vitejs/plugin-react, apiNodeHandler(), clip(), createOgHandler(), DEFAULT, escapeHtml() (+23 more)

### Community 25 - "Prompt de ejecución para Codex: CINET"
Cohesion: 0.12
Nodes (16): 1A. TMDB en servidor, 1B. Persistencia compartida y permisos, 1C. Honestidad y entrega continua, Entregables y condición de cierre, Estado de partida que debes revalidar, Fase 0. Auditoría y contratos, Fase 1. Base segura y un plan realmente compartido, Fase 2. Duo desde cada celular (+8 more)

### Community 26 - "DuoResults.jsx"
Cohesion: 0.24
Nodes (10): DiceButton(), COUNT, DuoResults(), learnedText(), learningSummary(), newRound(), groupLiked(), fillBoard() (+2 more)

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

### Community 33 - "useAsync"
Cohesion: 0.22
Nodes (11): PartnerPage, PartnerListings(), updated(), useAsync(), JoinGroup(), OrgPanel(), PartnerPage(), ReceivedInvites() (+3 more)

### Community 34 - "dependencies"
Cohesion: 0.25
Nodes (8): dependencies, @capacitor/android, @capacitor/core, qrcode-generator, react, react-dom, react-router-dom, @supabase/supabase-js

### Community 35 - "usePlans"
Cohesion: 0.23
Nodes (9): InvitePage, MyPlansPage, EmptyState(), Loading(), RouteError(), usePlans(), InvitePage(), MyPlansPage() (+1 more)

### Community 39 - "react"
Cohesion: 0.13
Nodes (25): react, react-router-dom, DashboardPage, PlusPage, AvatarUpload(), ProfileCard(), ROLE_LABELS, FIELDS (+17 more)

### Community 40 - "DuoPage.jsx"
Cohesion: 0.13
Nodes (25): DuoPage, stepsFor(), candidatesKey(), DuoPage(), FRESH_RESULTS, NEEDS_CANDIDATES, DUO_OCCASIONS, mergeRoundVotes() (+17 more)

### Community 41 - "platforms.js"
Cohesion: 0.17
Nodes (10): formatDate(), MovieExtras(), WhereToWatch(), LOGOS, PlatformLogo(), WatchModal(), withAvailability(), OFFER_TYPES (+2 more)

### Community 42 - "calendar.js"
Cohesion: 0.25
Nodes (12): RFC-5545, displayZone(), to24h(), downloadIcs(), escapeText(), fold(), pad(), planStart() (+4 more)

### Community 43 - "rooms.test.js"
Cohesion: 0.17
Nodes (8): A, B, C, D, deck, FILL, G, L

### Community 44 - "commands.js"
Cohesion: 0.18
Nodes (12): availableCommands(), COMMANDS, normalize(), resolveCommand(), admin, user, toOption(), ACCESS (+4 more)

### Community 45 - "partnerWebhook.js"
Cohesion: 0.13
Nodes (30): handle, handler(), store, handle, handler(), secrets(), store, createBillingWebhook() (+22 more)

### Community 46 - "useToast"
Cohesion: 0.18
Nodes (23): GroupsPage, Toast(), MovieActions(), LIKED, LIKED_TEXT, PlanAfterglow(), PlanCard(), RsvpPanel() (+15 more)

### Community 47 - "DuoPersonStep.jsx"
Cohesion: 0.12
Nodes (20): Chip(), ChoiceChips(), Question(), DuoPersonStep(), GENRE_INTENTS, GenreEditor(), genreState(), PLACEHOLDERS (+12 more)

### Community 48 - "naturalQuery.js"
Cohesion: 0.15
Nodes (17): PasswordField(), Icon(), CHAPTERS, DuoIntro(), POSTERS, MAX_PEOPLE, describeQuery(), GENRE_WORDS (+9 more)

### Community 49 - "Copia desde aquí para ejecutar"
Cohesion: 0.15
Nodes (13): 10. Orden de entregas y aceptación, 11. Evaluación de recomendación y UX, 12. Pruebas y condición de cierre, 1. La experiencia que vamos a construir, 2. Dirección visual: transformar el recorrido, 3. Movimiento y diversión con propósito, 4. Aprender gustos con películas, sin convertirlo en examen, 5. Mejorar el motor: corrección, señales y tres propuestas como conjunto (+5 more)

### Community 50 - "HomePage.jsx"
Cohesion: 0.25
Nodes (10): CollectionSection(), FaqItem(), FaqSection(), DuoSpotlight(), HomeExperiences(), PATHS, PlansPreview(), FAQ (+2 more)

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

### Community 58 - "TmdbStatus.jsx"
Cohesion: 0.23
Nodes (11): BrandLogo(), LABELS, TmdbStatus(), Footer(), Layout(), subscribe(), useNetworkStatus(), checkTmdbConnection() (+3 more)

### Community 60 - "PlanContext.jsx"
Cohesion: 0.10
Nodes (25): App(), router, AuthProvider(), MovieProvider(), asList(), PlanContext, PlanProvider(), ToastContext (+17 more)

### Community 61 - "api.js"
Cohesion: 0.12
Nodes (35): appRole(), authenticate(), captcha(), createApi(), getPlan(), HttpError, invalid(), jwtClaims() (+27 more)

### Community 62 - "planService.js"
Cohesion: 0.33
Nodes (7): PlanStats(), PlanSummary(), getPlanPoster(), getPlanStats(), HOME_TIMES, marathonTitles(), RSVP_OPTIONS

### Community 63 - "MovieDetailPage.jsx"
Cohesion: 0.16
Nodes (11): CinemaTicketsPage, MovieDetailPage, Modal(), createParticles(), MovieBackdrop(), prefersReducedMotion(), MovieInfo(), TrailerModal() (+3 more)

### Community 64 - "showtimeService.js"
Cohesion: 0.27
Nodes (13): previewInvite(), capitalize(), describeStart(), getListingsForTitle(), getOffersForTitle(), httpsUrl(), isCurrent(), lookups() (+5 more)

### Community 65 - "tmdbClient.test.js"
Cohesion: 0.31
Nodes (5): configureTmdb(), connect(), fakeApi(), rateLimitedApi(), tmdbRetryAt()

### Community 66 - "20261013120000_plan_time_poll.sql"
Cohesion: 0.24
Nodes (10): plan_time_options_touch, plan_time_votes_touch, public.choose_plan_time(), public.owned_active_plan(), public.plan_time_options, public.plan_time_votes, public.propose_plan_times(), auth.users (+2 more)

### Community 67 - "DuoFinal.jsx"
Cohesion: 0.27
Nodes (8): SkeletonRow(), DuoFinal(), endTime(), voteOf(), listeners, notify(), subscribe(), useInstallPrompt()

### Community 68 - "nightExperience.js"
Cohesion: 0.48
Nodes (6): clock(), NIGHT_QUESTIONS, NIGHT_RITUALS, nightAgenda(), nightSummary(), normalizeNight()

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
Cohesion: 0.18
Nodes (21): DuoEmptyState(), REASONS, clock(), DuoMarathon(), getShowtimes(), recommendedStart(), buildMarathon(), byRelease() (+13 more)

### Community 73 - "HeroCarousel.jsx"
Cohesion: 0.12
Nodes (22): HeroCarousel(), SCENE_COLORS, shorten(), Header(), LINKS, Navbar(), DEPARTMENTS, MovieSearch() (+14 more)

### Community 74 - "Legal y privacidad — decisiones pendientes (documento interno)"
Cohesion: 0.29
Nodes (6): Aceptación, «Acerca de» retirado, Cobros: qué falta antes de activar pagos, Cómo se redactaron, Decisiones que necesitan una persona responsable, Legal y privacidad — decisiones pendientes (documento interno)

### Community 75 - "Auditoría de seguridad de CINET — 2026-11-10"
Cohesion: 0.29
Nodes (6): Acciones manuales pendientes (no se pueden resolver desde el repositorio), Auditoría de seguridad de CINET — 2026-11-10, Comandos en la barra de búsqueda (por rol), Lo que se verificó y está bien, Resumen, Seguimientos opcionales

### Community 77 - "AuthPage.jsx"
Cohesion: 0.06
Nodes (63): AuthForm(), FIELD_NAMES, TEXT_FIELDS, Captcha(), loadTurnstile(), CAPTCHA_MISSING, captchaEnabled, TURNSTILE_SITE_KEY (+55 more)

### Community 78 - "expo"
Cohesion: 0.40
Nodes (4): projectId, expo, extra, eas

### Community 81 - "DuoModeStep.jsx"
Cohesion: 0.12
Nodes (30): DuoCommonStep(), limitsOf(), names(), toneNames(), valueLabel(), DuoModeStep(), FANS, MARATHON_TYPES (+22 more)

### Community 83 - "useDuoSession.js"
Cohesion: 0.32
Nodes (16): DUO_SESSION_KEY, asList(), asMarathon(), asMarathonPlan(), asNumber(), asPerson(), asRound(), asSession() (+8 more)

### Community 84 - "groupRepository.js"
Cohesion: 0.22
Nodes (17): acceptInvite(), call(), client(), createGroup(), createInvite(), deleteGroup(), getGroup(), groupPlans() (+9 more)

### Community 85 - "recommender.test.js"
Cohesion: 0.23
Nodes (7): diversify(), rankTitles(), group(), person(), rank(), SERIES, session()

### Community 86 - "db.js"
Cohesion: 0.27
Nodes (8): asAdmin(), createUsers(), errorCode(), MIGRATIONS, createPlan(), newPlan(), role(), ANON_READABLE

### Community 87 - "palette.js"
Cohesion: 0.38
Nodes (10): _analyze(), _avg(), _cache, _complement(), FALLBACK, _fromHsv(), _hex(), _hsv() (+2 more)

### Community 88 - "DuoSeats.jsx"
Cohesion: 0.12
Nodes (25): PosterImage(), answerOf(), DuoCalibration(), loadDeck(), snapshot(), suggestions(), Availability(), CRITERIA (+17 more)

### Community 89 - "Evidencia y hallazgos"
Cohesion: 0.12
Nodes (16): Auditoría de seguridad y operación de CINET para Claude, Evidencia que falta antes de declarar cierre, Evidencia y hallazgos, H-01 — Perfil consultable públicamente (P1), H-02 — Modelo de acceso por UUID, dueño y membresía (P1), H-03 — Realtime y datos indirectos (P1, verificar en staging), H-04 — Caducidad de recuperación, confirmación y rate limits de Auth (P1, configuración remota pendiente), H-05 — Endpoints, secretos y disponibilidad pública (P1) (+8 more)

### Community 90 - "Por hallazgo"
Cohesion: 0.12
Nodes (16): Evidencia local (2026-11-13), H-01 Perfiles públicos (P1) → corregido, H-02 Matriz de acceso y SECURITY DEFINER (P1) → invariantes automáticas, H-03 Realtime (P1, staging), H-04 Auth: recuperación, confirmación, CAPTCHA (P1) → corregido en código y config local, H-05 Secretos (P1) → **acción tuya pendiente**, H-06 Validación y XSS (P1 defensa en profundidad) → corregido, H-07 Paginación y límites (P1) → corregido (+8 more)

### Community 91 - "router.jsx"
Cohesion: 0.12
Nodes (22): AdminPage, CinemaPage, CreatePlanPage, FunctionsPage, LegalPage, PlanPage, ProfilePage, ProtectedRoute() (+14 more)

### Community 92 - "isTmdbEnabled"
Cohesion: 0.14
Nodes (25): search(), ActorPicker(), DuoSeenStep(), findTitles(), popularTitles(), applySearchError(), EMPTY, mergeSearchPage() (+17 more)

### Community 93 - "20261107100000_plan_data_contracts.sql"
Cohesion: 0.16
Nodes (5): public.plan_contract_repair(), public.share_plan_with_group(), public.group_members, public.plan_members, public.plans

### Community 94 - "createDb"
Cohesion: 0.60
Nodes (3): auditDatabase(), ORDER, createDb()

### Community 96 - "20261107120000_billing_order_and_quotas.sql"
Cohesion: 0.15
Nodes (9): public.duo_rooms, public.group_invites, public.groups, public.accept_group_invite(), public.billing_state, public.create_duo_room(), auth.users, public.group_members (+1 more)

### Community 97 - "planContract.js"
Cohesion: 0.35
Nodes (12): decodeDetails(), decodeMarathon(), decodePlace(), decodeTitle(), httpUrl(), isObject(), number(), scalar() (+4 more)

### Community 99 - "20261107110000_org_invitations.sql"
Cohesion: 0.26
Nodes (7): public.accept_org_invite(), public.list_my_org_invites(), public.my_email_hash(), public.org_invites, public.revoke_org_invite(), auth.users, public.organizations

### Community 100 - "Operación y verificación en staging (auditoría 2026-11-07)"
Cohesion: 0.18
Nodes (10): 0. Orden de aplicación de migraciones (staging primero, con respaldo), Cobros reales (N05), N06/N07 · Redis real (V15–V19), N16 · Identidad por IP, N17 · Realtime y eventos DELETE, N19 · Dependencias, N20 · Android (V49), N21 · GitHub Actions (+2 more)

### Community 102 - "contracts.test.js"
Cohesion: 0.22
Nodes (7): A, factoryInstantBefore, fixturePlanWithGroup(), legacy, many, plan(), applyMigrations()

### Community 104 - "partners.test.js"
Cohesion: 0.22
Nodes (7): A, A2, B, C, json(), listing(), OP

### Community 105 - "ExampleInstrumentedTest.java"
Cohesion: 0.33
Nodes (5): ExampleInstrumentedTest, ExampleUnitTest, androidx.test.ext.junit.runners.AndroidJUnit4, org.junit.runner.RunWith, org.junit.Test

### Community 107 - "supabaseClient.js"
Cohesion: 0.22
Nodes (11): @supabase/supabase-js, AuthContext, day(), Status(), call(), cancelPlusSandbox(), getPlusStatus(), PLUS_PRICE_COP (+3 more)

### Community 108 - "groups.test.js"
Cohesion: 0.22
Nodes (5): A, B, C, D, G

### Community 109 - "plus.test.js"
Cohesion: 0.27
Nodes (8): A, adminRows(), asService(), B, billing(), G, json(), rows()

### Community 112 - "as"
Cohesion: 0.29
Nodes (7): as(), rpc(), solicitar(), crear(), hasPlus(), save(), vote()

### Community 116 - "Despliegue, promoción y rollback (auditoría H-10)"
Cohesion: 0.29
Nodes (6): 1. Fase preview / staging, 2. Promoción a producción, 3. Rollback, 4. Backup y restauración (por probar), 5. Secretos, Despliegue, promoción y rollback (auditoría H-10)

### Community 117 - "20261105130000_serialize_plan_operations.sql"
Cohesion: 0.43
Nodes (6): public.plan_invites, public.accept_plan_invite(), public.cancel_plan(), public.create_plan_invite(), public.set_plan_rsvp(), public.plans

### Community 118 - "time-poll.test.js"
Cohesion: 0.29
Nodes (3): A, B, C

### Community 124 - "gradlew"
Cohesion: 0.83
Nodes (3): gradlew script, die(), warn()

### Community 129 - "overrides"
Cohesion: 0.67
Nodes (3): overrides, minimatch, rimraf

## Knowledge Gaps
- **460 isolated node(s):** `store`, `store`, `ipOptions`, `projectId`, `PORT` (+455 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 694 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **17 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `react` to `recommender.js`, `fallbackPoster`, `FunctionsPage.jsx`, `package.json`, `MoviesPage.jsx`, `DuoRoomPage.jsx`, `duo-eval.mjs`, `planRepository.js`, `RecapPage.jsx`, `DuoResults.jsx`, `useAsync`, `usePlans`, `DuoPage.jsx`, `platforms.js`, `useToast`, `DuoPersonStep.jsx`, `naturalQuery.js`, `HomePage.jsx`, `TmdbStatus.jsx`, `PlanContext.jsx`, `MovieDetailPage.jsx`, `DuoFinal.jsx`, `DuoMarathon.jsx`, `HeroCarousel.jsx`, `AuthPage.jsx`, `DuoModeStep.jsx`, `useDuoSession.js`, `DuoSeats.jsx`, `router.jsx`, `isTmdbEnabled`, `supabaseClient.js`?**
  _High betweenness centrality (0.121) - this node is a cross-community bridge._
- **Why does `auth()` connect `fake-supabase.mjs` to `20261010120000_duo_rooms.sql`, `20261015120000_plus_sandbox.sql`, `20261012120000_groups.sql`, `20261009120000_shared_plans.sql`, `20261014120000_partners.sql`?**
  _High betweenness centrality (0.103) - this node is a cross-community bridge._
- **Why does `react-router-dom` connect `react` to `recommender.js`, `fallbackPoster`, `FunctionsPage.jsx`, `package.json`, `DuoRoomPage.jsx`, `duo-eval.mjs`, `RecapPage.jsx`, `usePlans`, `DuoPage.jsx`, `platforms.js`, `useToast`, `HomePage.jsx`, `TmdbStatus.jsx`, `PlanContext.jsx`, `MovieDetailPage.jsx`, `DuoMarathon.jsx`, `HeroCarousel.jsx`, `AuthPage.jsx`, `DuoSeats.jsx`, `router.jsx`, `isTmdbEnabled`?**
  _High betweenness centrality (0.042) - this node is a cross-community bridge._
- **What connects `store`, `store`, `ipOptions` to the rest of the system?**
  _460 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `20261010120000_duo_rooms.sql` be split into smaller, more focused modules?**
  _Cohesion score 0.10338680926916222 - nodes in this community are weakly interconnected._
- **Should `recommender.js` be split into smaller, more focused modules?**
  _Cohesion score 0.09268707482993198 - nodes in this community are weakly interconnected._
- **Should `movieService.js` be split into smaller, more focused modules?**
  _Cohesion score 0.0796221322537112 - nodes in this community are weakly interconnected._