# Graph Report - CINET  (2026-09-28)

## Corpus Check
- 137 files · ~330,480 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 656 nodes · 2163 edges · 19 communities (17 shown, 2 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 29 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `b90fe2d3`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- react
- recommender.js
- DuoPage.jsx
- DuoSeenStep.jsx
- HeroCarousel.jsx
- package.json
- Header.jsx
- movieService.js
- tmdbClient.js
- Milestone 2 — React Frontend
- isTmdbEnabled
- historyService.js
- useLocalStorage
- duoService.js
- useReveal
- tmdbClient.test.js
- Intervención 2026-09-27 — Claude Code (Claude Opus 5.5)
- public/images/SOURCES.md
- .vscode/images/SOURCES.md

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
- `WhereToWatch()` --calls--> `regionName()`  [EXTRACTED]
  src/components/movie-detail/MovieExtras.jsx → src/data/tmdb.js
- `DashboardPage()` --indirect_call--> `getMovies()`  [INFERRED]
  src/pages/DashboardPage.jsx → src/services/movieService.js
- `DuoPage()` --indirect_call--> `genreName()`  [INFERRED]
  src/pages/DuoPage.jsx → src/services/recommender.js

## Import Cycles
- None detected.

## Communities (19 total, 2 thin omitted)

### Community 0 - "react"
Cohesion: 0.06
Nodes (77): react, react-router-dom, AuthForm(), FIELDS, ProfileCard(), Button(), EmptyState(), Loading() (+69 more)

### Community 1 - "recommender.js"
Cohesion: 0.07
Nodes (62): names(), DuoEmptyState(), REASONS, clock(), DuoMarathon(), DuoResults(), DEFAULT_DUO_SESSION, DEFAULT_PERSON (+54 more)

### Community 2 - "DuoPage.jsx"
Cohesion: 0.05
Nodes (65): Icon(), Modal(), trapFocus(), DuoCommonStep(), toneNames(), valueLabel(), Chip(), ChoiceChips() (+57 more)

### Community 3 - "DuoSeenStep.jsx"
Cohesion: 0.29
Nodes (10): DuoSeenStep(), findTitles(), popularTitles(), CollectionSection(), useAsync(), CinemaPage(), getCollection(), getMovies() (+2 more)

### Community 4 - "HeroCarousel.jsx"
Cohesion: 0.06
Nodes (43): DiceButton(), PosterImage(), SkeletonRow(), DuoFinal(), CHAPTERS, DuoIntro(), POSTERS, Availability() (+35 more)

### Community 5 - "package.json"
Cohesion: 0.06
Nodes (32): dependencies, react, react-dom, react-router-dom, description, devDependencies, eslint, @eslint/js (+24 more)

### Community 6 - "Header.jsx"
Cohesion: 0.22
Nodes (9): BrandLogo(), Footer(), Header(), Layout(), LINKS, Navbar(), subscribe(), useNetworkStatus() (+1 more)

### Community 7 - "movieService.js"
Cohesion: 0.07
Nodes (41): movies, CINEMA_CHAINS, CINEMAS, MONTHS, SHOW_TIMES, WEEKDAYS, genreKeysFor(), genreLabel() (+33 more)

### Community 8 - "tmdbClient.js"
Cohesion: 0.11
Nodes (33): LABELS, TmdbStatus(), listOf(), matchesTitleDetails(), cache, checkTmdbConnection(), config, CONNECTION_ERRORS (+25 more)

### Community 9 - "Milestone 2 — React Frontend"
Cohesion: 0.07
Nodes (26): 1. Buscar y explorar películas, 2. Consultar una película y sus funciones, 3. Crear un plan, 4. Consultar un plan, 5. Responder a un plan, Arquitectura, Capa offline (HW07), Cartelera y cadenas de cine (+18 more)

### Community 10 - "isTmdbEnabled"
Cohesion: 0.14
Nodes (23): AdvancedFilters(), RATINGS, RUNTIMES, MovieFilters(), DEPARTMENTS, MovieSearch(), thumb(), INITIAL_FILTERS (+15 more)

### Community 11 - "historyService.js"
Cohesion: 0.17
Nodes (17): DuoHistoryDialog(), CinephileProfile(), DUO_HISTORY_KEY, useDuoHistory(), addToHistory(), asHistory(), EMPTY_HISTORY, excludedGroups() (+9 more)

### Community 12 - "useLocalStorage"
Cohesion: 0.14
Nodes (22): App(), router, AuthContext, AuthProvider(), ToastContext, ToastProvider(), useLocalStorage(), getUsers() (+14 more)

### Community 13 - "duoService.js"
Cohesion: 0.35
Nodes (11): SERIES_STATUS, discoverForDuo(), discoverParams(), enrich(), genreIds(), pairSources(), sagaParts(), sources() (+3 more)

### Community 14 - "useReveal"
Cohesion: 0.31
Nodes (7): FaqItem(), FaqSection(), DuoSpotlight(), HomeExperiences(), PATHS, FAQ, useReveal()

### Community 15 - "tmdbClient.test.js"
Cohesion: 0.18
Nodes (10): search(), hasFilters(), matchesSearchResult(), pad(), searchCatalog(), toDiscoverParams(), toISODate(), configureTmdb() (+2 more)

### Community 17 - "Intervención 2026-09-27 — Claude Code (Claude Opus 5.5)"
Cohesion: 0.25
Nodes (7): AI-LOG — CINET (antes CineHub), Cambios realizados, Intervención 2026-09-27 — Claude Code (Claude Opus 5.5), Pendiente / limitaciones, Pruebas ejecutadas y resultados, Qué existía antes (inspeccionado), Qué se pidió

## Knowledge Gaps
- **98 isolated node(s):** `name`, `private`, `version`, `description`, `type` (+93 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 127 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `react` to `recommender.js`, `DuoPage.jsx`, `DuoSeenStep.jsx`, `HeroCarousel.jsx`, `package.json`, `Header.jsx`, `tmdbClient.js`, `isTmdbEnabled`, `historyService.js`, `useLocalStorage`, `useReveal`?**
  _High betweenness centrality (0.171) - this node is a cross-community bridge._
- **Why does `react-router-dom` connect `react` to `recommender.js`, `DuoPage.jsx`, `DuoSeenStep.jsx`, `HeroCarousel.jsx`, `package.json`, `Header.jsx`, `isTmdbEnabled`, `historyService.js`, `useLocalStorage`, `useReveal`?**
  _High betweenness centrality (0.064) - this node is a cross-community bridge._
- **What connects `name`, `private`, `version` to the rest of the system?**
  _98 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `react` be split into smaller, more focused modules?**
  _Cohesion score 0.058909769425563106 - nodes in this community are weakly interconnected._
- **Should `recommender.js` be split into smaller, more focused modules?**
  _Cohesion score 0.07433489827856025 - nodes in this community are weakly interconnected._
- **Should `DuoPage.jsx` be split into smaller, more focused modules?**
  _Cohesion score 0.052100840336134456 - nodes in this community are weakly interconnected._
- **Should `HeroCarousel.jsx` be split into smaller, more focused modules?**
  _Cohesion score 0.06201923076923077 - nodes in this community are weakly interconnected._