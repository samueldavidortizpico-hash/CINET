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

## Intervención 2026-10-09 — Claude Code (Claude Opus 5.5)

### Qué se pidió
Llevar Duo de 2 personas a 1, 2 o más; mejorar mucho su UX, su aspecto y sus algoritmos; actualizar el
catálogo; limpiar código muerto y bugs; optimizar; y un informe con nota de CINET e ideas de negocio.

### Línea base (ejecutada antes de tocar nada)
`npm run lint` sin errores · `npm test` 50/50 · `npm run build` correcto (bundle único de 777 kB, aviso > 500 kB).

### Cambios realizados
- **Grupos de 1 a 8** (`data/duo.js`, `useDuoSession`, `DuoPage`): selector "¿Quiénes ven?" (solo / pareja /
  grupo con − y +), pasos dinámicos (`stepsFor`), un paso por persona, votos de N personas, textos en
  singular/plural. Las sesiones guardadas de 2 personas siguen funcionando.
- **Algoritmo** (`recommender.js`): perfil de grupo (todos, mayoría), quórum (todos hasta 2; 2/3 desde 3),
  ajuste por persona y criterio `group` = ½ media + ½ mínimo (menor descontento), bonus de estreno,
  aprendizaje con los votos de la sesión (`feedbackFrom`), reparto justo en `diversify` (nadie sin una
  opción suya), conflictos con nombres. `duoService`: fuente de estrenos del último año, combinaciones de
  géneros entre todas las parejas de personas, `groupLiked`/`groupRejected`/`tallyVotes`.
- **UX/UI**: butacas de color por persona (`DuoSeats.jsx`), tarjeta principal tipo cartelera y tarjetas
  compactas con acciones secundarias en menú, ronda de votación secreta "pásale el celular"
  (`DuoVoteRound.jsx`, teclado ← ↓ →), elección final como entrada "ADMITE N" con compartir.
  CSS de Duo consolidado en `styles/pages/duo.css` (se eliminó `duo-immersive.css`, que se pisaba con el anterior).
- **Bugs corregidos**: logos de plataformas encogidos (SVG anchos forzados a 44×44); desbordamiento horizontal
  de 160 px en móvil (etiquetas ocultas del progreso fuera de su lista con scroll); en la ronda, un rechazo
  de todos reordenaba la baraja a mitad de votación (ahora la baraja se congela); butacas apiladas en el
  recuento (selector demasiado amplio); póster diminuto de la tarjeta principal en móvil; 404 sin `h1`;
  barra de scroll blanca del menú en móvil.
- **Limpieza**: 74 archivos sin uso (`.vscode/images/` duplicados, `images/cinet-logo.png`,
  `src/assets/cinet-header-bg.png`), `saveHeroPreferences` sin llamadas.
- **Rendimiento**: carga diferida por ruta (`React.lazy` + `Suspense` en `Layout`): bundle inicial de
  777 kB → 501 kB (gzip 231 → 147 kB); Duo va en su propio archivo (77 kB).

### Pruebas ejecutadas y resultados
- `npm run lint`: sin errores. `npm test`: 57/57 (7 nuevas: solo, grupo y quórum, votos que enseñan,
  estrenos, sesión de N personas, recuento de la ronda, reparto justo). `npm run build`: correcto.
- Navegador (Playwright, `vite` con TMDB): flujo solo completo; pareja con ronda de votación por teclado
  (mismas 8 opciones para ambos, 2 match, elección final); grupo de 5 (quórum 3 de 4, la opción de quien
  tenía gustos distintos sube al 2.º puesto); 375 px sin desbordamiento; rutas diferidas sin errores de consola.

### Pendiente / limitaciones
- El bundle inicial sigue en 501 kB (React, React Router y Supabase); siguiente paso: cargar Supabase bajo demanda.
- La ronda es en un solo dispositivo; votar cada quien desde su celular requiere sala en tiempo real (Supabase Realtime).
- Planes y RSVP siguen en `localStorage`: no se comparten entre dispositivos.

## Intervención 2026-10-09 — Claude Code (Claude Opus 5.5) · Fase P0 de `docs/PROMPT-CODEX-CINET.md`

### Qué se pidió
Ejecutar el prompt de implementación por incrementos (P0 primero): proteger el token de TMDB, planes compartidos con
permisos reales, horarios honestos, CI y analítica, con evidencia y registro en `docs/IMPLEMENTACION-CINET.md`.
Sin commit, push, despliegue ni migraciones remotas.

