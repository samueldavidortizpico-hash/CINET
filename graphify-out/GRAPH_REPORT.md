# Graph Report - CINET  (2026-09-28)

## Corpus Check
- 137 files · ~331,902 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 664 nodes · 2190 edges · 24 communities (22 shown, 2 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 31 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `b90fe2d3`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- router.jsx
- recommender.js
- duo.js
- FunctionsPage.jsx
- useAsync
- package.json
- TmdbStatus.jsx
- movieService.js
- tmdbClient.js
- Milestone 2 — React Frontend
- isTmdbEnabled
- DuoPage.jsx
- react
- duoService.js
- regionName
- tmdbClient.test.js
- DuoSummary.jsx
- Intervención 2026-09-27 — Claude Code (Claude Opus 5.5)
- tmdb-live.mjs
- AdvancedFilters.jsx
- public/images/SOURCES.md
- .vscode/images/SOURCES.md
- DuoModeStep.jsx
- searchCatalog

## God Nodes (most connected - your core abstractions)
1. `react` - 55 edges
2. `isTmdbEnabled()` - 35 edges
3. `useDocumentTitle()` - 29 edges
4. `react-router-dom` - 27 edges
5. `Button()` - 26 edges
6. `useLocalStorage()` - 26 edges
7. `useAsync()` - 25 edges
8. `useToast()` - 23 edges
9. `usePlans()` - 21 edges
10. `tmdbRequest()` - 21 edges

## Surprising Connections (you probably didn't know these)
- `search()` --calls--> `searchCatalog()`  [EXTRACTED]
  scripts/tmdb-live.mjs → src/services/movieService.js
- `Availability()` --calls--> `regionName()`  [EXTRACTED]
  src/components/duo/DuoRecommendationCard.jsx → src/data/tmdb.js
- `DuoResults()` --indirect_call--> `genreName()`  [INFERRED]
  src/components/duo/DuoResults.jsx → src/services/recommender.js
- `DuoPage()` --indirect_call--> `personName()`  [INFERRED]
  src/pages/DuoPage.jsx → src/data/duo.js
- `DashboardPage()` --indirect_call--> `getMovies()`  [INFERRED]
  src/pages/DashboardPage.jsx → src/services/movieService.js

## Import Cycles
- None detected.

## Communities (24 total, 2 thin omitted)

### Community 0 - "router.jsx"
Cohesion: 0.08
Nodes (57): react-router-dom, AuthForm(), FIELDS, ProfileCard(), Button(), EmptyState(), Toast(), DuoResults() (+49 more)

### Community 1 - "recommender.js"
Cohesion: 0.07
Nodes (62): DuoCommonStep(), names(), toneNames(), valueLabel(), DuoEmptyState(), REASONS, clock(), DuoMarathon() (+54 more)

### Community 2 - "duo.js"
Cohesion: 0.14
Nodes (17): DuoPersonStep(), GENRE_INTENTS, genreState(), STATE_MARK, STATE_TEXT, withGenreState(), DuoProgress(), DUO_HISTORY_KEY (+9 more)

### Community 3 - "FunctionsPage.jsx"
Cohesion: 0.12
Nodes (18): Loading(), BookingSummary(), AmbienceOptions(), CinemaOptions(), DateOptions(), optionClass(), TimeOptions(), ShowtimeStep() (+10 more)

### Community 4 - "useAsync"
Cohesion: 0.09
Nodes (33): PosterImage(), SkeletonRow(), DuoFinal(), Availability(), CRITERIA, DuoRecommendationCard(), SelectedMovie(), CollectionSection() (+25 more)

### Community 5 - "package.json"
Cohesion: 0.06
Nodes (32): dependencies, react, react-dom, react-router-dom, description, devDependencies, eslint, @eslint/js (+24 more)

### Community 6 - "TmdbStatus.jsx"
Cohesion: 0.20
Nodes (13): BrandLogo(), LABELS, TmdbStatus(), Footer(), Header(), Layout(), subscribe(), useNetworkStatus() (+5 more)

### Community 7 - "movieService.js"
Cohesion: 0.07
Nodes (40): movies, CINEMA_CHAINS, CINEMAS, MONTHS, SHOW_TIMES, WEEKDAYS, ALIASES, BY_TMDB_ID (+32 more)

### Community 8 - "tmdbClient.js"
Cohesion: 0.12
Nodes (28): ActorPicker(), listOf(), matchesTitleDetails(), cache, config, CONNECTION_ERRORS, discoverMovies(), discoverTv() (+20 more)

### Community 9 - "Milestone 2 — React Frontend"
Cohesion: 0.07
Nodes (26): 1. Buscar y explorar películas, 2. Consultar una película y sus funciones, 3. Crear un plan, 4. Consultar un plan, 5. Responder a un plan, Arquitectura, Capa offline (HW07), Cartelera y cadenas de cine (+18 more)

### Community 10 - "isTmdbEnabled"
Cohesion: 0.19
Nodes (18): AdvancedFilters(), MovieFilters(), DEPARTMENTS, MovieSearch(), thumb(), INITIAL_FILTERS, MovieContext, useMovies() (+10 more)

### Community 11 - "DuoPage.jsx"
Cohesion: 0.15
Nodes (25): DuoHistoryDialog(), DuoSeenStep(), findTitles(), popularTitles(), MovieActions(), useDuoHistory(), candidatesKey(), DuoPage() (+17 more)

### Community 12 - "react"
Cohesion: 0.06
Nodes (54): react, App(), router, DiceButton(), Icon(), Modal(), trapFocus(), CHAPTERS (+46 more)

### Community 13 - "duoService.js"
Cohesion: 0.30
Nodes (14): discoverForDuo(), discoverParams(), enrich(), fetchSources(), genreIds(), getDuoCandidates(), pairSources(), sagaParts() (+6 more)

### Community 14 - "regionName"
Cohesion: 0.16
Nodes (12): DuoModeStep(), formatDate(), MovieExtras(), WhereToWatch(), LOGOS, PlatformLogo(), WatchModal(), withAvailability() (+4 more)

### Community 15 - "tmdbClient.test.js"
Cohesion: 0.28
Nodes (5): getHeroSlides(), withHeroBackdrop(), configureTmdb(), connect(), fakeApi()

### Community 16 - "DuoSummary.jsx"
Cohesion: 0.26
Nodes (9): DuoSummary(), genre(), label(), PersonChips(), MARATHON_STYLES, SERIES_STATUS_OPTIONS, SESSION_LENGTHS, TONES (+1 more)

### Community 17 - "Intervención 2026-09-27 — Claude Code (Claude Opus 5.5)"
Cohesion: 0.25
Nodes (7): AI-LOG — CINET (antes CineHub), Cambios realizados, Intervención 2026-09-27 — Claude Code (Claude Opus 5.5), Pendiente / limitaciones, Pruebas ejecutadas y resultados, Qué existía antes (inspeccionado), Qué se pidió

### Community 18 - "tmdb-live.mjs"
Cohesion: 0.32
Nodes (10): DEFAULT_DUO_SESSION, DEFAULT_MARATHON, DEFAULT_PERSON, DUO_SESSION_KEY, asList(), asNumber(), asPerson(), asSession() (+2 more)

### Community 19 - "AdvancedFilters.jsx"
Cohesion: 0.24
Nodes (8): RATINGS, RUNTIMES, genreKeysFor(), genreLabel(), GENRES, LANGUAGES, REGIONS, TV_LABELS

### Community 22 - "DuoModeStep.jsx"
Cohesion: 0.28
Nodes (7): Chip(), ChoiceChips(), Question(), COUNTS, MARATHON_TYPES, MARATHON_SCOPES, MODES

### Community 23 - "searchCatalog"
Cohesion: 0.25
Nodes (8): search(), hasFilters(), matchesSearchResult(), pad(), searchCatalog(), toDiscoverParams(), toISODate(), searchTitles()

## Knowledge Gaps
- **98 isolated node(s):** `name`, `private`, `version`, `description`, `type` (+93 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 127 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `react` to `router.jsx`, `recommender.js`, `duo.js`, `FunctionsPage.jsx`, `useAsync`, `package.json`, `TmdbStatus.jsx`, `isTmdbEnabled`, `DuoPage.jsx`, `regionName`, `tmdb-live.mjs`, `AdvancedFilters.jsx`?**
  _High betweenness centrality (0.168) - this node is a cross-community bridge._
- **Why does `react-router-dom` connect `router.jsx` to `recommender.js`, `FunctionsPage.jsx`, `useAsync`, `package.json`, `TmdbStatus.jsx`, `isTmdbEnabled`, `DuoPage.jsx`, `react`, `regionName`?**
  _High betweenness centrality (0.063) - this node is a cross-community bridge._
- **What connects `name`, `private`, `version` to the rest of the system?**
  _98 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `router.jsx` be split into smaller, more focused modules?**
  _Cohesion score 0.07835642618251314 - nodes in this community are weakly interconnected._
- **Should `recommender.js` be split into smaller, more focused modules?**
  _Cohesion score 0.07412008281573498 - nodes in this community are weakly interconnected._
- **Should `duo.js` be split into smaller, more focused modules?**
  _Cohesion score 0.14210526315789473 - nodes in this community are weakly interconnected._
- **Should `FunctionsPage.jsx` be split into smaller, more focused modules?**
  _Cohesion score 0.12433862433862433 - nodes in this community are weakly interconnected._