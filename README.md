# CineHub (marca visible: CINET)

La experiencia nueva de Duo (ocasiones, comparación breve y preparación de casa/cine) y su evidencia local se describen en [docs/DUO-EXPERIENCIA-2026-10-09.md](docs/DUO-EXPERIENCIA-2026-10-09.md).

> La marca visible de la app es **CINET** (logo vectorial en `components/common/BrandLogo.jsx`). CineHub se conserva como nombre
> del proyecto académico, del paquete y de las claves de `localStorage`.

Proyecto del curso DSAW · Universidad de La Sabana — **Milestone 2: React Frontend** (React + Vite + React Router).

**Equipo:** Samuel Díaz Melo, Samuel David Ortiz Pico, David Fernando Gómez y Juan Pablo Vanegas.

---

## Problema

En Colombia, los grupos de amigos suelen perder demasiado tiempo coordinando por WhatsApp qué hacer juntos y, específicamente, qué película ver, en qué cine y a qué hora.

La información sobre películas, horarios y lugares termina mezclada entre mensajes del chat. Además, no existe un espacio centralizado donde una persona pueda proponer un plan y consultar fácilmente quién confirmó su asistencia.

Como consecuencia, los planes pueden perderse entre las conversaciones o terminar cancelándose porque el grupo no logra ponerse de acuerdo.

### Usuario identificado

CineHub está dirigido principalmente a **estudiantes universitarios y grupos de amigos en Colombia** que quieren organizar una salida al cine y necesitan una forma sencilla de decidir qué película ver, seleccionar una función y confirmar quién asistirá.

---

## Justificación de la aplicación web

CineHub se plantea como una aplicación web porque permite centralizar la información y compartir los planes mediante un enlace, sin exigir la instalación de una aplicación adicional.

La solución está justificada frente a alternativas más simples por las siguientes razones:

1. **WhatsApp no estructura la información de una película.**  
   Un grupo de WhatsApp puede servir para conversar, pero la información sobre póster, calificación, género, cine y horarios queda dispersa entre los mensajes.

2. **Una hoja de cálculo no ofrece una experiencia adecuada para este problema.**  
   Puede almacenar información, pero no está diseñada para presentar una cartelera de películas y permitir una interacción sencilla para responder a un plan.

3. **Las plataformas de cine tienen un objetivo diferente.**  
   Servicios como Cine Colombia o Cinemark permiten consultar funciones y comprar boletas, pero no están enfocados en resolver el problema de coordinación de un grupo de amigos: decidir qué película ver y saber quién realmente asistirá.

4. **Una aplicación web facilita el acceso desde diferentes dispositivos.**  
   Un usuario puede abrir un enlace desde un computador, tablet o celular sin necesidad de instalar una aplicación.

Por estas razones, una aplicación web permite combinar la exploración de películas con la creación y coordinación de planes entre amigos.

---

## Usuarios objetivo

Los usuarios principales de CineHub son:

- Estudiantes universitarios.
- Grupos de amigos.
- Personas que desean organizar una salida al cine.
- Usuarios que necesitan comparar películas y horarios antes de tomar una decisión grupal.

---

## Roles de usuario

CineHub contempla dos roles principales con permisos diferentes:

### Organizador del plan

El organizador puede:

- Seleccionar una película.
- Seleccionar el cine.
- Seleccionar fecha y hora.
- Crear un plan.
- Compartir el plan con otros usuarios.
- Consultar las respuestas de los invitados.
- Editar o cancelar los planes que crea.

### Invitado

El invitado puede:

- Consultar el plan al que fue invitado.
- Ver la información de la película.
- Consultar fecha, hora y lugar.
- Responder **Sí / Tal vez / No**.
- Consultar la información necesaria para decidir su asistencia.

El invitado no puede crear, editar ni cancelar planes creados por otros usuarios.

---

## Funcionalidades principales

El prototipo contempla un flujo completo compuesto por las siguientes funcionalidades:

### 1. Buscar y explorar películas

El usuario puede consultar la cartelera disponible, visualizar información de las películas y utilizar el buscador para encontrar una película específica.

### 2. Consultar una película y sus funciones

El usuario puede seleccionar una película y acceder a información relacionada con sus funciones, incluyendo cine, fecha y hora.

### 3. Crear un plan

El organizador puede seleccionar una película, función y datos del plan para generar una propuesta de salida con sus amigos.

### 4. Consultar un plan

El usuario puede acceder a la información del plan creado y consultar los datos principales de la salida.

### 5. Responder a un plan

Los invitados pueden indicar su disponibilidad mediante las opciones:

- **Voy**
- **Tal vez**
- **No puedo**

El prototipo representa este flujo de confirmación para demostrar cómo se coordinaría la asistencia de los integrantes del grupo.

---

## Milestone 2 — React Frontend

El prototipo estático (HTML + CSS + JavaScript con manipulación directa del DOM) se migró a una
**aplicación React de una sola página (SPA)** construida con **Vite**, **React Router**, **Context API**
y **custom hooks**, manteniendo la identidad visual y todas las funcionalidades del prototipo.

### Cómo ejecutarlo

```bash
npm install
npm run dev       # desarrollo → http://localhost:5173/
npm run build     # build de producción en dist/ (incluye 404.html para GitHub Pages)
npm run preview   # sirve el build localmente
npm run lint      # ESLint (reglas de hooks de React)
npm test          # node:test: lógica, algoritmo Duo, proxy TMDB, analítica y permisos SQL de planes (PGlite)
npm run test:e2e  # Playwright (Chromium): modo local + cuentas en navegadores separados (salas y plan compartido)
                  # contra la SQL real en PGlite (e2e/support/fake-supabase.mjs); sin secretos ni servicios externos
npm run test:tmdb # prueba REAL contra TMDB (necesita TMDB_READ_TOKEN en .env)
npm run catalog:snapshot # respaldo fechado de metadatos de TMDB en snapshots/ (no es cartelera; ver docs/COSTOS-Y-MERCADO.md)
```

Variables: ver `.env.example`. `TMDB_READ_TOKEN` es **solo de servidor** (lo usa el proxy `/api/tmdb`, en dev y en
Vercel); el navegador nunca recibe el token y el build falla si un secreto llega al bundle. Sin token, la app usa el
catálogo local. CI: `.github/workflows/ci.yml` (lint, pruebas, build y E2E en cada push y pull request).

### Rutas

| Ruta | Página | Notas |
| --- | --- | --- |
| `/` | — | Redirige a `/home` |
| `/home` | `HomePage` | Carrusel de tendencias, buscador, filas de descubrimiento, planes recientes y FAQ |
| `/duo` | `DuoPage` | CineHub Duo: película, serie o maratón para 1 a 8 personas (`?from=id` parte de un título) |
| `/movies` | `MoviesPage` | Catálogo con búsqueda, filtros por género y orden |
| `/movie/:id` | `MovieDetailPage` | **Ruta dinámica** (`useParams`) · tráiler · plataformas · favoritos · compartir |
| `/functions?movie=id` | `FunctionsPage` | Proponer cadena oficial, sede, fecha y hora (no son funciones confirmadas) |
| `/create-plan` | `CreatePlanPage` | Formulario del plan con la propuesta elegida (con cuenta se guarda en Supabase) |
| `/plan/:id` | `PlanPage` | **Ruta dinámica** · plan compartido: invitar con enlace, RSVP de cada cuenta, editar/cancelar (organizador) |
| `/invite/:token` | `InvitePage` | Unirse a un plan con un enlace de invitación (pide iniciar sesión) |
| `/duo/sala` · `/duo/sala/:code` | `DuoRoomPage` | Sala de Duo: cada quien vota desde su teléfono (código, enlace o QR; invitados sin email si Supabase lo permite) |
| `/grupos` · `/grupos/:id` · `/grupos/unirse/:token` | `GroupsPage` | Grupos guardados: invitar con enlace, sumar a un plan, ver sus planes |
| `/importar` | `ImportPage` | Importar historial CSV (Letterboxd/IMDb) sin duplicar ni inventar coincidencias |
| `/resumen` | `RecapPage` | Resumen de lo visto y de los planes |
| `/aliados` | `PartnerPage` | Panel de cines y organizadores verificados: sedes, funciones, ofertas y equipo |
| `/plus` | `PlusPage` | CINET Plus: qué es gratis, qué es Plus, prueba sin cobro (si el sandbox está encendido) y prueba de precio |
| `/my-plans` | `MyPlansPage` | Estadísticas, filtro, importar planes locales a la cuenta, eliminar |
| `/` | `AuthPage` | Entrada: bienvenida animada (una vez por sesión) → acceso. Con sesión va directo a `/home` o al destino pendiente |
| `/login` · `/register` | `AuthPage` | Iniciar sesión / crear cuenta en la misma pantalla (vuelven a la página de origen) |
| `/recuperar` · `/nueva-contrasena` | `AuthPage` | Pedir enlace de recuperación / crear contraseña nueva desde el enlace del correo |
| `/profile` | `ProfilePage` | Perfil y ajustes de la cuenta (sin sesión lleva a `/login` y vuelve) |
| `/legal` · `/legal/:doc` | `LegalPage` | Legal y privacidad (públicas): términos, privacidad, cancelaciones y créditos. **Borradores** (ver `docs/LEGAL-PENDIENTES.md`) |
| `/plans` | — | Alias: redirige a `/my-plans` |
| `/cine` · `/cine/:id` | `CinemaPage` · `CinemaTicketsPage` | Cartelera TMDB (región CO) y enlace a la página oficial de cada cadena |
| `/dashboard` | `DashboardPage` | **Ruta protegida** (`ProtectedRoute`): sin sesión redirige a `/login` y vuelve. Se abre desde el panel del avatar |
| `/about` | — | Retirada: redirige a `/legal/creditos` (atribuciones de TMDB y JustWatch) |
| `*` | `NotFoundPage` | Ruta inexistente |