### Cambios realizados
- Proxy de TMDB en servidor (`server/tmdbProxy.js`, `api/tmdb.js`, `vercel.json`, middleware en `vite.config.js`),
  lectura de variables clave por clave (`src/utils/env.js`) y guardián de secretos en el build.
- Planes compartidos: migración Supabase con RLS + RPC, banco de pruebas SQL con PGlite, `planRepository.js`,
  `PlanContext` remoto/local, `PlanPage`, `InvitePage` (`/invite/:token`), `MyPlansPage` (importar planes locales).
- `/functions`: sin cines ni horarios inventados; cadena oficial + sede + fecha + hora propuesta.
- CI (`.github/workflows/ci.yml`) y E2E con Playwright (`e2e/plan-journey.spec.js`).
- Analítica con contrato cerrado y consentimiento (`src/services/analytics.js`, `AnalyticsConsent`, `docs/ANALITICA.md`).

### Pruebas ejecutadas y resultados
- `npm run lint`: sin errores ni avisos.
- `npm test`: 82/82 (incluye 5 del proxy, 9 de permisos SQL sobre PostgreSQL real en PGlite, 2 de analítica).
- `npm run test:e2e`: 3/3 en Chromium (modo local, sin peticiones a TMDB ni Supabase).
- `npm run build`: correcto; con token real o sintético el bundle no contiene secretos.
- Consentimiento verificado en Chromium con endpoint de prueba (0 eventos sin aceptar; 1 evento saneado al aceptar;
  id borrado al retirar). Bug corregido: el fallback a `fetch` no se ejecutaba si `sendBeacon` lanzaba.

### Pendiente / limitaciones
- Aplicar la migración en Supabase remoto (requiere autorización) y probar el plan compartido con dos cuentas reales.
- Rotar el token de TMDB (un build anterior lo incluía en el bundle) y definir `TMDB_READ_TOKEN` en Vercel.
- Elegir endpoint de analítica. Límite de peticiones del proxy es por instancia.

### Continuación 2026-10-09/10 · Fase P1 (salas de Duo e invitados)
- Migración `20261010120000_duo_rooms.sql` (salas, butacas, gustos y votos privados, cierre canónico en servidor,
  límite de códigos fallidos) y corrección de Realtime de planes (`plan_members` fuera de la publicación).
- `DuoRoomPage` (`/duo/sala`), `roomRepository.js`, `duoRoom.js`; invitados sin email (`toAppUser`, `continueAsGuest`).
- Pruebas: `npm test` 100/100 (12 SQL de salas, 10 de planes); `npm run test:e2e` 7/7, incluidas salas y plan
  compartido con navegadores separados contra la SQL real en PGlite (`e2e/support/fake-supabase.mjs`).
- Capturas a 390/834/1440 px revisadas; se corrigieron 4 defectos visuales encontrados en ellas.
- Pendiente: aplicar migraciones en Supabase (con autorización), habilitar Auth anónima si se quiere el acceso de
  invitado, y repetir «última plaza» y «doble cierre» con concurrencia real.

### Continuación 2026-10-10 · Fases P2–P4 (detalle en `docs/IMPLEMENTACION-CINET.md`)
- P2: gustos por cuenta, importación CSV, calendario `.ics`, veto, Open Graph, modo familia, grupos, turnos justos,
  presupuesto, encuesta de horarios y resumen. P3: aliados verificados con RLS por organización, auditoría,
  cartelera con fuente y webhook de ventas firmado. P4: búsqueda en lenguaje natural local (sin IA externa), PWA
  sin datos privados en caché, respaldo del catálogo, medición de chunks y Plus en sandbox con derechos en servidor.
- Bugs encontrados por las pruebas y corregidos: «somos 20» no se entendía (`\d` → `\d+`); la versión del service
  worker reemplazaba el comentario y no la constante (`replaceAll`, ahora comprobado en E2E); `titleMeta` arrastraba
  el motor de Duo al JS inicial (movido a `src/utils/titleMeta.js`).
- Pruebas: `npm run lint` limpio; `npm test` 153/153 (incluye 6 SQL de Plus y 3 del webhook de cobros);
  `npm run test:e2e` 14/14; build sin aviso de tamaño. Rendimiento comparado con `1dd4e6c` en el mismo Vite.
- No se aplicaron migraciones remotas, no se conectó pasarela, no se cobró nada ni se contactó a nadie. Pendiente
  con autorización: `supabase db push`, Auth anónima, variables de Vercel, rotar el token de TMDB.

## Intervención 2026-10-10 — Claude Code (Claude Opus 5.5) · Duo avanzado (`docs/PROMPT-DUO-EXPERIENCIA-AVANZADA.md`)

