# AI-LOG — CINET (antes CineHub)

Registro de uso de IA. Solo contiene hechos verificados en esta intervención; no reconstruye tareas anteriores.

## Intervención 2026-09-27 — Claude Code (Claude Opus 5.5)

### Qué se pidió
Auditoría incremental del proyecto React + Vite y corrección de pendientes sin rehacer la app ni cambiar la
interfaz: capa offline HW07, rutas documentadas, AI-LOG, avisos TMDB/cartelera, y cambio de marca visible a
CINET usando únicamente el logo que aportó el usuario.

### Qué existía antes (inspeccionado)
- `createBrowserRouter` con `basename`, rutas dinámicas, 404, `/dashboard` protegido (redirige a `/profile`).
- `tmdbClient.js` con caché **en memoria** (TTL), estado de conexión y fallback local sin token.
- `utils/storage.js` ya toleraba JSON dañado y localStorage bloqueado (cae a memoria).
- `vite.config.js` copia `index.html` a `404.html` para GitHub Pages.
- Línea base ejecutada: `npm.cmd run lint` sin errores; `npm.cmd test` 33/33; `npm.cmd run build` correcto
  (aviso de chunk > 500 kB).

### Cambios realizados
- `src/hooks/useNetworkStatus.js` (nuevo): `navigator.onLine` + eventos `online`/`offline` con cleanup.
- `src/services/tmdbClient.js`: caché persistente de respuestas correctas (`cinehub-tmdb:<url>`); ante error de
  red/timeout/5xx/429 devuelve la copia guardada y el estado pasa a `saved`. `tmdbRequest` pasó de `.then()` a
  `async/await` con `try/catch`, sin cambiar su firma.
- `src/components/common/TmdbStatus.jsx`: etiqueta «Showing saved data», textos diferenciados (catálogo local /
  datos guardados / error) e indicador «En línea» / «Sin conexión».
- `src/components/layout/Layout.jsx`: aviso visible cuando el navegador está offline.
- `src/pages/CinemaPage.jsx`: mensajes distintos para falta de token, error sin datos, cartelera vacía y datos guardados.
- `src/app/router.jsx`: alias `/login` → `/profile` y `/plans` → `/my-plans` (redirecciones, sin pantallas nuevas).
- `src/components/layout/Header.jsx` + `src/styles/design.css`: logo `images/cinet-logo.png` en el header
  (alt «CINET», `object-fit: contain`, 44 px de alto en escritorio y 36 px en móvil, contorno claro en modo oscuro
  porque las letras del PNG son negras). La imagen original no se modificó; se movió de `assets/` a `images/` (sin copias).
- Texto visible «CineHub» → «CINET» en componentes, títulos de página e `index.html`. Se mantienen
  `CineHub` en comentarios, nombre del paquete y claves de localStorage (para no perder datos guardados).
- `src/styles/components/app.css`: estilos del estado `saved`, del indicador de red y del aviso offline.
- `src/services/tmdbClient.test.js`: 1 prueba nueva (caché usada sin red, error sin caché, JSON dañado).
- `README.md`: rutas equivalentes, capa offline, límites de cartelera y marca.

### Pruebas ejecutadas y resultados
- `npm.cmd run lint`: sin errores.
- `npm.cmd test`: 34 pruebas, 34 correctas.
- `npm.cmd run build`: correcto; el logo sale en `dist/assets/cinet-logo-<hash>.png` y existe `dist/404.html`.
- Navegador (Playwright sobre `vite preview`, con el token del `.env` local):
  - TMDB conectado: `/cine` mostró 24 películas y «TMDB conectado».
  - TMDB bloqueado con caché: «Showing saved data» y las 24 películas guardadas.
  - TMDB bloqueado sin caché: «Error al cargar la cartelera» y estado de error.
  - Eventos offline/online: el aviso aparece y desaparece; el indicador cambia.
  - `/login` → `/profile`, `/plans` → `/my-plans`, `/dashboard` sin sesión → `/profile`, ruta inexistente → 404,
    `/cine/cine-colombia` y `/movie/dune` cargan.
  - Logo: proporción 3.000 (132×44 escritorio, 108×36 móvil), sin overflow horizontal a 375 px; primer Tab
    enfoca el logo con outline visible.

### Pendiente / limitaciones
- Sin service worker: recargar la página sin internet no carga la app (probado: error del navegador).
- Refresh de rutas en GitHub Pages real no se probó; solo se comprobó que el build genera `404.html`.
- No se probó `/cine` sin token en el navegador (el `.env` local tiene token); cubierto por la prueba unitaria
  «sin token → modo local».
- No se validaron manualmente Dúo, maratón, dado, carrusel fijado, favoritos tras recargar ni dashboard con sesión:
  no se modificaron.
- Favicon: no se añadió; el logo es horizontal (2172×724) y no hay una versión cuadrada adecuada.
- La caché persistente no tiene límite de entradas; si se llena la cuota, `storage.js` guarda en memoria.
- La autenticación es local y demostrativa. CINET no conoce horarios reales ni tiene API con las cadenas de cine.