### Arquitectura

```text
src/
├── main.jsx                 Punto de entrada: monta <App/> e importa los estilos
├── App.jsx                  Proveedores de contexto + RouterProvider
├── app/router.jsx           Definición de rutas (createBrowserRouter)
├── pages/                   Una página por ruta (composición, sin lógica pesada)
├── components/
│   ├── layout/              Layout (Header + Outlet + Footer), Header, Navbar, Footer
│   ├── common/              Button, Modal, Loading, EmptyState, Toast, PosterImage, DiceButton
│   ├── movies/              MovieCard, MoviePoster, MovieGrid, MovieSearch, MovieFilters
│   ├── movie-detail/        MovieInfo, MovieActions, MovieBackdrop, TrailerModal, WatchModal…
│   ├── functions/           SelectedMovie, ShowtimeStep, ShowtimeOptions, BookingSummary
│   ├── plans/               PlanCard, PlanForm, PlanStats, PlanHero, PlanSummary, RsvpPanel
│   ├── duo/                 Pasos de Duo, tarjeta de recomendación, maratón, elección y excluidos
│   ├── home/ · auth/        HeroCarousel y filas del inicio · AuthForm y ProfileCard
│   └── ProtectedRoute.jsx   Guardia de rutas privadas
├── context/                 AuthContext, MovieContext, PlanContext, ToastContext
├── hooks/                   useMovies, useMovie, useAuth, usePlans, useFavorites,
│                            useLocalStorage, useDuoSession, useDuoHistory, usePrefersReducedMotion…
├── services/                movieService, planService, authService, tmdbClient,
│                            recommender (algoritmo Duo), historyService, duoService (+ pruebas)
├── utils/                   storage, validation, palette, share, poster
├── data/                    Catálogo de 40 películas, tráilers, cines, plataformas, FAQ
└── styles/                  Global, componentes, páginas y design.css (capa de diseño, va última)
```

**Flujo de datos:** `data/` → `services/` (consultas y transformación) → `context/` (estado global) →
`hooks/` (API para los componentes) → `pages/` → `components/`. Los componentes solo renderizan y
delegan acciones; ninguno accede a `localStorage` directamente.

### Decisiones clave (para la defensa)

- **Context API sin prop drilling.** `MovieContext` guarda catálogo y filtros: lo que se escribe en el
  buscador del inicio sigue aplicado en `/movies`. `PlanContext` guarda planes y la función elegida entre
  `/functions` y `/create-plan`. `AuthContext` expone `user`, `login`, `register`, `logout` e
  `isAuthenticated`. Cada contexto tiene un hook de consumo (`useMovies`, `usePlans`, `useAuth`).
- **`useLocalStorage` centraliza la persistencia** (favoritos, planes, tema, sesión, función elegida).
  Se suscribe a cambios con *cleanup*, así varias instancias —y otras pestañas— quedan sincronizadas.
  Lee los datos que el prototipo ya había guardado (mismas claves `cinehub-*`).
- **Efectos con limpieza:** listeners de teclado (Ctrl + K, Escape en modales), `mousemove` del parallax,
  `IntersectionObserver` de las animaciones de scroll, temporizadores del toast y del tráiler automático,
  y respuestas asíncronas ignoradas si el componente se desmonta (`useMovie`, `MovieContext`).
- **Servicios con Promises:** `getMovies()` y `getMovieById()` devuelven Promises aunque los datos son
  locales, para cambiar a la API del backend (M3) sin tocar los componentes.
- **Cuentas con Supabase Auth:** `authService` usa Supabase (perfiles, roles y avatares). Sin Supabase
  configurado, la app funciona sin cuentas y lo dice.
