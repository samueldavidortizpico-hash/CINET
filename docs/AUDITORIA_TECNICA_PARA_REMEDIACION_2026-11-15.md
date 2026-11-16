# Auditoría técnica de CINET: instrucciones de remediación

**Fecha:** 2026-11-15  
**Checkout:** `fix/audit-2026-11-07`, HEAD `ac7869c` (`chore: limpiar código muerto y artefactos que no se usan al ejecutar`).  
**Alcance:** rutas, autenticación, interacciones UI, servicios, recomendador Duo, Supabase/migraciones, API, configuración de publicación, accesibilidad, mantenibilidad y preparación para presentar.  
**Modo:** revisión y pruebas locales; no se cambió código funcional ni se probó/alteró un servicio remoto.

## 1. Instrucciones para el equipo

Usen esta auditoría como backlog de remediación. Antes de editar, inspeccionen `git status`, la rama y el commit actual. Mantengan la separación de propiedad indicada abajo; coordinen las integraciones por orden de commit. No mezclen archivos ajenos, no reescriban migraciones ya aplicadas: las correcciones de esquema deben ser migraciones nuevas, aditivas y compatibles hacia atrás. No cambien contratos públicos, rutas, datos guardados ni la fórmula del recomendador sin pruebas de regresión y una nota de migración cuando aplique.

División para dos compañeros:

- **Compañero A:** commits 1 y 2 (privacidad de datos locales y flujos/rutas de interfaz).
- **Compañero B:** commits 3 y 4 (evaluación de Duo y capa servidor/base de datos).
- **Integración:** commit 5, después de integrar los cuatro anteriores, limitado a pruebas de recorrido, consistencia de presentación y evidencia. A y B no deben editar los mismos módulos a la vez.

Cada commit debe incluir cambios de código necesarios, pruebas de regresión para el comportamiento tocado y una descripción corta de archivos, riesgo y validación. Ejecuten `npm test`, `npm run lint`, `npm run build` y `npm run test:e2e` al cerrar el commit 5. Si una prueba falla antes de su cambio, documenten la línea base; no la oculten ni la debiliten.

## 2. Estado de evidencia de esta revisión

### Comprobado localmente

- `npm test`: **275/275 pasan**, 0 fallidas.
- `npm run lint`: terminó con código 0.
- `npm run build`: terminó con código 0. El bundle principal queda en **315,82 kB (101,72 kB gzip)**; CSS principal **259,34 kB (48,20 kB gzip)**. No es un fallo, sí una línea base que conviene vigilar.
- `npm run test:e2e`: se ejecutaron los 44 escenarios: **39 pasaron, 2 fallaron y 3 de captura quedaron omitidos** (se omiten salvo `DUO_CAPTURE=1`). Después del escenario 44, Playwright quedó esperando el cierre de servidores locales; lo interrumpí tras guardar las trazas. El comando terminó por interrupción (código 1), no con un cierre normal de la suite.
- E2E configurado: **44 escenarios** en Chromium; usa dos servidores locales, datos sintéticos y Supabase simulado sobre PGlite para recorridos con cuentas. No equivale a probar Supabase alojado, Vercel, proveedores reales, móviles físicos o correo real.
- Las migraciones y las pruebas SQL locales cubren controles de perfil, roles, planes, salas, grupos, aliados y Plus sandbox. Esa evidencia comprueba el código que está en el checkout y PGlite; no comprueba qué migraciones están aplicadas al proyecto alojado.
- La compilación contiene división por rutas; las páginas grandes incluyen Duo (~110 kB), Supabase (~214 kB), `useDocumentTitle` (~103 kB) y CSS (~259 kB). La cifra comprimida del entry es menor; medir una carga real en móvil antes de optimizar.

### Sin verificar en esta revisión

- Despliegue publicado, status HTTP/cabeceras efectivos, redirects del dominio, flujo remoto `deploy-smoke` y configuración de variables del hosting.
- Migraciones efectivas, RLS, publicación Realtime, Storage, Auth hooks, CAPTCHA, SMTP, cuotas y recuperación de cuenta en el proyecto Supabase alojado.
- Redis multi-instancia, límites reales del proxy TMDB, consumo bajo carga, `EXPLAIN` y rendimiento PostgreSQL con datos representativos.
- Rotación de credenciales históricas, escaneo de secretos del historial completo, estado actual de `npm audit` fuera de CI, navegación manual de cada control con teclado/lector de pantalla y validación visual en dispositivos reales.
- Aprobación de términos y privacidad. El repositorio marca esos textos como borradores sin revisión jurídica.

