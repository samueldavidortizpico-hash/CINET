# Graph Report - CINET  (2026-09-29)

## Corpus Check
- 152 files · ~339,066 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 721 nodes · 2306 edges · 23 communities (19 shown, 4 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 31 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `1dd4e6cb`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- FunctionsPage.jsx
- recommender.js
- Header.jsx
- movieService.js
- HeroCarousel.jsx
- package.json
- duoService.js
- Avatares de CINET
- tmdbClient.js
- Milestone 2 — React Frontend
- MoviesPage.jsx
- react
- authService.js
- vercel.json
- duo.js
- DuoPage.jsx
- check-avatar-policies.mjs
- Intervención 2026-09-27 — Claude Code (Claude Opus 5.5)
- AdvancedFilters.jsx
- public/images/SOURCES.md
- .vscode/images/SOURCES.md
- isTmdbEnabled
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
- `DuoPage()` --indirect_call--> `personName()`  [INFERRED]
  src/pages/DuoPage.jsx → src/data/duo.js
- `DashboardPage()` --indirect_call--> `getMovies()`  [INFERRED]
  src/pages/DashboardPage.jsx → src/services/movieService.js
- `DuoPage()` --indirect_call--> `genreName()`  [INFERRED]
  src/pages/DuoPage.jsx → src/services/recommender.js

## Import Cycles
- None detected.

## Communities (23 total, 4 thin omitted)

### Community 0 - "FunctionsPage.jsx"
Cohesion: 0.07
Nodes (56): react-router-dom, Button(), EmptyState(), BookingSummary(), AmbienceOptions(), CinemaOptions(), DateOptions(), optionClass() (+48 more)

### Community 1 - "recommender.js"
Cohesion: 0.07
Nodes (65): DuoCommonStep(), names(), toneNames(), valueLabel(), DuoEmptyState(), REASONS, clock(), DuoMarathon() (+57 more)

### Community 2 - "Header.jsx"
Cohesion: 0.19
Nodes (13): BrandLogo(), LABELS, TmdbStatus(), Footer(), Header(), Layout(), subscribe(), useNetworkStatus() (+5 more)

### Community 3 - "movieService.js"
Cohesion: 0.07
Nodes (45): movies, CINEMA_CHAINS, CINEMAS, MONTHS, SHOW_TIMES, WEEKDAYS, genreKeysFor(), genreLabel() (+37 more)

### Community 4 - "HeroCarousel.jsx"
Cohesion: 0.06
Nodes (49): DiceButton(), Icon(), PosterImage(), SkeletonRow(), DuoFinal(), CHAPTERS, DuoIntro(), POSTERS (+41 more)

### Community 5 - "package.json"
Cohesion: 0.06
Nodes (35): dependencies, react, react-dom, react-router-dom, @supabase/supabase-js, description, devDependencies, eslint (+27 more)

### Community 6 - "duoService.js"
Cohesion: 0.33
Nodes (13): discoverForDuo(), discoverParams(), enrich(), fetchSources(), genreIds(), pairSources(), sagaParts(), sources() (+5 more)

### Community 7 - "Avatares de CINET"
Cohesion: 0.22
Nodes (8): Archivos de la implementación, Avatares de CINET, Cómo funciona, Estado y alcance, Probar en localhost, Pruebas locales reproducibles, Seguridad, SQL manual en Supabase

### Community 8 - "tmdbClient.js"
Cohesion: 0.12
Nodes (29): ActorPicker(), listOf(), matchesTitleDetails(), cache, config, CONNECTION_ERRORS, discoverMovies(), discoverTv() (+21 more)

### Community 9 - "Milestone 2 — React Frontend"
Cohesion: 0.07
Nodes (26): 1. Buscar y explorar películas, 2. Consultar una película y sus funciones, 3. Crear un plan, 4. Consultar un plan, 5. Responder a un plan, Arquitectura, Capa offline (HW07), Cartelera y cadenas de cine (+18 more)

### Community 10 - "MoviesPage.jsx"
Cohesion: 0.17
Nodes (18): AdvancedFilters(), MovieFilters(), DEPARTMENTS, MovieSearch(), thumb(), useMovies(), EMPTY, unique() (+10 more)

### Community 11 - "react"
Cohesion: 0.09
Nodes (39): react, App(), router, AuthForm(), FIELDS, ProfileCard(), ROLE_LABELS, FIELDS (+31 more)

### Community 12 - "authService.js"
Cohesion: 0.12
Nodes (24): @supabase/supabase-js, AvatarUpload(), AuthContext, AuthProvider(), client(), getProfile(), login(), logout() (+16 more)

### Community 14 - "duo.js"
Cohesion: 0.06
Nodes (44): Modal(), trapFocus(), Chip(), ChoiceChips(), Question(), COUNTS, DuoModeStep(), MARATHON_TYPES (+36 more)

### Community 15 - "DuoPage.jsx"
Cohesion: 0.09
Nodes (41): DuoHistoryDialog(), DuoProgress(), CinephileProfile(), DEFAULT_MARATHON, DUO_HISTORY_KEY, DUO_SESSION_KEY, STEPS, useDuoHistory() (+33 more)

### Community 17 - "Intervención 2026-09-27 — Claude Code (Claude Opus 5.5)"
Cohesion: 0.25
Nodes (7): AI-LOG — CINET (antes CineHub), Cambios realizados, Intervención 2026-09-27 — Claude Code (Claude Opus 5.5), Pendiente / limitaciones, Pruebas ejecutadas y resultados, Qué existía antes (inspeccionado), Qué se pidió

### Community 18 - "AdvancedFilters.jsx"
Cohesion: 0.31
Nodes (6): RATINGS, RUNTIMES, GENRES, LANGUAGES, REGIONS, TV_LABELS

### Community 23 - "isTmdbEnabled"
Cohesion: 0.13
Nodes (20): search(), DuoSeenStep(), findTitles(), popularTitles(), CollectionSection(), INITIAL_FILTERS, MovieContext, MovieProvider() (+12 more)

### Community 24 - "MovieBackdrop.jsx"
Cohesion: 1.00
Nodes (3): createParticles(), MovieBackdrop(), prefersReducedMotion()

## Knowledge Gaps
- **120 isolated node(s):** `name`, `private`, `version`, `description`, `type` (+115 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 155 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `react` to `FunctionsPage.jsx`, `recommender.js`, `Header.jsx`, `HeroCarousel.jsx`, `package.json`, `MoviesPage.jsx`, `authService.js`, `duo.js`, `DuoPage.jsx`, `AdvancedFilters.jsx`, `isTmdbEnabled`, `MovieBackdrop.jsx`?**
  _High betweenness centrality (0.204) - this node is a cross-community bridge._
- **Why does `react-router-dom` connect `FunctionsPage.jsx` to `recommender.js`, `Header.jsx`, `HeroCarousel.jsx`, `package.json`, `MoviesPage.jsx`, `react`, `duo.js`, `DuoPage.jsx`?**
  _High betweenness centrality (0.061) - this node is a cross-community bridge._
- **Why does `Button()` connect `FunctionsPage.jsx` to `recommender.js`, `HeroCarousel.jsx`, `react`, `authService.js`, `duo.js`, `DuoPage.jsx`, `isTmdbEnabled`?**
  _High betweenness centrality (0.021) - this node is a cross-community bridge._
- **What connects `name`, `private`, `version` to the rest of the system?**
  _120 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `FunctionsPage.jsx` be split into smaller, more focused modules?**
  _Cohesion score 0.07429526994744386 - nodes in this community are weakly interconnected._
- **Should `recommender.js` be split into smaller, more focused modules?**
  _Cohesion score 0.07367641614216956 - nodes in this community are weakly interconnected._
- **Should `movieService.js` be split into smaller, more focused modules?**
  _Cohesion score 0.07183673469387755 - nodes in this community are weakly interconnected._