- **Planes compartidos con permisos reales:** con sesión, los planes viven en Supabase
  (`supabase/migrations/20261009120000_shared_plans.sql`): las tablas solo se leen si eres miembro (RLS) y toda
  escritura pasa por funciones RPC que comprueban quién eres. Cada persona confirma con su cuenta (nadie responde
  por otra), las invitaciones son enlaces con caducidad, usos y revocación, y la edición usa versión para no pisar
  cambios. Sin sesión, los planes se guardan solo en el navegador (y se pueden pasar a la cuenta después).
- **Capa de diseño.** `design.css` va la última en la cascada: tokens (neutros cálidos + un acento rojo),
  Outfit para títulos e Inter para leer, foco visible, botones, carrusel, tarjetas y dado. Las hojas de cada
  página siguen encapsuladas con `:where([data-page="…"])`. El CSS sin uso del prototipo se eliminó.
- **localStorage tolerante a fallos.** `utils/storage.js` sanea JSON dañado y, si el navegador bloquea el
  almacenamiento, guarda en memoria (Duo avisa que se perderá al recargar).

### Capa offline (HW07)

- `hooks/useNetworkStatus.js`: `navigator.onLine` + eventos `online`/`offline` (cleanup vía `useSyncExternalStore`).
  Sin conexión, el `Layout` muestra un aviso y el pie indica «En línea» / «Sin conexión».
- `tmdbClient.js` guarda cada respuesta correcta de TMDB en `localStorage` (`cinehub-tmdb:<url>`, vía `utils/storage.js`,
  que tolera JSON dañado, caché inexistente y almacenamiento bloqueado). Si TMDB falla por red, timeout, 5xx o 429,
  devuelve la copia guardada y el estado muestra **«Showing saved data»**.
- Tres situaciones distintas y visibles: **catálogo local** (el servidor no tiene `TMDB_READ_TOKEN`), **datos guardados de TMDB**
  (error de red con caché) y **error sin datos** (error de red sin caché; en `/cine` se muestra un mensaje de error).
- Límite: no hay service worker, así que recargar la página sin internet no carga la app; la caché cubre caídas de TMDB
  y pérdidas de red con la app ya abierta.

### Cartelera y cadenas de cine

TMDB aporta títulos, imágenes, metadatos y fechas (región CO). CINET **no conoce horarios reales**: no existe una API
oficial de las cadenas. Cine Colombia, Cinemark, Cinépolis, Royal Films y Procinal solo se enlazan a su página oficial;
no hay integración API con ellas. Al planear una salida, la hora la **propone** quien organiza y el plan enlaza a la
cartelera oficial de la cadena para confirmar función y precio.

### Vercel

- `vite.config.js` define `base: "/"` y el router usa ese `basename` (`import.meta.env.BASE_URL`).
- **Refresh en rutas profundas:** `vercel.json` envía `/api/tmdb/*` a la función `api/tmdb.js` y reescribe el
  resto de rutas a `index.html`, así `/movie/dune` carga la SPA y React Router resuelve la ruta.
- **Deploy:** Vercel detecta Vite (`npm run build`, salida `dist/`) y publica cada push a `main`.
  Variables en *Project → Settings → Environment Variables*: `TMDB_READ_TOKEN` (solo servidor; la usa la función
  `api/tmdb.js`), `VITE_SUPABASE_URL` y `VITE_SUPABASE_PUBLISHABLE_KEY` (públicas por diseño) y, opcional,
  `VITE_ANALYTICS_ENDPOINT`. **No definir `VITE_TMDB_READ_TOKEN`**: todo `VITE_*` llega al navegador (si existía,
  borrarla y rotar el token en TMDB).
- **Funciones y variables de servidor:** `api/og.js` (vista previa de enlaces; `APP_ORIGIN`), `api/partner-webhook.js`
  (`PARTNER_WEBHOOK_SECRETS`) y `api/billing-webhook.js` (`BILLING_WEBHOOK_SECRET`; no hay pasarela conectada); los
  webhooks usan `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` y responden 503 si faltan. Ver `.env.example`.
- **PWA:** `public/manifest.webmanifest` y `public/sw.js` (solo en producción; guarda únicamente archivos públicos del
  sitio, nunca `/api` ni Supabase; cada build cambia su versión y `vercel.json` lo sirve con `no-cache`).
- La rama `gh-pages` (GitHub Pages en `/CINET/`) ya no se actualiza: con `base: "/"` ese build no funciona allí.

### CineHub Duo