## 3. Hallazgos priorizados

### P1 — Presentación y confianza del usuario

1. **Los textos legales de la aplicación aún son borradores.** `/legal` publica términos, privacidad y cancelaciones con aviso de revisión; `docs/LEGAL-PENDIENTES.md` enumera responsable del tratamiento, contacto, marco aplicable, edad, retención, borrado/exportación, transferencias y otros puntos sin decisión. No presentes el prototipo como producto listo para usuarios reales hasta que el responsable complete la revisión y actualice el aviso. El equipo de código no debe inventar datos legales.
2. **El estado de algunas funciones puede confundirse con producción.** CINET Plus está en sandbox y no hay pasarela de pagos; cartelera/funciones dependen de TMDB o de publicaciones verificadas por aliados; las funciones del organizador son propuestas, no reservas confirmadas. Conserva esas etiquetas honestas en la demo y no presentes pagos, compra de boletas ni horarios como servicios cerrados.
3. **Hay verificaciones operativas remotas pendientes.** El repositorio aporta tests locales, un `deploy-smoke` y procedimientos de staging, pero no prueba que producción tenga las variables, migraciones, dominio, OAuth/SMTP, Redis y cabeceras correctos. Antes de una presentación pública, capturar evidencia del SHA desplegado y ejecutar el smoke contra el preview/staging del mismo SHA.

### P2 — Separación de datos en el navegador

4. **Favoritos y el historial Duo no están asociados a una cuenta.** `src/hooks/useFavorites.js` usa una clave fija `cinehub-favorites`; `src/hooks/useDuoHistory.js` usa una clave global `DUO_HISTORY_KEY`. `ProfileCard` muestra el conteo de esas favoritas y el logout no elimina ni cambia esas claves. Si se sale de una cuenta y entra otra en el mismo navegador, ambas sesiones reutilizan esos datos. Decide el contrato: estado por cuenta con espacio separado para visitante o estado explícitamente compartido del dispositivo. Migra la clave anterior sin pérdida y prueba A → logout → B → logout → A, incluidos favoritos, historial y perfil. No borres datos automáticamente como arreglo.
5. **Los planes locales son estado compartido del navegador.** `PlanContext` mantiene `cinehub-plans` y `cinehub-selection`; la documentación indica que el modo local no sincroniza ni comparte entre dispositivos. Comprueba que UI y copy siempre identifiquen el modo local y que crear/copiar/editar/eliminar en una cuenta remota no afecte el conjunto local ni el de otra cuenta. Preserva este comportamiento offline salvo decisión explícita de producto.

### P2 — Rutas, cobertura de interacciones y claridad

6. **La tabla de rutas del README contradice el router.** `README.md` dice que `/` redirige a `/home`, pero `src/app/router.jsx` monta `AuthPage` en `/` (pantalla de entrada); actualicen la tabla, alias y comentarios usando el router como fuente. Revisen además si la ruta `/registro` se debe documentar como alias.
7. **La suite E2E recorre los flujos principales, pero no demuestra “cada botón”.** Ya cubre login, registro, recuperación, destinos protegidos, menú/avatar, Duo, planes, invitaciones, grupos, aliados, CSV, Plus, alias y 404. Faltan comprobaciones explícitas y reproducibles de los controles restantes: filtros y orden combinados del catálogo, favoritos desde ficha/carrusel y volverlos a retirar, exportar/borrar gustos, carga/cancelación/fallo de avatar, formularios de perfil, recap, enlaces oficiales de cine, enlaces de plataformas/tráilers, errores/reintentos en pantallas remotas, gestión Admin y estados vacíos/carga en las rutas secundarias. Añadan cobertura por flujo y por rol; no creen un test genérico que solo compruebe que existe un botón.
8. **Accesibilidad requiere una pasada de interacción completa.** E2E ya prueba foco en el tráiler, Escape del menú y movimiento reducido en parte de Duo. Completen teclado en modales, búsqueda/autocompletado, tabs de acceso, controles de carrusel, formularios y sala; verifiquen que el foco regrese al disparador, que todos los estados de error/carga se anuncien y que ningún botón de icono quede sin nombre accesible. Prueben contraste y zoom/reflow en 390, 768 y 1280 px. Mantengan los tests sin depender de texto decorativo o tiempos arbitrarios.
9. **Las rutas secundarias deben mostrar fallo recuperable y no dejar acciones fantasma.** Verifiquen para `/movie/:id`, `/functions`, `/plan/:id`, `/invite/:token`, `/duo/sala/:code`, `/grupos/:id`, `/cine/:id`, `/admin` y `/legal/:doc`: carga, inexistente, sin permiso, desconexión, reintento, botón deshabilitado mientras guarda y volver atrás/recargar. Para cada acción destructiva, confirmar resultado antes de navegar y mantener mensajes idempotentes.
**Prueba E2E fallida A — revelación Duo.** `e2e/duo-journey.spec.js` agota 30 s al pulsar “Ver resultado”; la traza registra que `span.duo-reveal-light` dentro de `.duo-reveal-stage` intercepta el puntero y el nodo del botón se separa durante los reintentos. Reproducir con y sin movimiento reducido. Corregir la interacción para que las capas decorativas no intercepten eventos y el control no se remonte durante la acción; no usar `force: true` como solución.

