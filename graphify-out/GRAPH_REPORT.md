# Graph Report - CINET  (2026-10-09)

## Corpus Check
- 153 files · ~128,629 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 774 nodes · 2455 edges · 24 communities (21 shown, 3 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 34 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `1dd4e6cb`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- react
- recommender.js
- CinemaPage.jsx
- movieService.js
- DuoSeats.jsx
- package.json
- duoService.js
- Avatares de CINET
- tmdbClient.js
- Milestone 2 — React Frontend
- isTmdbEnabled
- react-router-dom
- useLocalStorage
- vercel.json
- DuoPage.jsx
- historyService.js
- check-avatar-policies.mjs
- Intervención 2026-09-27 — Claude Code (Claude Opus 5.5)
- AdvancedFilters.jsx
- DuoResults.jsx
- public/images/SOURCES.md
- HeroCarousel.jsx
- WatchModal.jsx
- tmdbClient.test.js

## God Nodes (most connected - your core abstractions)
1. `react` - 61 edges
2. `isTmdbEnabled()` - 35 edges
3. `useDocumentTitle()` - 31 edges
4. `Button()` - 30 edges
5. `react-router-dom` - 28 edges
6. `useToast()` - 27 edges
7. `useAsync()` - 25 edges
8. `useAuth()` - 25 edges
9. `useLocalStorage()` - 24 edges
10. `DuoPage()` - 22 edges

## Surprising Connections (you probably didn't know these)
- `search()` --calls--> `searchCatalog()`  [EXTRACTED]
  scripts/tmdb-live.mjs → src/services/movieService.js
- `Availability()` --calls--> `regionName()`  [EXTRACTED]
  src/components/duo/DuoRecommendationCard.jsx → src/data/tmdb.js
- `DuoResults()` --indirect_call--> `genreName()`  [INFERRED]
  src/components/duo/DuoResults.jsx → src/services/recommender.js
- `hitText()` --indirect_call--> `genreName()`  [INFERRED]
  src/components/duo/DuoSeats.jsx → src/services/recommender.js
- `WhereToWatch()` --calls--> `regionName()`  [EXTRACTED]
  src/components/movie-detail/MovieExtras.jsx → src/data/tmdb.js

## Import Cycles
- None detected.

## Communities (24 total, 3 thin omitted)

### Community 0 - "react"
Cohesion: 0.06
Nodes (60): react, AboutPage, AdminPage, CinemaPage, CreatePlanPage, DashboardPage, DuoPage, FunctionsPage (+52 more)

### Community 1 - "recommender.js"
Cohesion: 0.06
Nodes (71): DuoCommonStep(), names(), toneNames(), valueLabel(), DuoEmptyState(), REASONS, clock(), DuoMarathon() (+63 more)

### Community 2 - "CinemaPage.jsx"
Cohesion: 0.29
Nodes (9): LABELS, TmdbStatus(), CinemaPage(), getCollection(), interleave(), checkTmdbConnection(), getTmdbStatus(), subscribeTmdbStatus() (+1 more)

### Community 3 - "movieService.js"
Cohesion: 0.08
Nodes (38): movies, ALIASES, BY_TMDB_ID, capitalize(), COLLECTIONS, countryName(), discovered(), formatRuntime() (+30 more)

### Community 4 - "DuoSeats.jsx"
Cohesion: 0.07
Nodes (42): CinemaTicketsPage, Availability(), CRITERIA, DuoRecommendationCard(), fitState(), hitText(), ORDER, SeatFit() (+34 more)

### Community 5 - "package.json"
Cohesion: 0.06
Nodes (36): dependencies, react, react-dom, react-router-dom, @supabase/supabase-js, description, devDependencies, eslint (+28 more)

### Community 6 - "duoService.js"
Cohesion: 0.29
Nodes (15): discoverForDuo(), discoverParams(), enrich(), fetchSources(), genreIds(), pairSources(), sagaParts(), sources() (+7 more)

### Community 7 - "Avatares de CINET"
Cohesion: 0.22
Nodes (8): Archivos de la implementación, Avatares de CINET, Cómo funciona, Estado y alcance, Probar en localhost, Pruebas locales reproducibles, Seguridad, SQL manual en Supabase

### Community 8 - "tmdbClient.js"
Cohesion: 0.15
Nodes (22): listOf(), cache, config, CONNECTION_ERRORS, discoverMovies(), discoverTv(), getTitleList(), limited() (+14 more)

### Community 9 - "Milestone 2 — React Frontend"
Cohesion: 0.07
Nodes (26): 1. Buscar y explorar películas, 2. Consultar una película y sus funciones, 3. Crear un plan, 4. Consultar un plan, 5. Responder a un plan, Arquitectura, Capa offline (HW07), Cartelera y cadenas de cine (+18 more)

### Community 10 - "isTmdbEnabled"
Cohesion: 0.15
Nodes (25): ActorPicker(), DuoSeenStep(), findTitles(), popularTitles(), AdvancedFilters(), MovieFilters(), DEPARTMENTS, MovieSearch() (+17 more)

### Community 11 - "react-router-dom"
Cohesion: 0.06
Nodes (56): react-router-dom, ProfilePage, AuthForm(), FIELDS, AvatarUpload(), ProfileCard(), ROLE_LABELS, FIELDS (+48 more)

### Community 12 - "useLocalStorage"
Cohesion: 0.13
Nodes (19): App(), router, AuthProvider(), asList(), PlanContext, PlanProvider(), ToastContext, ToastProvider() (+11 more)

### Community 14 - "DuoPage.jsx"
Cohesion: 0.06
Nodes (61): Chip(), ChoiceChips(), Question(), COUNTS, DuoModeStep(), GroupPicker(), MARATHON_TYPES, DuoPersonStep() (+53 more)

### Community 15 - "historyService.js"
Cohesion: 0.25
Nodes (14): DuoHistoryDialog(), MovieActions(), useDuoHistory(), addToHistory(), asHistory(), EMPTY_HISTORY, excludedGroups(), excludedIds() (+6 more)

### Community 17 - "Intervención 2026-09-27 — Claude Code (Claude Opus 5.5)"
Cohesion: 0.14
Nodes (13): AI-LOG — CINET (antes CineHub), Cambios realizados, Cambios realizados, Intervención 2026-09-27 — Claude Code (Claude Opus 5.5), Intervención 2026-10-09 — Claude Code (Claude Opus 5.5), Línea base (ejecutada antes de tocar nada), Pendiente / limitaciones, Pendiente / limitaciones (+5 more)

### Community 18 - "AdvancedFilters.jsx"
Cohesion: 0.24
Nodes (8): RATINGS, RUNTIMES, genreKeysFor(), genreLabel(), GENRES, LANGUAGES, REGIONS, TV_LABELS

### Community 19 - "DuoResults.jsx"
Cohesion: 0.12
Nodes (30): PosterImage(), SkeletonRow(), Toast(), DuoFinal(), voteOf(), DuoResults(), SelectedMovie(), PlanCard() (+22 more)

### Community 21 - "HeroCarousel.jsx"
Cohesion: 0.16
Nodes (16): DiceButton(), Icon(), CHAPTERS, DuoIntro(), POSTERS, HeroCarousel(), SCENE_COLORS, shorten() (+8 more)

### Community 22 - "WatchModal.jsx"
Cohesion: 0.13
Nodes (13): Modal(), trapFocus(), formatDate(), MovieExtras(), WhereToWatch(), LOGOS, PlatformLogo(), TrailerModal() (+5 more)

### Community 23 - "tmdbClient.test.js"
Cohesion: 0.19
Nodes (10): search(), DEFAULT_DUO_SESSION, DEFAULT_PERSON, hasFilters(), matchesSearchResult(), searchCatalog(), toDiscoverParams(), configureTmdb() (+2 more)

## Knowledge Gaps
- **129 isolated node(s):** `name`, `private`, `version`, `description`, `type` (+124 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 165 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `react` to `recommender.js`, `CinemaPage.jsx`, `DuoSeats.jsx`, `package.json`, `isTmdbEnabled`, `react-router-dom`, `useLocalStorage`, `DuoPage.jsx`, `historyService.js`, `AdvancedFilters.jsx`, `DuoResults.jsx`, `HeroCarousel.jsx`, `WatchModal.jsx`?**
  _High betweenness centrality (0.200) - this node is a cross-community bridge._
- **Why does `react-router-dom` connect `react-router-dom` to `react`, `recommender.js`, `CinemaPage.jsx`, `DuoSeats.jsx`, `package.json`, `isTmdbEnabled`, `useLocalStorage`, `DuoPage.jsx`, `historyService.js`, `HeroCarousel.jsx`, `WatchModal.jsx`?**
  _High betweenness centrality (0.054) - this node is a cross-community bridge._
- **Why does `Button()` connect `react` to `recommender.js`, `DuoSeats.jsx`, `isTmdbEnabled`, `react-router-dom`, `DuoPage.jsx`, `DuoResults.jsx`, `HeroCarousel.jsx`?**
  _High betweenness centrality (0.022) - this node is a cross-community bridge._
- **What connects `name`, `private`, `version` to the rest of the system?**
  _129 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `react` be split into smaller, more focused modules?**
  _Cohesion score 0.060470324748040316 - nodes in this community are weakly interconnected._
- **Should `recommender.js` be split into smaller, more focused modules?**
  _Cohesion score 0.06473953628425173 - nodes in this community are weakly interconnected._
- **Should `movieService.js` be split into smaller, more focused modules?**
  _Cohesion score 0.07897793263646923 - nodes in this community are weakly interconnected._