### Qué se pidió
Una evolución visible de Duo en seis escenas («Traigan sus gustos. Salgan con un plan»), calibración por películas, recomendaciones con límites fiables y finalistas con papeles, votación que se retoma, organizar y repetir, PWA y paso a Android documentado, sin cobros ni despliegues, con verificación en navegador.

### Línea base (ejecutada antes de editar)
`npm run lint` limpio · `npm test` 153/153 · `npm run build` correcto. `git status` inicial guardado en `docs/evidencia/duo-avanzado/git-status-inicial.txt`; el trabajo ajeno se conservó (sin reset, clean, commit, push ni despliegue).

### Cambios
- Motor (`recommender.js`, `duoService.js`, `tmdbClient.js`, `useAsync.js`): límites v2, señales personales, `pickFinalists`, búsqueda con presupuesto y cancelación, medición sin datos personales.
- Interfaz: `DuoPage`, `DuoProgress` (escenas), `DuoModeStep`, `DuoPersonStep` + `DuoCalibration` (nuevo), `DuoCommonStep`, `DuoResults`, `DuoShortlist`, `DuoVoteRound`, `DuoFinal`, `DuoEmptyState`, `DuoSeats`, `DuoSummary`; `PlanAfterglow` (nuevo) en `PlanPage`; `?time=` en `FunctionsPage`; `useInstallPrompt` (nuevo); «Menos movimiento» en `usePrefersReducedMotion` + `design.css`; estilos en `duo-scenes.css` (nuevo) y limpieza de reglas muertas en `duo.css`/`duo-experience.css`.
- Analítica: `calibration_completed`, `shortlist_shown`; `plan_completed_reported` ya se usa.
- Docs: `DUO-DISENO-AVANZADO.md`, `APP-MOVIL-ANDROID.md`, secciones nuevas en `IMPLEMENTACION-CINET.md`, `COSTOS-Y-MERCADO.md` y `ANALITICA.md`; `scripts/duo-eval.mjs`.

### Pruebas y resultados
- `npm test` 161/161; `npm run lint` limpio; `npm run build` correcto (Duo 107,53 kB / 33,34 kB gzip; sin aviso de tamaño).
- `npx playwright test`: 19 pasan, 3 omitidas (capturas bajo demanda). Capturas antes/después en `docs/evidencia/duo-avanzado/`, con 0 px de desbordamiento y 0 errores de consola en las seis escenas a 390/834/1440 px.

### Pendiente / limitaciones
- Sin TMDB en vivo ni Supabase remoto en esta verificación; sin zoom 200 %, lector de pantalla real, throttling de red ni teléfono real. Intro con desbordamiento preexistente (11/32 px).
- El servidor de desarrollo se detuvo por memoria baja del sistema; la verificación usó los servidores de Playwright.

## Intervención 2026-10-11 — Claude Code (Claude Opus 5.5) · Entrada de app, panel de cuenta y centro legal

### Qué se pidió
Que la app (también dentro de la app móvil, que carga la web) abra en bienvenida animada → acceso integrado en vez de la portada/landing de registro; ojo para mostrar contraseñas; recuperación; panel de cuenta desde el avatar; «Legal y privacidad» con borradores basados en el producto real; retirar «Acerca de».

### Línea base
`node_modules` estaba incompleto (sin `react` ni `.bin`): `npm ci` desde el lockfile sin cambiarlo. Después: `npm run lint` limpio, `npm test` 161/161. El trabajo ajeno sin confirmar se conservó (sin reset, clean, commit, push ni despliegue).

### Problemas comprobados antes de editar
- `/` redirigía a `/home`; el acceso vivía en `ProfilePage` (`/profile`, `/login`, `/register`) dentro del Layout, con «Registro» en la navbar.
- Tras registrarse con confirmación, el enlace del correo volvía a `/profile` y se perdía el destino (invitación, plan).
- No había recuperación de contraseña ni forma de ver la contraseña escrita.
- `state.from` se usaba sin validar; `ProtectedRoute` perdía la query de la URL.
- Cerrar sesión dejaba a la persona en la página actual.
- Navbar con Dashboard, Registro y Acerca de; menú del avatar con roles de navegación pero sin hoja móvil.