**Prueba E2E fallida B — recuerdo posterior a la función.** `e2e/duo-journey.spec.js` crea un plan con la primera fecha disponible y hora fija 20:30; cuando esa hora ya pasó en la zona de ejecución, aparece el bloque “¿La vieron? ¿Les gustó?” y falla la aserción que esperaba que aún no existiera. Usar una fecha/hora futura calculada con zona `America/Bogota` para el caso previo y una pasada determinista para el caso posterior; no fijar el test a la hora en que alguien lo ejecuta.

### P2 — Recomendaciones Duo

10. **El recomendador tiene muchas reglas, pero no una evaluación calibrada con preferencias externas.** `src/services/recommender.js` declara límites, pesos (`WEIGHTS`), diversidad, finalistas y azar ponderado; la suite protege bastantes invariantes. No hay evidencia de que los pesos mejoren satisfacción de usuarios reales ni de precisión del catálogo de Colombia. No reajusten pesos por intuición. Añadan un corpus versionado de sesiones sintéticas etiquetadas y evalúen: cumplimiento de límites duros, tasa de “ninguna opción”, cobertura de gustos individuales, exposición por persona/grupo, diversidad, repetición, estabilidad y tasa de alternativas. Registrar la versión de fórmula/corpus, métricas base y comparación antes/después.
11. **Separar fallos de datos del algoritmo.** Los datos de popularidad, géneros, runtime, certificación familiar, actores, disponibilidad por plataforma y región provienen de fuentes distintas y pueden faltar o contradecirse. Construyan casos con catálogo parcial, datos desconocidos, temporadas/series, títulos multi-género, plataformas sin disponibilidad y región CO; no conviertan popularidad o feedback estimado en “compatibilidad” porcentual ni relajen límites de seguridad/familia. En la UI expliquen por qué aparece una recomendación y distingan “coincidencia” de “alternativa”.
12. **Riesgo de sesgo y explicaciones.** Revisen qué géneros son más visibles por tamaño de catálogo/orden de TMDB, cómo afecta el ánimo colectivo, cuáles personas reciben primero una opción y si la popularidad domina a preferencias. Añadan una evaluación de sensibilidad de pesos y pruebas de permutación del orden de personas/candidatos; el mismo grupo no debería cambiar de resultado solo por el orden de entrada, salvo desempate documentado.
13. **Rendimiento del flujo Duo.** El chunk de Duo ronda 110 kB comprimido a 34 kB; el servicio de películas ronda 41 kB/14 kB gzip. Midan el tiempo de primera recomendación y de regeneración con catálogo grande, red lenta y sin red; eviten duplicar consultas TMDB o volver a normalizar el mismo catálogo en cada interacción. Añadan cache/deduplicación solo si una medición demuestra la necesidad.

### P2 — Backend, datos y operación

