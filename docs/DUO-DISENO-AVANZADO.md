# Duo avanzado — seis escenas, límites fiables y decisión que se retoma

Incremento local del 10 de octubre de 2026, ejecutado sobre `PROMPT-DUO-EXPERIENCIA-AVANZADA.md`. Promesa: **«Traigan sus gustos. Salgan con un plan».**
Este documento registra el storyboard, los contratos, la evidencia y lo pendiente. No es una promesa de resultados con usuarios.

## 1. Auditoría breve (estado antes de editar)

- Línea base ejecutada: `npm run lint` limpio · `npm test` 153/153 · `npm run build` correcto (Duo 87,08 kB / 26,86 kB gzip).
- `git status` inicial guardado en `docs/evidencia/duo-avanzado/git-status-inicial.txt` (200 entradas de trabajo ajeno sin commit; se conservaron).
- Ya existían y se reutilizaron: salas desde cada celular con RLS/RPC y pruebas SQL (`DuoRoomPage`, `rooms.test.js`), invitados, grupos con membresías revocables, «repetir con las mismas personas», encuesta de horarios, `.ics` con zona horaria, PWA (manifest, iconos, service worker sin datos privados) y Plus en sandbox.
- Huecos confirmados en el código: imprescindibles parciales y duración +30 min o desconocida aparecían como «alternativas»; disponibilidad desconocida pasaba el filtro de plataforma; 40 candidatos × 2 consultas de detalle en paralelo sin presupuesto ni cancelación; aprendizaje por mayoría (`feedbackFrom`); finalistas = `slice(0, 3)`; la ronda vivía en el estado del componente (se perdía al recargar); sin calibración por películas; sin «Menos movimiento»; `plan_completed_reported` existía en el contrato de analítica pero nada lo usaba; ningún botón de instalación de la PWA.
- Capturas «antes» (auténticas, modo local): `docs/evidencia/duo-avanzado/antes-{390,834,1440}-0{1..5}-*.png`. Hallazgo visual: en 1440 px la decisión empezaba por debajo de la mitad de la pantalla; en 390 px, tras ~600 px de cabecera, progreso y herramientas. El intro ya tenía desbordamiento horizontal (11 px a 390, 32 px a 834) — **no corregido aquí** (fuera del recorrido de escenas).

## 2. Storyboard (implementado)

| Escena | Paso(s) | Composición escritorio | Móvil (una decisión principal) | Estados vacíos / error |
| --- | --- | --- | --- | --- |
| 1 · Preparar la noche | `mode` | Escenario: abanico de 3 pósteres según la ocasión + **entrada de sesión** (ocasión, formato, butacas reales, «ADMITE n»). A la derecha: quiénes y qué formato en pestañas de radio; «Ajustes de la noche» desplegable (ánimo, región/plataformas, familia, turnos) con resumen en una línea | Abanico pequeño + entrada; quiénes/formato; CTA «Mostrar nuestros gustos» y vía rápida «Ir directo a finalistas» | Sin gustos: «no asumimos afinidad» |
| 2 · Mostrar gustos | `person-n`, `seen` | Butaca grande con su color, nombre; dos vías: **«Con películas»** (calibración) o **«Géneros y actores»** (editor completo); **Límites** siempre visibles | Póster 36 % + título; 4 respuestas a ancho completo | Calibración no carga → mensaje y editor |
| 3 · Encontrar coincidencias | `common` | Mapa: centro «A los dos / A todos», alrededor una tarjeta por butaca (lo que aporta, lo que evita, pósteres que le encantan); franja «Límites que se cumplen siempre» separada; conflictos con «Resolverlo con…» | Centro y butacas apilados | Conflicto bloqueante explicado; recuento real de válidas |
| 4 · Comparar finalistas | `results` | Hasta 3 carteles protagonistas con **papel** (Punto de encuentro · Algo para descubrir · Otra forma de la noche), motivos del papel y **franja de diferencias** (género, duración, gustos que toca, dónde) | Póster 38 % + título y motivo; diferencias debajo; **barra fija** con «Votar entre n» | 1–2 finalistas: «no rellenamos»; 0: motivos con números y ampliaciones explícitas |
| 5 · Decidir juntos | diálogo de ronda | Baraja fija, «pásale el celular», teclado ← ↓ →; **revelación** con luz de proyector (900 ms, omitible); resultado con match / más votada / sin coincidencia | Igual, a pantalla casi completa | Ronda pausada → banner «Retomar»; empate explicado; sin consenso inventado |
| 6 · Organizar | `final` | La elegida como entrada; hora opcional con fin **estimado** solo si se conoce la duración; casa/cine hacia `/functions` (pasa `?time=`); recuerdo con **vista previa** (sin nombres por defecto); instalar la PWA como opción | Igual, apilado | Elección inválida → volver a finalistas |

Cabecera común: título de la ocasión, butacas, **6 escenas** (las personas aparecen como butacas dentro de «Gustos»), herramientas («Resumen», «Menos movimiento», «Presentación», «Empezar de nuevo»). El resumen es lateral en escritorio y un panel desplegable arriba en ≤1080 px.