### Cambios
- Entrada: `src/pages/AuthPage.jsx` (nuevo) en `/`, `/login`, `/register`, `/recuperar`, `/nueva-contrasena`, fuera del Layout. Bienvenida finita (1,9 s; 0,7 s con menos movimiento), omitible, una vez por sesión del navegador; si la sesión está lista no espera; mientras Supabase restaura solo se ve la marca. Transición conectada del logo con FLIP (transform). Pestañas con indicador que se desplaza, flechas/Inicio/Fin, cambio de alto suavizado.
- `AuthForm.jsx` reescrito (nombre, correo, contraseña y confirmación; foco al primer error; botón bloqueado con carga real) y `PasswordField.jsx` (nuevo: ojo de 44 px, `type="button"`, etiqueta que cambia, valor intacto).
- `authService.js`: `requestPasswordReset`, `updatePassword`, más códigos de error; el correo de confirmación vuelve a la raíz. `AuthContext.jsx`: error recuperable de restauración (fallo de `getSession` o más de 10 s) con `retryRestore`, y `accountsAvailable`.
- `src/utils/authRedirect.js` (+ prueba): destinos internos seguros y destino pendiente en `localStorage` para retomarlo al volver del correo.
- `ProfilePage.jsx` ya no es landing de registro: sin sesión redirige a `/login` y vuelve. `ProfileCard` y el panel cierran sesión hacia `/login` sin destino.
- Panel de cuenta: `UserMenu.jsx` con `<dialog>` modal (anclado al avatar en escritorio; hoja inferior en ≤ 640 px con fondo que bloquea), Escape/cerrar/toque fuera/navegar cierran, foco devuelto al avatar, `aria-expanded`/`aria-controls`/`aria-haspopup="dialog"`, sin roles de menú. «Administración» solo para `admin`. Sin sesión, el header muestra «Entrar».
- Navbar: Inicio, Películas, Cine, Duo, Mis planes. Pie: «Legal y privacidad» y «Créditos y fuentes».
- Legal: `src/data/legal.js` + `src/pages/LegalPage.jsx` (`/legal`, `/legal/:doc`: términos, privacidad, cancelaciones, créditos), públicas, con índice, fecha y aviso de borrador. `docs/LEGAL-PENDIENTES.md` con evidencia y decisiones humanas pendientes. No se registra aceptación.
- Retirados `AboutPage.jsx`, `data/about.js`, `about.css`; `/about` → `/legal/creditos` (atribución TMDB/JustWatch conservada).
- Estilos: `styles/pages/auth.css`, `styles/pages/legal.css` (nuevos) y bloque del panel en `components/app.css`. Iconos `eye`, `eye-off`, `close`; `BrandLogo stacked`.
- E2E: `e2e/auth-entry.spec.js` y `e2e/entry-public.spec.js` (nuevos); las demás esperan `/home` tras entrar. `fake-supabase.mjs`: `POST /auth/v1/recover`, `PUT /auth/v1/user`, `GET /__e2e/recovery-link`, usuaria Cleo y `error_code` en el registro cerrado (como Supabase real).

### Pruebas y resultados
- `npm run lint` limpio · `npm test` 163/163 · `npm run build` correcto (`LegalPage` 14,5 kB, chunk aparte).
- `npx playwright test`: 30 pasan, 3 omitidas (capturas bajo demanda). En una de cuatro ejecuciones `partners.spec.js` falló una vez (el operador no veía la solicitud pendiente); no se reprodujo en las tres siguientes ni aislada. Código de aliados no modificado: queda como intermitente por investigar.
- Capturas en `docs/evidencia/entrada-2026-10-11/` (bienvenida, iniciar sesión, crear cuenta con contraseña visible, panel, legal) a 390/834/1440 px y recuperación a 390 px; `scrollWidth` igual al ancho en todos.

### Configuración externa (no se tocó nada remoto)
- Supabase Auth > URL Configuration: añadir `https://<dominio>/nueva-contrasena` (y la URL local) a Redirect URLs; si no está, el correo de recuperación no vuelve a la app.
- Confirmación de correo y longitud mínima de contraseña dependen del proyecto remoto (en local `enable_confirmations = false`, mínimo 6; la app exige 8).
- Plantillas de correo de Supabase (recuperación/confirmación) sin revisar.

### Pendiente / limitaciones
- Todo lo de Auth se verificó contra el Supabase de pruebas (PGlite + adaptador); no demuestra el comportamiento del Supabase remoto (correos reales, confirmación, límites).
- No se probó en teléfono real, lector de pantalla real ni zoom 200 % del navegador (sí 390 px y reflujo).
- No había imagen de referencia del mockup en la conversación: la composición sigue la descripción escrita.
- Los textos legales necesitan responsable, contacto y revisión jurídica (ver `docs/LEGAL-PENDIENTES.md`).
