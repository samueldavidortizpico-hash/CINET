# Graph Report - CINET  (2026-09-28)

## Corpus Check
- 148 files · ~337,507 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 700 nodes · 2272 edges · 25 communities (22 shown, 3 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 31 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `a4569e2a`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- FunctionsPage.jsx
- recommender.js
- TmdbStatus.jsx
- movieService.js
- DuoRecommendationCard.jsx
- package.json
- duoService.js
- react
- tmdbClient.js
- Milestone 2 — React Frontend
- isTmdbEnabled
- useDuoSession.js
- App.jsx
- vercel.json
- DuoPage.jsx
- DuoSeenStep.jsx
- DuoSummary.jsx
- Intervención 2026-09-27 — Claude Code (Claude Opus 5.5)
- tmdb.js
- DuoPersonStep.jsx
- public/images/SOURCES.md
- .vscode/images/SOURCES.md
- DuoModeStep.jsx
- tmdbClient.test.js
- MovieBackdrop.jsx

## God Nodes (most connected - your core abstractions)
1. `react` - 57 edges
2. `isTmdbEnabled()` - 35 edges
3. `useDocumentTitle()` - 29 edges
4. `Button()` - 28 edges
5. `react-router-dom` - 27 edges
6. `useAsync()` - 25 edges
7. `useToast()` - 25 edges
8. `useLocalStorage()` - 24 edges
9. `useAuth()` - 23 edges
10. `usePlans()` - 21 edges

## Surprising Connections (you probably didn't know these)
- `search()` --calls--> `searchCatalog()`  [EXTRACTED]
  scripts/tmdb-live.mjs → src/services/movieService.js
- `names()` --indirect_call--> `genreName()`  [INFERRED]
  src/components/duo/DuoCommonStep.jsx → src/services/recommender.js
- `Availability()` --calls--> `regionName()`  [EXTRACTED]
  src/components/duo/DuoRecommendationCard.jsx → src/data/tmdb.js
- `DashboardPage()` --indirect_call--> `getMovies()`  [INFERRED]
  src/pages/DashboardPage.jsx → src/services/movieService.js
- `DuoPage()` --indirect_call--> `genreName()`  [INFERRED]
  src/pages/DuoPage.jsx → src/services/recommender.js

## Import Cycles
- None detected.

## Communities (25 total, 3 thin omitted)

### Community 0 - "FunctionsPage.jsx"
Cohesion: 0.06
Nodes (74): react-router-dom, AuthForm(), FIELDS, AvatarUpload(), ProfileCard(), ROLE_LABELS, FIELDS, ProfileForm() (+66 more)

### Community 1 - "recommender.js"
Cohesion: 0.06
Nodes (69): DuoEmptyState(), REASONS, DuoHistoryDialog(), clock(), DuoMarathon(), SERIES_STATUS_LABELS, FunctionsPage(), homePlaces() (+61 more)

### Community 2 - "TmdbStatus.jsx"
Cohesion: 0.20
Nodes (13): BrandLogo(), LABELS, TmdbStatus(), Footer(), Header(), Layout(), subscribe(), useNetworkStatus() (+5 more)

### Community 3 - "movieService.js"
Cohesion: 0.07
Nodes (44): movies, CINEMA_CHAINS, CINEMAS, MONTHS, SHOW_TIMES, WEEKDAYS, ALIASES, BY_TMDB_ID (+36 more)

### Community 4 - "DuoRecommendationCard.jsx"
Cohesion: 0.09
Nodes (30): PosterImage(), SkeletonRow(), DuoFinal(), Availability(), CRITERIA, DuoRecommendationCard(), SelectedMovie(), SlideMedia() (+22 more)

### Community 5 - "package.json"
Cohesion: 0.06
Nodes (35): dependencies, react, react-dom, react-router-dom, @supabase/supabase-js, description, devDependencies, eslint (+27 more)

### Community 6 - "duoService.js"
Cohesion: 0.27
Nodes (15): FORMAT_GENRES, SERIES_STATUS, discoverForDuo(), discoverParams(), enrich(), fetchSources(), genreIds(), pairSources() (+7 more)

### Community 7 - "react"
Cohesion: 0.08
Nodes (43): react, DiceButton(), Icon(), Modal(), trapFocus(), CHAPTERS, DuoIntro(), POSTERS (+35 more)

### Community 8 - "tmdbClient.js"
Cohesion: 0.13
Nodes (26): listOf(), matchesTitleDetails(), cache, config, CONNECTION_ERRORS, discoverMovies(), discoverTv(), getTitleDetails() (+18 more)

### Community 9 - "Milestone 2 — React Frontend"
Cohesion: 0.07
Nodes (26): 1. Buscar y explorar películas, 2. Consultar una película y sus funciones, 3. Crear un plan, 4. Consultar un plan, 5. Responder a un plan, Arquitectura, Capa offline (HW07), Cartelera y cadenas de cine (+18 more)

### Community 10 - "isTmdbEnabled"
Cohesion: 0.19
Nodes (18): AdvancedFilters(), RATINGS, RUNTIMES, MovieFilters(), DEPARTMENTS, MovieSearch(), thumb(), useMovies() (+10 more)

### Community 11 - "useDuoSession.js"
Cohesion: 0.57
Nodes (7): DUO_SESSION_KEY, asList(), asNumber(), asPerson(), asSession(), isObject(), useDuoSession()

### Community 12 - "App.jsx"
Cohesion: 0.08
Nodes (32): @supabase/supabase-js, App(), router, AuthContext, AuthProvider(), asList(), PlanContext, PlanProvider() (+24 more)

### Community 14 - "DuoPage.jsx"
Cohesion: 0.15
Nodes (20): DuoProgress(), DuoSummary(), AmbienceOptions(), AMBIENCES, DEFAULT_DUO_SESSION, DEFAULT_MARATHON, DEFAULT_PERSON, DUO_HISTORY_KEY (+12 more)

### Community 15 - "DuoSeenStep.jsx"
Cohesion: 0.19
Nodes (13): search(), DuoSeenStep(), findTitles(), popularTitles(), INITIAL_FILTERS, MovieContext, MovieProvider(), getCollection() (+5 more)

### Community 16 - "DuoSummary.jsx"
Cohesion: 0.21
Nodes (11): DuoCommonStep(), names(), toneNames(), valueLabel(), genre(), label(), PersonChips(), MODES (+3 more)

### Community 17 - "Intervención 2026-09-27 — Claude Code (Claude Opus 5.5)"
Cohesion: 0.25
Nodes (7): AI-LOG — CINET (antes CineHub), Cambios realizados, Intervención 2026-09-27 — Claude Code (Claude Opus 5.5), Pendiente / limitaciones, Pruebas ejecutadas y resultados, Qué existía antes (inspeccionado), Qué se pidió

### Community 18 - "tmdb.js"
Cohesion: 0.14
Nodes (15): formatDate(), MovieExtras(), WhereToWatch(), WatchModal(), withAvailability(), OFFER_TYPES, PLATFORMS, STATUS_LABELS (+7 more)

### Community 19 - "DuoPersonStep.jsx"
Cohesion: 0.17
Nodes (14): Chip(), ChoiceChips(), Question(), ActorPicker(), DuoPersonStep(), GENRE_INTENTS, genreState(), STATE_MARK (+6 more)

### Community 22 - "DuoModeStep.jsx"
Cohesion: 0.22
Nodes (9): COUNTS, DuoModeStep(), MARATHON_TYPES, LOGOS, PlatformLogo(), MARATHON_SCOPES, MARATHON_STYLES, SESSION_LENGTHS (+1 more)

### Community 23 - "tmdbClient.test.js"
Cohesion: 0.32
Nodes (4): EMPTY_HISTORY, configureTmdb(), connect(), fakeApi()

### Community 24 - "MovieBackdrop.jsx"
Cohesion: 1.00
Nodes (3): createParticles(), MovieBackdrop(), prefersReducedMotion()

## Knowledge Gaps
- **109 isolated node(s):** `name`, `private`, `version`, `description`, `type` (+104 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 140 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `react` to `FunctionsPage.jsx`, `recommender.js`, `TmdbStatus.jsx`, `DuoRecommendationCard.jsx`, `package.json`, `isTmdbEnabled`, `useDuoSession.js`, `App.jsx`, `DuoPage.jsx`, `DuoSeenStep.jsx`, `tmdb.js`, `DuoPersonStep.jsx`, `MovieBackdrop.jsx`?**
  _High betweenness centrality (0.211) - this node is a cross-community bridge._
- **Why does `react-router-dom` connect `FunctionsPage.jsx` to `recommender.js`, `TmdbStatus.jsx`, `DuoRecommendationCard.jsx`, `package.json`, `react`, `isTmdbEnabled`, `App.jsx`, `DuoPage.jsx`, `tmdb.js`?**
  _High betweenness centrality (0.062) - this node is a cross-community bridge._
- **What connects `name`, `private`, `version` to the rest of the system?**
  _109 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `FunctionsPage.jsx` be split into smaller, more focused modules?**
  _Cohesion score 0.0579689502919812 - nodes in this community are weakly interconnected._
- **Should `recommender.js` be split into smaller, more focused modules?**
  _Cohesion score 0.06424050632911392 - nodes in this community are weakly interconnected._
- **Should `movieService.js` be split into smaller, more focused modules?**
  _Cohesion score 0.06802721088435375 - nodes in this community are weakly interconnected._
- **Should `DuoRecommendationCard.jsx` be split into smaller, more focused modules?**
  _Cohesion score 0.09302325581395349 - nodes in this community are weakly interconnected._