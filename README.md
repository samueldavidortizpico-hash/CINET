# CineHub (marca visible: CINET)

> La marca visible de la app es **CINET** (logo en `images/cinet-logo.png`). CineHub se conserva como nombre
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
npm run dev       # desarrollo → http://localhost:5173/CINET/
npm run build     # build de producción en dist/ (incluye 404.html para GitHub Pages)
npm run preview   # sirve el build localmente
npm run lint      # ESLint (reglas de hooks de React)
npm test          # pruebas de la lógica pura (node:test): catálogo, planes, TMDB simulado y algoritmo Duo
npm run test:tmdb # prueba REAL contra TMDB (necesita VITE_TMDB_READ_TOKEN en .env)
```

### Rutas

| Ruta | Página | Notas |
| --- | --- | --- |
| `/` | — | Redirige a `/home` |
| `/home` | `HomePage` | Carrusel de tendencias, buscador, filas de descubrimiento, planes recientes y FAQ |
| `/duo` | `DuoPage` | CineHub Duo: película, serie o maratón para dos personas (`?from=id` parte de un título) |
| `/movies` | `MoviesPage` | Catálogo con búsqueda, filtros por género y orden |
| `/movie/:id` | `MovieDetailPage` | **Ruta dinámica** (`useParams`) · tráiler · plataformas · favoritos · compartir |
| `/functions?movie=id` | `FunctionsPage` | Elegir cine, fecha y hora (`useSearchParams`) |
| `/create-plan` | `CreatePlanPage` | Formulario del plan con la función elegida |
| `/plan/:id` | `PlanPage` | **Ruta dinámica** · responder Sí / Tal vez / No · editar (organizador) |
| `/my-plans` | `MyPlansPage` | Estadísticas, filtro próximos/anteriores, compartir y eliminar |
| `/profile` | `ProfilePage` | **Login + registro + perfil** en una sola pantalla (según haya sesión) |
| `/login` | — | Alias: redirige a `/profile` (no hay pantalla de login aparte) |
| `/plans` | — | Alias: redirige a `/my-plans` |
| `/cine` · `/cine/:id` | `CinemaPage` · `CinemaTicketsPage` | Cartelera TMDB (región CO) y enlace a la página oficial de cada cadena |
| `/dashboard` | `DashboardPage` | **Ruta protegida** (`ProtectedRoute`): sin sesión redirige a `/profile` |
| `/about` | `AboutPage` | Proyecto y equipo |
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
- **Autenticación local:** `authService` registra usuarios en `localStorage` con la contraseña en hash
  SHA-256 (nunca en texto plano). Es un mock hasta tener backend.
- **Roles del M1:** quien crea un plan (con sesión) es su organizador; solo él ve *Editar* y *Eliminar*.
  Los planes creados sin sesión o con el prototipo anterior los puede gestionar cualquiera.
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
- Tres situaciones distintas y visibles: **catálogo local** (falta `VITE_TMDB_READ_TOKEN`), **datos guardados de TMDB**
  (error de red con caché) y **error sin datos** (error de red sin caché; en `/cine` se muestra un mensaje de error).
- Límite: no hay service worker, así que recargar la página sin internet no carga la app; la caché cubre caídas de TMDB
  y pérdidas de red con la app ya abierta.

### Cartelera y cadenas de cine

TMDB aporta títulos, imágenes, metadatos y fechas (región CO). CINET **no conoce horarios reales**: no existe una API
oficial de las cadenas. Cine Colombia, Cinemark, Cinépolis, Royal Films y Procinal solo se enlazan a su página oficial;
no hay integración API con ellas. La autenticación es **local y demostrativa** (sin backend).

### GitHub Pages

- `vite.config.js` define `base: "/CINET/"` y el router usa ese `basename`.
- **Refresh en rutas profundas:** el build copia `index.html` como `404.html`. GitHub Pages sirve ese
  archivo para `/movie/dune` y React Router resuelve la ruta.
- **Deploy:** el sitio se sirve desde la rama `gh-pages` (*Settings → Pages → Deploy from a branch → gh-pages*),
  que contiene solo el contenido de `dist/`. Para publicar una nueva versión (sin `.env`, así el bundle no lleva token
  de TMDB y usa el catálogo local):

  ```bash
  npm run build
  cd dist && git init -b gh-pages && git add -A && git commit -m "deploy"     && git push -f https://github.com/samueldavidortizpico-hash/CINET.git gh-pages
  ```

**[Ver CINET en GitHub Pages](https://samueldavidortizpico-hash.github.io/CINET/)**

### CineHub Duo

Flujo guiado de 7 pasos con progreso, resumen siempre visible y cada paso editable:
**modo** (película, serie o maratón; región y plataformas) → **persona 1** → **persona 2** (géneros
♥ me gusta / ★ imprescindible / ✕ no quiero, tono, duración o —en series— episodio, temporadas y estado,
actores) → **ya vistas** → **en común** (límites efectivos y conflictos) → **resultados** → **elección**.

**Algoritmo (`services/recommender.js`, funciones puras y probadas).**

1. *Filtros obligatorios* (`checkTitle`): tipo (nunca mezcla películas y series), historial, quitados de la
   sesión, sin estrenar, géneros rechazados, imprescindibles, gustos de cada persona, duración, temporadas y
   estado de la serie, plataformas. Si fallan, el título no aparece. Solo se amplían a mano (+30 min, otras
   plataformas, "le gusta a uno solo"); esos títulos van después y su motivo empieza por "Es una alternativa…".
2. *Puntuación* (`scoreTitle`): `score = Σ WEIGHTS[c] × valor[c]` con valores en [0, 1]:
   género 30 · subgénero (combina dos elegidos) 10 · tono 15 · reparto 10 · encaja con ambos 20 ·
   duración 5 · calidad bayesiana 15 · popularidad 5 · favorito 8 · recomendada hace poco −30.
   No se muestran porcentajes: cada tarjeta explica su motivo con frases verificables y el desglose de puntos.
3. *Diversidad* (`diversify`): penaliza encadenar títulos del mismo género o saga.
4. *Dado* (`rollDice`): sorteo ponderado `e^((score − mejor)/12)` solo entre títulos válidos, sin repetir lo
   que está en pantalla, lo anterior ni (mientras haya otros) lo recomendado hace poco.
5. *Maratón* (`buildMarathon`): llena el tiempo de la sesión según estilo (temática, variada, equilibrada) y
   alcance (mezcla o saga en orden de estreno); en series reparte episodios. Se puede reemplazar o quitar cada
   título, regenerar todo y guardarla como plan.

**Sin repeticiones** (`services/historyService.js`, clave `cinehub-duo-history`): vistas, rechazadas (ambos
votan ❌), "no me interesa" (se excluyen siempre, con opción de recuperarlas), recomendadas hace poco
(bajan de puesto) y quitadas de la sesión. "Ver títulos excluidos" permite recuperar o reiniciar el historial.

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
