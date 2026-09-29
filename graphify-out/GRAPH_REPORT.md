# Graph Report - CINET  (2026-09-28)

## Corpus Check
- 150 files · ~338,111 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 707 nodes · 2294 edges · 23 communities (20 shown, 3 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 31 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `a4569e2a`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- router.jsx
- recommender.js
- useLocalStorage
- movieService.js
- DuoRecommendationCard.jsx
- package.json
- duoService.js
- HeroCarousel.jsx
- tmdbClient.js
- Milestone 2 — React Frontend
- react
- services.test.js
- App.jsx
- vercel.json
- DuoPage.jsx
- historyService.js
- FunctionsPage.jsx
- Intervención 2026-09-27 — Claude Code (Claude Opus 5.5)
- tmdb.js
- public/images/SOURCES.md
- .vscode/images/SOURCES.md
- tmdbClient.test.js
- MovieBackdrop.jsx

## God Nodes (most connected - your core abstractions)
1. `react` - 58 edges
2. `isTmdbEnabled()` - 35 edges
3. `useDocumentTitle()` - 31 edges
4. `Button()` - 29 edges
5. `react-router-dom` - 28 edges
6. `useToast()` - 27 edges
7. `useAsync()` - 25 edges
8. `useAuth()` - 25 edges
9. `useLocalStorage()` - 24 edges
10. `usePlans()` - 21 edges

## Surprising Connections (you probably didn't know these)
- `search()` --calls--> `searchCatalog()`  [EXTRACTED]
  scripts/tmdb-live.mjs → src/services/movieService.js
- `Availability()` --calls--> `regionName()`  [EXTRACTED]
  src/components/duo/DuoRecommendationCard.jsx → src/data/tmdb.js
- `DuoResults()` --indirect_call--> `genreName()`  [INFERRED]
  src/components/duo/DuoResults.jsx → src/services/recommender.js
- `DashboardPage()` --indirect_call--> `getMovies()`  [INFERRED]
  src/pages/DashboardPage.jsx → src/services/movieService.js
- `AuthForm()` --calls--> `useAuth()`  [EXTRACTED]
  src/components/auth/AuthForm.jsx → src/hooks/useAuth.js

## Import Cycles
- None detected.

## Communities (23 total, 3 thin omitted)

### Community 0 - "router.jsx"
Cohesion: 0.08
Nodes (58): react-router-dom, ProfileCard(), ROLE_LABELS, UserAvatar(), Button(), EmptyState(), Loading(), Toast() (+50 more)

### Community 1 - "recommender.js"
Cohesion: 0.08
Nodes (56): DuoEmptyState(), REASONS, clock(), DuoMarathon(), FunctionsPage(), getShowtimes(), recommendedStart(), toPlanMovie() (+48 more)

### Community 2 - "useLocalStorage"
Cohesion: 0.13
Nodes (21): BrandLogo(), Footer(), Header(), Layout(), asList(), PlanContext, PlanProvider(), useLocalStorage() (+13 more)

### Community 3 - "movieService.js"
Cohesion: 0.08
Nodes (32): movies, CINEMA_CHAINS, CINEMAS, MONTHS, SHOW_TIMES, WEEKDAYS, ALIASES, BY_TMDB_ID (+24 more)

### Community 4 - "DuoRecommendationCard.jsx"
Cohesion: 0.09
Nodes (30): PosterImage(), SkeletonRow(), DuoFinal(), Availability(), CRITERIA, DuoRecommendationCard(), SelectedMovie(), SlideMedia() (+22 more)

### Community 5 - "package.json"
Cohesion: 0.06
Nodes (35): dependencies, react, react-dom, react-router-dom, @supabase/supabase-js, description, devDependencies, eslint (+27 more)

### Community 6 - "duoService.js"
Cohesion: 0.27
Nodes (15): FORMAT_GENRES, SERIES_STATUS, discoverForDuo(), discoverParams(), enrich(), fetchSources(), genreIds(), pairSources() (+7 more)

### Community 7 - "HeroCarousel.jsx"
Cohesion: 0.10
Nodes (24): DiceButton(), Icon(), Modal(), trapFocus(), CHAPTERS, DuoIntro(), POSTERS, FaqItem() (+16 more)

### Community 8 - "tmdbClient.js"
Cohesion: 0.13
Nodes (25): listOf(), matchesTitleDetails(), cache, config, CONNECTION_ERRORS, discoverMovies(), discoverTv(), getTitleDetails() (+17 more)

### Community 9 - "Milestone 2 — React Frontend"
Cohesion: 0.07
Nodes (26): 1. Buscar y explorar películas, 2. Consultar una película y sus funciones, 3. Crear un plan, 4. Consultar un plan, 5. Responder a un plan, Arquitectura, Capa offline (HW07), Cartelera y cadenas de cine (+18 more)

### Community 10 - "react"
Cohesion: 0.11
Nodes (38): react, search(), ActorPicker(), DuoSeenStep(), findTitles(), popularTitles(), CollectionSection(), AdvancedFilters() (+30 more)

### Community 11 - "services.test.js"
Cohesion: 0.12
Nodes (24): AuthForm(), FIELDS, AvatarUpload(), FIELDS, ProfileForm(), AVATAR_ACCEPT, AVATAR_BUCKET, avatarFileError() (+16 more)

### Community 12 - "App.jsx"
Cohesion: 0.16
Nodes (17): @supabase/supabase-js, App(), router, AuthContext, AuthProvider(), ToastContext, ToastProvider(), client() (+9 more)

### Community 14 - "DuoPage.jsx"
Cohesion: 0.05
Nodes (66): DuoCommonStep(), names(), toneNames(), valueLabel(), Chip(), ChoiceChips(), Question(), COUNTS (+58 more)

### Community 15 - "historyService.js"
Cohesion: 0.18
Nodes (16): DuoHistoryDialog(), CinephileProfile(), DUO_HISTORY_KEY, useDuoHistory(), addToHistory(), asHistory(), EMPTY_HISTORY, excludedGroups() (+8 more)

### Community 16 - "FunctionsPage.jsx"
Cohesion: 0.21
Nodes (11): BookingSummary(), AmbienceOptions(), CinemaOptions(), DateOptions(), optionClass(), TimeOptions(), ShowtimeStep(), AMBIENCES (+3 more)

### Community 17 - "Intervención 2026-09-27 — Claude Code (Claude Opus 5.5)"
Cohesion: 0.25
Nodes (7): AI-LOG — CINET (antes CineHub), Cambios realizados, Intervención 2026-09-27 — Claude Code (Claude Opus 5.5), Pendiente / limitaciones, Pruebas ejecutadas y resultados, Qué existía antes (inspeccionado), Qué se pidió

### Community 18 - "tmdb.js"
Cohesion: 0.13
Nodes (19): genreKeysFor(), genreLabel(), GENRES, LANGUAGES, REGIONS, TV_LABELS, countryName(), discovered() (+11 more)

### Community 23 - "tmdbClient.test.js"
Cohesion: 0.20
Nodes (10): LABELS, TmdbStatus(), checkTmdbConnection(), configureTmdb(), getTmdbStatus(), searchMulti(), subscribeTmdbStatus(), connect() (+2 more)

### Community 24 - "MovieBackdrop.jsx"
Cohesion: 1.00
Nodes (3): createParticles(), MovieBackdrop(), prefersReducedMotion()

## Knowledge Gaps
- **112 isolated node(s):** `name`, `private`, `version`, `description`, `type` (+107 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 143 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `react` to `router.jsx`, `recommender.js`, `useLocalStorage`, `DuoRecommendationCard.jsx`, `package.json`, `HeroCarousel.jsx`, `services.test.js`, `App.jsx`, `DuoPage.jsx`, `historyService.js`, `FunctionsPage.jsx`, `tmdbClient.test.js`, `MovieBackdrop.jsx`?**
  _High betweenness centrality (0.212) - this node is a cross-community bridge._
- **Why does `react-router-dom` connect `router.jsx` to `recommender.js`, `useLocalStorage`, `DuoRecommendationCard.jsx`, `package.json`, `HeroCarousel.jsx`, `react`, `App.jsx`, `DuoPage.jsx`, `historyService.js`, `FunctionsPage.jsx`?**
  _High betweenness centrality (0.063) - this node is a cross-community bridge._
- **Why does `Button()` connect `router.jsx` to `recommender.js`, `DuoRecommendationCard.jsx`, `HeroCarousel.jsx`, `react`, `services.test.js`, `DuoPage.jsx`, `historyService.js`, `FunctionsPage.jsx`?**
  _High betweenness centrality (0.021) - this node is a cross-community bridge._
- **What connects `name`, `private`, `version` to the rest of the system?**
  _112 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `router.jsx` be split into smaller, more focused modules?**
  _Cohesion score 0.07553124342520513 - nodes in this community are weakly interconnected._
- **Should `recommender.js` be split into smaller, more focused modules?**
  _Cohesion score 0.08085317460317461 - nodes in this community are weakly interconnected._
- **Should `useLocalStorage` be split into smaller, more focused modules?**
  _Cohesion score 0.12688172043010754 - nodes in this community are weakly interconnected._