14. **La lista de planes corta a 200 y aún no tiene cursor.** `planRepository.js` define `PLAN_LIST_LIMIT = 200`, ordena y revierte la página más reciente; `groupRepository.js` limita grupos/planes también. El tope evita una consulta sin límite, pero al excederlo el usuario pierde acceso a los más antiguos sin señal o paginación. Implementen cursor estable (por `created_at` más ID), “cargar más”, estados de error/reintento y una prueba con más de 200 filas. No cambien el orden visible ni dupliquen filas al pasar de página.
15. **Revisar límites en consultas de listados de aliados.** Algunos listados tienen `limit`, pero consultas de `partnerRepository.js` (listings, offers, members, invitaciones activas) carecen de límite explícito en el cliente. Inventarien columnas de orden/filtro y RLS, pongan un máximo servidor/DB y paginación donde la cardinalidad pueda crecer. No añadir índices sin explicar una consulta medida y su costo.
16. **La configuración de producción de Supabase no se deriva del TOML local.** La auditoría anterior ya detectó que el archivo local no es evidencia del panel remoto. El responsable de despliegue debe comprobar Auth (confirmación, redirects exactos, CAPTCHA, expiración de enlaces, SMTP), custom access token hook, roles, RLS y límites con dos cuentas sintéticas y un anónimo. Nunca activar la publicación de invitados o el hook en producción sin completar ese recorrido.
17. **La seguridad de migraciones necesita la matriz de acceso efectiva en staging.** Mantengan pruebas de `anon`, dueño, miembro, miembro revocado, usuario ajeno, operador y `service_role` para tablas, funciones, vistas, Storage y Realtime. Incluyan intents de lectura/escritura directa, ID/token alterado, repetición e idempotencia. Las pruebas PGlite actuales son buena regresión local pero no garantizan el estado del proyecto remoto.
18. **Dependencias y cadena de suministro.** El workflow tiene auditoría de producción bloqueante y auditoría total como aviso; los `uses:` de GitHub Actions están referenciados por tags mayores. Revaliden el lockfile y reportes de dependencias en CI al integrar; separen la remediación de herramientas de build de dependencias de producción, y validen la compatibilidad de Capacitor antes de actualizar paquetes sensibles. Evalúen fijar Actions a SHA verificado y habilitar actualizaciones automatizadas. Esta revisión no ejecutó `npm audit` ni Gitleaks.
19. **Secretos históricos y rotación.** La auditoría guardada de 2026-11-10 documentó un token TMDB visible en el bundle/historial viejo y pidió rotarlo. El código actual usa proxy de servidor y el build tiene secret guard, pero no se confirmó la rotación en TMDB ni las variables desplegadas. El propietario debe rotar token filtrado, verificar que no exista `VITE_TMDB_READ_TOKEN`, ejecutar escaneo del historial y comprobar bundle/preview sin imprimir valores secretos.
20. **Errores y telemetría.** El sistema de analítica es opcional y respeta consentimiento. Antes de conectar un endpoint real, aprobar retención y minimización, redactar tokens/correos/IDs de sala, verificar revocación de consentimiento y separar telemetría de contenido sensible. Para errores de API, mantener códigos seguros y `Retry-After`; no registrar payloads, correo, JWT o tokens de invitación.
21. **Capacitor no equivale a Android listo.** Hay dependencias/configuración, pero esta auditoría no instaló ni probó una APK. `docs/APP-MOVIL-ANDROID.md` enumera bloqueos de origen TMDB, enlaces profundos, callback de Auth, botón atrás y teclado. Si la presentación incluye móvil nativo, debe ser una rama/campaña aparte con prueba en APK; de lo contrario, presentar como web/PWA.

## 4. Plan exacto de cinco commits

### Commit 1 — A (prioridad alta): aislar datos personales locales por cuenta

**Mensaje sugerido:** `fix(privacy): aisla favoritos e historial Duo por cuenta`

**Propiedad:** `src/hooks/useFavorites.js`, `src/hooks/useDuoHistory.js`, utilidades necesarias de almacenamiento, perfil/contexto de autenticación solo si hace falta para obtener el UUID, y pruebas unitarias/E2E de estos flujos. No editar `src/services/recommender.js`, `src/services/planRepository.js`, migraciones ni rutas backend.

**Trabajo:** separar favoritos e historial por `user.id`, conservando un espacio anónimo/local para visitantes. Migrar los valores viejos de claves globales una única vez sin mezclarlos con la cuenta equivocada ni borrarlos. Al cambiar de usuario, impedir un frame en el que se vean datos del usuario anterior. Mantener los planes locales en su modo local informado; no introducir una migración remota de favoritos en este commit.

**Aceptación:** test A→B→A confirma aislamiento y retención; visitante conserva sus datos al entrar y salir según política definida; favorito toggle sigue siendo idempotente; logout no borra datos silenciosamente; perfil muestra solo conteo de la partición activa; almacenamiento bloqueado/JSON dañado no tumba la app; tests para migración v1 y claves corruptas.

### Commit 2 — A (prioridad alta): rutas e interacciones presentables