Ambientación por ocasión (`data-occasion`): solo cambia el brillo de fondo (cita, amigos, solo, maratón, familia); contraste, controles y significado son iguales.

Después de la fecha del plan (`/plan/:id`): «¿La vieron? ¿Les gustó?», opcional y en este navegador; «la vimos» la saca de las recomendaciones de Duo y genera un recuerdo revisable antes de compartir. Es autoinforme, no asistencia ni compra verificada.

## 3. Movimiento

- Animan acciones reales: sumar una butaca (`duo-seat-in`), responder una película (el póster y el título nuevos entran; **los botones no se mueven**), cambiar de escena (`duo-enter` existente), aparecer las finalistas, abrir la ronda y la revelación.
- Duraciones: feedback 160 ms, transiciones 220–320 ms, revelación 900 ms (decisiones de diseño, no medidas).
- `prefers-reduced-motion` **y** el interruptor «Menos movimiento» (`html[data-motion="reduced"]`, guardado en este navegador) anulan animaciones y transiciones en toda la app; con movimiento reducido la ronda salta la revelación. Sin autoplay, destellos, carruseles automáticos ni esperas obligatorias: el resultado se calcula antes de revelarlo y «Ver resultado» lo muestra al instante.
- Sin dependencias nuevas: DOM/CSS y la API de animaciones del navegador.

## 4. Contratos

### 4.1 Límites v2 (`recommender.js`, `LIMITS_VERSION = 2`)

| Tipo | Qué incluye | Se relaja para rellenar |
| --- | --- | --- |
| Límite duro | tipo, historial y vistas por **todas** las personas, sin estrenar, rechazados, formato, **todos** los imprescindibles, duración máxima, temporadas, estado de serie, plataformas marcadas, familia (en discover) | **Nunca** |
| Dato desconocido | duración, temporadas, estado o disponibilidad sin dato comprobable con un límite activo (`unknownRuntime`, `unknownSeasons`, `unknownStatus`, `unknownPlatform`) | Nunca (no cuenta como cumplido) |
| Comprobación por filtro | `runtimeCap` ≤ máximo pedido y `filtered.providers/status` de discover; el dato exacto del detalle siempre gana | — |
| Preferencia flexible | quórum de gustos (todos hasta 2; 2/3 desde 3) | Sí, marcada «Es una alternativa…» |
| Ampliación explícita | +minutos (se muestra el **excedente exacto**), plataformas sin comprobar, «encaja con uno solo» | Solo por acción de la persona, marcada «Ampliado…» |

La UI usa el mismo contrato: la franja de límites de la escena 3, el bloque «Límites» de la escena 2 y `DuoEmptyState` («no está» ≠ «no pudimos comprobar»).

### 4.2 Señales personales

- Calibración por persona: `person.titles = [{ id, ids, title, year, poster, genreKeys, answer }]` con `love | nope | seen | unknown`. «Ya la vi» no es gusto; «No la conozco» no es nada; «No es para mí» baja lo parecido y no veta su género. «Me encanta»/«Ya la vi» excluyen un título solo si **todas** las personas lo vieron; si no, el motivo dice «Ya la vio Ana».
- La similitud con la calibración puntúa y se explica («Se parece a «Interstellar», que le gustó a Ana») pero **no** decide si un título «le encaja» (eso sería convertir una inferencia en gusto). Las inferencias (géneros compartidos por dos o más respuestas) se proponen y solo se aplican si la persona acepta.
- Votos: `feedbackFrom` conserva `people[i]`; el criterio `feedback` del grupo = ½ media + ½ mínimo de quienes dieron señales.

### 4.3 Finalistas (`pickFinalists`)

Del tablero de la tanda, entre válidas (alternativas solo si no hay ninguna válida). Papeles: **meet/mine** (la mejor), **discover** (novedad comprobable: menos votos en TMDB, otra época, otro idioma o estreno, y distinta de la primera), **other** (un gusto que las demás no cubren o un tono distinto; si falta y alguien sigue sin opción, puede ser una alternativa que solo falla el quórum, marcada) y **alt** (otra opción relevante sin papel inventado). No se fuerzan tres. Se fijan en la sesión (`finalists`) y solo cambian con «Generar otra tanda» o al cambiar preferencias.

### 4.4 Ronda reanudable (`session.round`)

`{ id, deck, size, person, card, phase: handoff | vote | reveal | results, votes, result }`. Cada voto se guarda al instante; recargar retoma la persona y la tarjeta; «Otra ronda» crea otro `id` sin votos; al cerrar, los votos pasan al aprendizaje por persona (`mergeRoundVotes`). Los votos viven en este teléfono: el diálogo lo dice y enlaza a la sala para votar desde cada celular.

### 4.5 Búsqueda con presupuesto (`duoService.js`)