Flujo guiado con progreso, resumen siempre visible y cada paso editable, **para 1 a 8 personas**:
**plan** (¿quiénes ven? solo / en pareja / en grupo de 3 a 8; película, serie o maratón; región y plataformas)
→ **un paso por persona** (géneros ♥ me gusta / ★ imprescindible / ✕ no quiero, tono, duración o —en
series— episodio, temporadas y estado, actores) → **ya vistas** → **en común** (lo de todos, lo de la
mayoría, lo que aporta cada uno, límites y conflictos con nombre) → **resultados** → **elección**.

Cada persona es una **butaca de color** (`DuoSeats.jsx`) que la acompaña en todo el recorrido: en las
tarjetas, la butaca se ilumina si el título encaja con sus gustos (verificable: género, tono o actor).
La **ronda de votación** (`DuoVoteRound.jsx`) es un "pásale el celular": cada persona vota en secreto las
mismas 8 opciones (← no · ↓ quizá · → sí) y al final se revelan los votos, los *match* y la más votada.

**Algoritmo (`services/recommender.js`, funciones puras y probadas).**

1. *Perfil del grupo* (`buildProfile`): límites = el menor; imprescindibles y rechazados = la unión;
   "a todos" = la intersección; en grupos de 3+, "la mayoría" = géneros que eligió al menos la mitad.
2. *Filtros* (`checkTitle`): tipo, historial, quitados, sin estrenar, rechazados, imprescindibles, duración,
   temporadas, estado y plataformas. Un título "cumple todo" si encaja con el **quórum**: todas las personas
   en solitario o pareja; 2/3 del grupo desde 3. Se amplían a mano (+30 min, otras plataformas, "no encaja con
   todos"); esos títulos van después y su motivo empieza por "Es una alternativa…".
3. *Puntuación* (`scoreTitle`): `score = Σ WEIGHTS[c] × valor[c]` con valores en [0, 1]:
   género 30 · subgénero 10 · tono 15 · reparto 10 · **grupo 20** · duración 5 · calidad bayesiana 15 ·
   popularidad 5 · **estreno 6** · **votos de la sesión ±14** · favorito 8 · recomendada hace poco −30.
   *Grupo* = ½ media + ½ mínimo de los ajustes por persona ("menor descontento": nadie se queda fuera).
   *Votos de la sesión*: parecido a lo que votaron "sí" menos parecido a lo que votaron "no"; el ranking
   aprende mientras votan ("Se parece a «X», que les gustó"). Sin porcentajes: motivos verificables y desglose.
4. *Diversidad y reparto* (`diversify`): penaliza encadenar títulos parecidos y, desde el 2.º puesto, adelanta
   una opción para quien aún no tenga ninguna suya.
5. *Dado* (`rollDice`): sorteo ponderado `e^((score − mejor)/10)` solo entre títulos válidos, sin repetir
   lo que está en pantalla, lo anterior ni (mientras haya otros) lo recomendado hace poco.
6. *Maratón* (`buildMarathon`): llena el tiempo según estilo y alcance (mezcla o saga en orden de estreno).

**Catálogo vivo** (`services/duoService.js`): con TMDB, Duo combina populares, **estrenos del último año**,
joyas poco vistas, internacionales, combinaciones de géneros entre personas (primero las que gustan a más
gente) y actores elegidos; enriquece los mejores con disponibilidad por región, duración, temporadas y saga.

**Sin repeticiones** (`services/historyService.js`, clave `cinehub-duo-history`): vistas, rechazadas (todas
las personas votan ❌), "no me interesa" (se excluyen siempre, con opción de recuperarlas), recomendadas hace
poco (bajan de puesto) y quitadas de la sesión. "Ver títulos excluidos" permite recuperar o reiniciar.

### Prototipo anterior

La versión HTML/CSS/JS del Milestone 1 sigue en el historial de git (commits anteriores a la migración a React).

---

## Figma

Los wireframes del proyecto fueron desarrollados en Figma.

El diseño contempla las pantallas principales del proyecto:

1. Inicio.
2. Películas.
3. Mis planes.
4. Buscar.
5. Acerca de.

**[Ver wireframes de CineHub en Figma](https://www.figma.com/design/GJN2lOeZOoOmQL95y17bI5/CINEHUB--copia-?node-id=2002-2)**

Los wireframes mantienen una estructura visual consistente y sirven como base para el desarrollo del prototipo web.

---

## Restricciones del proyecto (verificadas)

- [x] Resuelve un problema real e identificable para un usuario específico
- [x] Justificado como app web (no hoja de cálculo, no herramienta existente, no solo-móvil)
- [x] Soporta 2 roles de usuario con permisos distintos (Organizador / Invitado)
- [x] Al menos 3 funcionalidades demostrables de principio a fin
- [x] No es clon de una app importante (no es Netflix, Twitter, Instagram)