**Mensaje sugerido:** `test(ui): cubre rutas e interacciones críticas de punta a punta`

**Propiedad:** `src/app/router.jsx`, páginas/componentes visuales no pertenecientes a la lógica de autenticación de servicio, `README.md`/mapa de rutas y E2E de UI. No tocar authService, aislamiento de favoritos, recomendador o SQL.

**Trabajo:** corregir el mapa de rutas del README; añadir/ajustar pruebas de botones y estados listados en H-07 a H-09 y las dos fallidas E2E; cerrar defectos reproducibles de navegación, loading/error/retry, formularios, modal/foco/teclado y responsive. Reparar la capa de revelación interactiva y hacer determinista la prueba dependiente de fecha. Hacer que rutas de datos faltantes o remotos caídos tengan explicación y acción coherentes. No cambiar el rol de acceso desde UI ni afirmar que un enlace externo compra/valida entradas.

**Aceptación:** matriz de ruta × estado (pública, sesión, admin, inexistente, fallo de red) con resultado esperado; cada acción principal tiene una aserción de resultado, no solo de visibilidad; 390/768/1280 px sin scroll horizontal; teclado y reduced-motion sin regresión; `README.md` coincide con `router.jsx`.

### Commit 3 — B (prioridad media): evaluar y mejorar recomendación Duo con evidencia

**Mensaje sugerido:** `feat(duo): mide calidad y equidad del recomendador`

**Propiedad:** `src/services/recommender.js`, `src/services/recommender.test.js` y nuevos fixtures/tests de evaluación del algoritmo únicamente. No editar `DuoPage`, movieService, páginas ni servidor.

**Trabajo:** definir un corpus reproducible de casos (1, 2, 3 y 8 personas; CO; gustos compartidos/conflictivos; solo series/películas; modo familiar; runtime/plataformas desconocidos; historial y gustos negativos). Medir el ranking base, luego cambiar un factor a la vez. Recalibrar pesos, diversidad o desempate solo si mejora métricas sin violar filtros duros. Versionar corpus/fórmula y registrar límites del dataset, sin datos reales identificables.

**Aceptación:** ninguna recomendación viola must/rejected/runtime/family/type/history; se preservan casos de “cero resultados” y alternativa honesta; permutar orden de personas/candidatos conserva calidad y equidad; resultados deterministas sin dado; métrica antes/después de cobertura, diversidad, repetición y peor satisfacción individual; tests de regresión existentes pasan.

### Commit 4 — B (prioridad alta): paginación y endurecimiento DB/API

**Mensaje sugerido:** `fix(api): limita consultas y conserva paginación de datos`

**Propiedad:** `src/services/planRepository.js`, `src/services/groupRepository.js`, `src/services/partnerRepository.js`, `src/services/showtimeService.js`, `api/`, `server/`, `supabase/migrations/` (solo migraciones nuevas), `supabase/tests/` y tests server. No editar páginas o componentes; el contrato del cursor debe notificarse al equipo A para que el commit 5 lo conecte.

**Trabajo:** agregar cursor estable a las listas truncadas y contratos de paginación a consultas que puedan crecer; validar IDs, status, URL y tamaño de entrada tanto en UI como en RPC/servidor; revisar timeouts, idempotencia y cuotas para operaciones de escritura/lectura costosas. Inspeccionar grants/`SECURITY DEFINER`/`search_path` y rutas Realtime/Storage con casos A/B/C. Cualquier corrección SQL va en migración aditiva con test SQL negativo.

**Aceptación:** fixtures de más del límite recuperan todas las filas sin huecos/duplicados y con orden estable; el tope máximo no se puede elevar desde el cliente; ataques de usuario ajeno y rol manipulado fallan; entradas inválidas no escriben parcial; no se filtran secretos/campos privados; todos los tests PGlite y server pasan. Adjuntar SQL de `EXPLAIN` solo si se midió contra staging/datos sintéticos suficientes, y marcar staging pendiente si no existe.

### Commit 5 — Integración: conectar, cerrar y demostrar la presentación

**Mensaje sugerido:** `test(release): cierra recorridos críticos y documenta límites de demo`

**Propiedad:** integración de pruebas E2E, smoke/documentación de demo y del resumen de cambios; conectar la UI a la paginación del commit 4 si requiere cambio de página. No reabrir una refactorización amplia de lógica ni tocar migraciones para resolver fallos visuales.