Descarta duplicados, vistos y quitados **antes** del detalle; segunda ronda de discover con más páginas y los **mismos** límites; detalle en tandas de 8 títulos hasta 12 válidos comprobados o 40 en total; si la búsqueda queda obsoleta (`useAsync` ahora aborta), no se lanzan más tandas. `stats` (sin datos personales) se muestra en «Cómo buscamos». El cliente TMDB ya limitaba la concurrencia a 6 y compartía peticiones en vuelo; ahora además cuenta peticiones nuevas y reutilizadas. No es un límite global del proxy.

## 5. Evaluación reproducible (`node scripts/duo-eval.mjs`)

Algoritmo anterior (último commit) frente al actual, mismas preferencias y títulos (catálogo local + 10 sintéticos con datos desconocidos). Tabla completa: `docs/evidencia/duo-avanzado/evaluacion-motor.md`.

- Títulos mostrados que violan un límite duro: **58 → 0** (en el anterior se mostraban como «alternativa»).
- Títulos dados por «cumplen todo» sin dato comprobable: **9 → 0** (escenario Netflix obligatorio).
- Duplicados: 0 → 0. Cobertura de personas con gustos en las propuestas: igual en los 8 escenarios (grupo de 4: 1 → 1, con 2 propuestas en vez de 3 que incumplían límites).
- Costo honesto: con límites estrictos hay **menos** resultados (p. ej. 26 → 12) y a veces 0 o 1 finalista. Es la respuesta correcta según el contrato; la interfaz lo explica y ofrece ampliaciones explícitas.
- Esto mide invariantes, no satisfacción ni precisión. La comparación con personas requiere el piloto (§8).

## 6. Evidencia local (ejecutada)

- `npm run lint`: limpio. `npm test`: **161/161** (incluye contrato de límites, plataformas nula/vacía/filtrada, +1 minuto, cotas, contradicciones, duplicados, calibración, aprendizaje personal, finalistas y puente, ronda guardada/nueva/fusionada, render de finalistas y configuración). `npm run build`: correcto, sin aviso de tamaño; Duo 107,53 kB (33,34 kB gzip), CSS total 44,88 kB gzip.
- `npx playwright test`: **19 pasan, 3 omitidas** (las capturas, solo con `DUO_CAPTURE=1`), incluidas salas, grupos, aliados, Plus y plan compartido. Nuevas en `e2e/duo-journey.spec.js`: recorrido completo configuración → gustos (deshacer y revisar) → coincidencias → finalistas → ronda con **recarga a mitad** → revelación → elección → plan (`/functions?…&time=20:30`); ronda nueva sin votos y sin revelación con movimiento reducido; «Menos movimiento» persistente; plataforma sin comprobar; feedback después de la fecha.
- Capturas «después» auténticas a 390/834/1440 px de las seis escenas y el resultado: `docs/evidencia/duo-avanzado/despues-*.png`, con comprobación automática de **0 px de desbordamiento horizontal** y **0 errores de consola**. Corregidos tras verlas: toggle del resumen visible en escritorio, «Paso 7 de 7» frente a 6 escenas, cabecera de resultados que tapaba los pósteres, barra de decisión fija sobre los carteles en escritorio, calibración con respuestas lejos del póster, abanico y herramientas demasiado altos en móvil, subrayado partido en 834 px, selector de vista alto en móvil y dos colisiones/duplicados de CSS.

## 7. Pendiente y límites de esta verificación

- **No verificado:** zoom 200 %, lector de pantalla real, red lenta real (la cancelación se probó por diseño y unidad, no con throttling), FPS/Core Web Vitals, sitio desplegado, Supabase remoto y TMDB en vivo con este código (todo el E2E corre en modo local o con PGlite).
- El servidor de desarrollo se detuvo por falta de memoria del sistema durante la sesión; las capturas y E2E se hicieron con el servidor de `playwright.config.js`.
- Intro con desbordamiento horizontal (11/32 px) preexistente.
- La sala remota sigue con su propio armado de baraja (mismo motor, ahora con límites estrictos); no recibe aún las finalistas con papeles ni la calibración por películas.
- El feedback «¿La vieron?» y la calibración viven en este navegador; con cuenta podrían guardarse en servidor (requiere migración y RLS).
- El botón «Instalar CINET» depende de `beforeinstallprompt` (Chromium/Android); no se probó en un teléfono real. En iOS no aparece (se instala desde «Compartir → Añadir a inicio»).

## 8. Siguiente tarea exacta

1. Repetir `npx playwright test` y las capturas con TMDB en vivo (`TMDB_READ_TOKEN` de desarrollo) y anotar la línea base real de «Cómo buscamos» (peticiones, reutilizadas, tiempo) para fijar el presupuesto por sesión.
2. Llevar finalistas con papeles y la calibración a la sala (`duoRoom.js`: gustos por cuenta → `pickFinalists` sobre la baraja) con pruebas SQL de que la baraja no expone gustos individuales.
3. Piloto consentido de 10–15 grupos con dos ocasiones: medir `duo_started → calibration_completed → shortlist_shown → round_completed → title_chosen → plan_created → plan_completed_reported` sin cambiar a la vez interfaz y motor.