**Trabajo:** ejecutar todos los recorridos tras integrar los cuatro commits; completar una matriz de todas las rutas del README con vista, rol, estados y E2E asociado; comprobar tamaños de viewport, navegación atrás/adelante, errores y reintentos; actualizar copy/docs para distinguir prototipo local, datos TMDB, funciones propuestas, Plus sandbox y requisitos externos. Adjuntar captura/informe de preview y SHA cuando el deploy-smoke esté disponible. Dejar decisiones legales/operativas claramente pendientes del responsable.

**Aceptación:** `npm test`, `npm run lint`, `npm run build`, `npm run test:e2e` y `git diff --check` verdes; no hay errores JS en consola en los recorridos; inventario de ruta/botón con cobertura y excepciones justificadas; ninguna falsa afirmación de pagos/funciones reales; archivo legal no se marca aprobado sin responsable; preview verificado por HTTP y SHA. Si no se puede verificar un servicio remoto, su estado queda **PENDIENTE**, no PASS.

## 5. Lista de rutas y recorridos que deben quedar cubiertos

| Área | Rutas/acciones | Casos mínimos |
|---|---|---|
| Acceso | `/`, `/login`, `/register`, `/registro`, `/recuperar`, `/nueva-contrasena` | carga, error remoto, confirmación, enlace inválido/usado, teclado, atrás/adelante, destino interno seguro |
| Descubrir | `/home`, `/movies`, `/catalogo`, `/peliculas`, `/movie/:id`, `/cine`, `/cine/:id`, `/functions` | búsqueda, sugerencias, filtros/orden, ficha inexistente, favoritos, compartir, trailer, plataformas, enlaces oficiales y errores TMDB |
| Duo | `/duo`, `/duo/sala`, `/duo/sala/:code` | wizard, reanudar/reiniciar, calibración, sin resultados, filtros, maratón, movimiento reducido, compartir, invitado/cuenta, votos/ronda/resultado |
| Planes | `/create-plan`, `/plan/:id`, `/invite/:token`, `/plans`, `/my-plans`, `/planes` | crear, guardar doble, editar/version conflict, invitar/revocar, RSVP propio, salir, cancelar, importar local, límite/paginación, token inválido |
| Social | `/grupos`, `/grupos/:id`, `/grupos/unirse/:token`, `/resumen`, `/importar`, `/aliados` | invitación, miembro/editor/admin, CSV malformado/duplicado, exportar, estados de red, lectura/escritura ajena bloqueada |
| Cuenta/ops | `/profile`, `/perfil`, `/dashboard`, `/admin`, `/plus` | aislamiento de cuenta, cambio de perfil/avatar, logout/reintento, ruta protegida/rol, Plus sandbox y ausencia de pago real |
| Información | `/legal`, `/legal/:doc`, `/about`, `*` | enlaces y atribuciones, borrador visible, aliases, 404 real y vista cliente |

## 6. Condición para llamarla “lista para presentar”

Para una **presentación académica local**, cerrar cinco commits, pasar pruebas locales y dejar visible que Plus y algunas fuentes están en modo demo puede ser suficiente. Para una **presentación pública con usuarios reales**, también se requiere aprobación de términos/privacidad, verificación del SHA en staging, migraciones y Auth reales, RLS A/B, Redis, correo, cabeceras y rutas HTTP, rotación/escaneo de secretos y recorrido en móviles. No etiquetar la segunda como lista con pruebas PGlite o un build verde.

## 7. Archivos de referencia del checkout

- Rutas y providers: `src/app/router.jsx`, `src/App.jsx`.
- Acceso y cuenta: `src/pages/AuthPage.jsx`, `src/context/AuthContext.jsx`, `src/services/authService.js`, `src/components/ProtectedRoute.jsx`.
- Datos locales: `src/hooks/useFavorites.js`, `src/hooks/useDuoHistory.js`, `src/context/PlanContext.jsx`.
- Recomendación: `src/services/recommender.js`, `src/services/recommender.test.js`.
- Persistencia backend: `src/services/planRepository.js`, `src/services/groupRepository.js`, `src/services/partnerRepository.js`.
- Seguridad/operación: `server/`, `api/`, `supabase/migrations/`, `supabase/tests/`, `.github/workflows/`, `vercel.json`.
- Evidencia y límites: `playwright.config.js`, `e2e/`, `docs/LEGAL-PENDIENTES.md`, `docs/OPERACION-STAGING.md`, `docs/APP-MOVIL-ANDROID.md`.
