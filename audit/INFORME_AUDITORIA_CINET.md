# Auditoría técnica CINET — diagnóstico inicial

**Fecha:** 2026-11-05 · **Commit:** `c73d524726d2d0cc4d314f0794349339f4dd5819` · **Rama:** `mobile-development`
**Referencia histórica:** `5c102f832f957ea0107025aa89bdfacd326b2273` (antecesor del commit actual).
**Entorno:** Windows, Node `v24.18.1`, npm `11.16.0`; dependencias preexistentes en `node_modules`.
**Alcance:** diagnóstico y primera tanda de remediaciones locales. No hubo contacto con Supabase/TMDB/Vercel. El árbol ya estaba modificado antes de empezar; véase “Integridad del checkout”.

## Resumen ejecutivo

El repositorio es CINET y ha avanzado dos commits desde la referencia auditada (`a07f9be`, `c73d524`), con ampliaciones de producto que incluyen invitaciones, salas Duo, grupos, webhooks, preferencias y empaquetado móvil. La primera tanda corrigió localmente la limpieza de cuotas, errores de body y versión SQL NULL; sigue pendiente el limitador compartido entre procesos, importación local sin ámbito de cuenta, errores de ficha convertidos en “no encontrada” y defectos de búsqueda/Duo. Los riesgos de concurrencia PostgreSQL, Realtime desplegado, configuración de Auth, rotación del token y recuperación de producción no quedan demostrados por pruebas locales.

## Línea base observada

| Control | Resultado actual | Evidencia / límite |
|---|---|---|
| `npm test` | PASS final: 169/169, 0 omitidas, 21.1 s | Línea base previa a cambios: 163/163. Incluye Node y SQL con PGlite; no simula conexiones PostgreSQL concurrentes ni proveedor remoto. |
| `npm run build` | PASS: 238 módulos, 1.14 s | CSS principal 254.98 kB (47.19 gzip); chunk inicial `index` 304.65 kB (97.72 gzip); `DuoPage` 107.49 kB (33.32 gzip). |
| `npm run lint` | FAIL: 210 errores | ESLint alcanza bundles minificados dentro de `android/app/src/main/assets/public/assets`; `eslint src server api` dirigido pasó. Requiere revisar origen/ownership de assets antes de acotar lint. |
| `npm audit` | FAIL: 11 vulnerabilidades (6 moderadas, 4 altas, 1 crítica) | Árbol de desarrollo; reporte actual incluye `tar`, `glob`, `minimatch`, `source-map-js`, Vite y Zod. Fix automático sugiere saltos incompatibles en Capacitor/ESLint; no se aplicó. |
| `npm audit --omit=dev` | PASS: 0 vulnerabilidades | Verificado con registro npm tras autorización de red. |
| `npm ci` | NOT RUN | Evité reemplazar `node_modules` existente en un checkout con estado sucio; hace falta runner limpio. |
| SQL desde cero / despliegue / staging | NOT RUN | No se aplicó ninguna migración remota. PGlite pasa en `npm test`; no prueba compatibilidad concurrente ni estado remoto. |
| `npm run test:e2e` | 31 escenarios reportados PASS y 2 capturas omitidas; proceso no cerró | Tras imprimir resultados, el proceso quedó abierto; se interrumpió y el comando acabó con código 1. T01 tuvo escenario local satisfactorio. No equivale a staging Supabase. |

## Compatibilidad y estado del checkout

El commit fuente está en la historia local y es antecesor directo. Desde él se añadieron rutas/servicios y migraciones para invitar y aceptar planes, salas Duo, grupos y otros módulos; la rama actual también integra Capacitor/EAS. Hay modificaciones preexistentes en `.gitignore`, `.vscode/settings.json`, `src/components/home/HeroCarousel.jsx`, `src/pages/DashboardPage.jsx`, `src/services/movieService.js`, `src/styles/pages/landing.css`, además de `.playwright-mcp/`, `.vercel/`, `snapshots/` y `test-results/` sin seguimiento. No se atribuyen a esta auditoría y no se limpiaron. El build pudo actualizar `dist/` (no reportado por Git); ningún archivo de producto se editó intencionalmente.

## Matriz de hallazgos y evidencia actual

Estados: **CONFIRMADO** = evidencia estática actual suficiente; **CORREGIDO** = implementación y regresión local; **CONDICIONADO** = depende de proveedor/despliegue; **PENDIENTE DE EVIDENCIA** = inspección incompleta o no se ejecutó escenario. Ningún estado implica que el sistema publicado sea igual al checkout.

### AD — planes, identidad y datos

| ID | Severidad | Estado actual | Evidencia actual, causa y siguiente acción |
|---|---|---|---|
| AD01 | Alta | CORREGIDO (local) | `InvitePage`, router y RPC de invitación; PGlite y E2E local prueban aceptación por otra cuenta/contexto. Falta Supabase staging y extraño real. |
| AD02 | Media | PENDIENTE DE EVIDENCIA | `PlanPage` carga por ID, distingue loading/error/not-found y se suscribe con limpieza por key; `MyPlansPage` muestra error/reintento. No se ejecutaron restauración lenta, error remoto, reconexión ni cambio de cuenta. |
| AD03 | Media | CORREGIDO (local) | `RsvpPanel` usa `plan.myRsvp` para remotos; adaptador conserva `userId`; la suite SQL prueba dos usuarios llamados Sam. Falta comprobación visual completa. |
| AD04 | Media | PENDIENTE DE EVIDENCIA | `RsvpPanel` usa async/catch/finally, toast, bloqueo `saving` y deshabilita en cancelado; no se ejecutó aceptación UI para red caída, doble clic ni latencia invertida. T07–T08 pendientes. |
| AD05 | Media | CONFIRMADO (análisis estático) | `accept_plan_invite` bloquea invitación y luego plan (migración `20261009120000_shared_plans.sql`, aprox. 421–422); `cancel_plan` bloquea plan y después actualiza invitaciones (aprox. 240–245). Orden inverso mantiene posibilidad de deadlock; no hubo prueba con dos conexiones reales. |
| AD06 | Media | CONFIRMADO (análisis estático) | `set_plan_rsvp` lee estado sin bloquear plan y `create_plan_invite` cuenta invitaciones sin serializar por plan (migración anterior, funciones de RSVP/invitación). El análisis no sustituye una prueba concurrente; T09–T11 requieren PostgreSQL real. |
| AD07 | Media | CORREGIDO (local) | Migración aditiva `20261105120000_reject_null_plan_version.sql` cambia la comparación a `IS DISTINCT FROM`; PGlite prueba NULL y verifica que nombre/versión no cambian. No aplicada en remoto. |
| AD08 | Media | PENDIENTE DE EVIDENCIA | No se ejecutó corpus de JSON ni zonas PostgreSQL incompatibles con `Intl`. Revisar checks/mapeo actuales antes de concluir. T14–T15 pendientes. |
| AD09 | Media | CONDICIONADO | La migración `20261010120000_duo_rooms.sql` retira `plan_members` de Realtime tras la publicación inicial; debe confirmarse migración aplicada y observar DELETE de `plans`/cascadas desde un tercero en Supabase. |
| AD10 | Media | CONFIRMADO | `src/context/PlanContext.jsx` usa `cinet-imported-plans` global (`imported` `{idLocal:idRemoto}`), no segmentado por user UUID. La marca puede ocultar importación al cambiar de cuenta. |
| AD11 | Baja | CORREGIDO (local) | La suite contiene “cuenta: un invitado sin email no rompe la app ni pasa por cuenta permanente” y SQL limita capacidades anónimas. Auth anónima/config remota no verificada. |
| AD12 | Baja | CONFIRMADO | `valid_plan_invite` rechaza usos agotados antes de comprobar membresía en `accept_plan_invite`; la prueba cubre uso limitado de otro miembro, no reintento del ganador. Definir idempotencia del ganador tras respuesta perdida. |

### API — proxy TMDB y operación

| ID | Severidad | Estado actual | Evidencia actual, causa y siguiente acción |
|---|---|---|---|
| API01 | Alta | CONFIRMADO | `server/tmdbProxy.js` crea `new Map()` dentro de `createTmdbProxy`; límites independientes por instancia/proceso. Requiere almacén atómico compartido o regla de borde con alcance documentado. |
| API02 | Media | CORREGIDO (local) | `server/tmdbProxy.js` purga solo ventanas expiradas; prueba con 10.001 IP sintéticas demuestra que una cuota activa permanece en 429. El rate limit sigue siendo por proceso (API01). |
| API03 | Media | CORREGIDO (local) | Fallo de lectura del body devuelve 502 JSON; el adaptador normaliza excepciones inesperadas a 500 JSON. El límite de tamaño del body sigue pendiente. |
| API04 | Media | CONDICIONADO | `nodeHandler` toma el primer `x-forwarded-for`; riesgo depende de proxy confiable. Vercel estándar no se ha probado aquí. |
| API05 | Alta cond. | CONDICIONADO | No se inspeccionaron valores de secretos. Historial/documentación no demuestra si token anterior fue revocado; propietario debe confirmar rotación y entornos sin revelar valor. |
| API06 | Baja | CONFIRMADO | Proxy fuerza `include_adult=false` como parámetro, pero devuelve body íntegro; no valida `adult` en resultados de todas las rutas. Alinear política/documentación y fixtures. |
| API07 | Media | CONFIRMADO | `vercel.json` solo define cache-control para `/sw.js`; no hay conjunto de headers defensivos de aplicación. La respuesta del deployment no fue consultada. |
| API08 | Media | CORREGIDO (parcial/local) | Interpreta `Retry-After` en segundos/fecha HTTP, tope 30 s y cooldown compartido de pestaña. Cancelar trabajos al abandonar pantalla sigue pendiente. |

### FE — búsqueda, Duo, accesibilidad y persistencia

| ID | Severidad | Estado actual | Evidencia actual, causa y siguiente acción |
|---|---|---|---|
| FE01 | Media | CONFIRMADO | `src/hooks/useTitleSearch.js`: éxito de carga adicional comprueba `current.key`, rama de error actualiza estado sin verificar la clave. Error viejo puede contaminar búsqueda vigente. |
| FE02 | Media | CONFIRMADO (estático) | `MovieSearch.jsx` selecciona `options[active]` en Enter sin validar índice contra opciones actuales. Reproducir lista 4→1 y revisar reinicio al cambiar consulta. |
| FE03 | Media | CONFIRMADO (estático parcial) | `movieService.js` construye `with_people` en discover, pero la búsqueda textual usa una ruta distinta; no se ejecutó filtrado por créditos sobre resultados de texto. |
| FE04 | Baja | PENDIENTE DE EVIDENCIA | `movieService.js` aplica `SORTERS` a resultados remotos; no se ejecutó fixture dedicado de búsqueda/paginación para demostrar el contrato de orden actual. |
| FE05 | Media | CONFIRMADO | `duoService.js` y `recommender.js` deduplican con `Map(id→objeto)`; una fuente posterior reemplaza `castMatch` anterior en vez de unir señales. |
| FE06 | Media | CONFIRMADO | `Modal.jsx` usa selector de foco que omite inputs/iframe y no se verificó foco inicial/retorno en navegador. El E2E puede aportar evidencia parcial; reproductor externo y lector de pantalla no verificados. |
| FE07 | Media | CORREGIDO (local) | `asSession` valida enum, duración, cantidad, estilo y alcance; prueba verifica estado corrupto, `entries:null` y votos no objeto. Pendiente E2E de recarga real. |
| FE08 | Media | CONFIRMADO (diseño) | `tmdbClient.js` mantiene cache/cola y persistencia offline sin presupuesto agregado visible; `duoService` puede enriquecer en lote. No hay medición de bytes/peticiones máximas. |
| FE09 | Media | PENDIENTE DE EVIDENCIA | La UI etiqueta la hora como propuesta y dice que no confirma disponibilidad/precio; hay servicio de cartelera de aliados con fuente/actualización. No se ejecutó el recorrido completo ni se verificó proveedor/despliegue. |
| FE10 | Media | CONFIRMADO | `movieService.getMovieById` captura cualquier fallo y devuelve `null`; `useMovie` transforma ausencia/fallo en `notFound`. Listas filtran nulos. |

### OP — controles de entrega y producto

| ID | Severidad | Estado actual | Evidencia actual, causa y siguiente acción |
|---|---|---|---|
| OP01 | Media | CORREGIDO | README y `.env.example` describen `TMDB_READ_TOKEN` servidor, Supabase publicable y proxy; no recomiendan token Vite como obligatorio. |
| OP02 | Media | CORREGIDO (local) | `.github/workflows/ci.yml` ejecuta `npm ci`, lint, test, build y E2E para PR; no se inspeccionó protección de rama ni ejecución del workflow remoto. |
| OP03 | Media | CONFIRMADO | `npm audit`: 11 vulnerabilidades en árbol completo; `npm audit --omit=dev`: 0. No se actualizaron paquetes. Revisión de alcance/transitividad y actualización compatible pendiente. |
| OP04 | Baja | CORREGIDO (UI local) | `AnalyticsConsent.jsx` está en `Footer`; pruebas de analítica verifican sin consentimiento/no endpoint, aceptación y retirada. Receptor/retención no observados. |
| OP05 | Baja | PENDIENTE DE EVIDENCIA | Build da tamaños reproducibles, pero no hay presupuesto por ruta ni medición de dispositivo/red en este diagnóstico. |
| OP06 | Media | CONDICIONADO | Migraciones versionadas y pruebas PGlite; no hay evidencia de esquema remoto, responsable/alcance de backup ni restauración ensayada. |

## Seguridad y límites

- CI afirma que build falla si un secreto llega al bundle; el flujo de prueba con marcador sintético no fue ejecutado expresamente en esta pasada.
- `.env.example` declara secretos de servidor por nombre, sin valor; no se imprimieron ni leyeron `.env`/`.env.local`.
- Las pruebas PGlite respaldan políticas/RPC locales, no Auth real, JWT emitido por Supabase, Storage, Realtime en proyecto, cuotas Auth, correo, MFA o RLS del deployment.
- No se modificaron RLS, datos, secretos ni configuración remota. Se añadió una migración aditiva local para la versión NULL; no se aplicó en Supabase.

## Plan de remediación propuesto

1. Corregir controles de calidad reproducibles: lint global aún falla por assets Android; actualizar dependencias de desarrollo en cambios compatibles y añadir regresiones API01 y FE01/02/05/10. API02/03/08 ya recibieron cambios locales.
2. Corregir integridad de planes: orden único de locks y serialización de RSVP/invitaciones; verificar JSON/zona y reintento idempotente. AD07 ya tiene migración aditiva local. Concurrencia exige PostgreSQL real con dos conexiones.
3. Corregir estado/privacidad de colaboración: importación segmentada por cuenta; pruebas UI de estados de carga, errores, cancelación, RSVP y accesibilidad; mantener terceros denegados.
4. Corregir catálogo/Duo: combinación persona+texto, límite/cancelación de colas, presupuesto de cache, Retry-After y diferencias entre no encontrado y fallo temporal.
5. Cerrar operación con propietario: confirmar rotación de token, configuración Supabase Auth/Realtime, migraciones aplicadas, headers en deployment, rate limit de borde, backups y restauración.

La primera tanda local corrigió API02, API03 y AD07; API08 quedó corregido parcialmente por cliente. Los cambios restantes requieren pruebas/infraestructura adicionales. No se cambió de rama porque el checkout ya contiene modificaciones de usuario; no se alteraron ni limpiaron.
# Seguimiento de auditoría y remediación — 2026-11-05

## Reconciliación y alcance

Checkout auditado: `audit/cinet-2026-11-05`, commit inicial `c73d524726d2d0cc4d314f0794349339f4dd5819`. La rama `mobile-development` apunta al mismo commit; no hay divergencia entre ambas en la base auditada. `main` está en `5c102f8`. Existían modificaciones staged: ninguna; modificaciones unstaged y archivos no seguidos: véase `git status --short` de la entrega. La rama de auditoría ya existía. No se cambió de rama ni se descartaron archivos. Los cambios previos y de usuario estaban mezclados en el checkout antes de esta pasada y Git no permite fecharlos con precisión; los cambios atribuidos a auditoría son los listados en `REGISTRO_CAMBIOS.md`.

## Correcciones locales y evidencia

- **AD05/AD06/AD12:** migración aditiva `20261105130000_serialize_plan_operations.sql`: orden común de locks (plan → invitación → miembro), serialización de cancelación/RSVP/invitación y aceptación idempotente tras pérdida de respuesta. PGlite cubre formas secuenciales e idempotencia; no demuestra concurrencia real entre conexiones PostgreSQL. Estado: corrección local implementada; validación de concurrencia real pendiente.
- **AD08:** pruebas locales para JSON inválido y zona horaria desconocida. La validación SQL usa catálogo PostgreSQL; compatibilidad completa del conjunto de zonas con navegador pendiente.
- **AD10:** importaciones locales indexadas por UUID de cuenta, con prueba unitaria de aislamiento; no borra la información heredada. Cambio de cuenta completo A→B→A en navegador pendiente.
- **API01/API04/API06/API07:** limitador Upstash atómico entre instancias (12.000 global/min y 600 por IP/min), hash de claves, fail-closed, selección de IP solo desde saltos proxy configurados, filtro adulto uniforme y cabeceras en `vercel.json`. La función requiere `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`; `TRUSTED_PROXY_HOPS` debe concordar con el deployment. Solo se probó el adaptador local/mocks; no se afirma cuota compartida real ni headers desplegados.
- **FE01/02/03/05/06/08/10:** guards de búsqueda obsoleta, índice seguro de sugerencias, cruce actor+texto, unión de coincidencias de reparto, foco/trampa de teclado del diálogo, límites de cache/cola y distinción 404 frente a fallos recuperables. Pruebas unitarias locales añadidas; teclado manual en navegador y medición de carga/memoria no completados.

## Calidad y riesgos residuales

`npm test`: PASS, 180/180. `npm run lint`: PASS tras excluir solo assets generados de Android y retirar helper sin uso. `npm run build`: PASS; JS principal 306.75 kB (98.65 kB gzip), CSS 254.98 kB (47.19 kB gzip). No hay medición comparable por ruta o dispositivo. `npm audit --omit=dev`: 0; auditoría completa: 8 hallazgos (6 moderados, 1 alto, 1 crítico) tras actualizaciones compatibles no forzadas; el crítico `tar` llega por `@capacitor/cli` 6.2.3 y requiere evaluar migración mayor de Capacitor CLI/core antes de resolver. No se usó `--force`.

`npm ci` pasó en clon limpio antes de actualizar el lockfile; se debe repetir sobre el lockfile final. Playwright reporta los escenarios como PASS (33, 3 capturas omitidas), pero el proceso de Windows no termina después de cerrar los webServers y requiere interrupción; por tanto E2E como comando queda BLOCKED, no PASS. No se ha demostrado CI remoto ni runner hospedado limpio. PostgreSQL independiente, Supabase Auth/RLS/RPC/Realtime/Storage, Upstash real, TMDB, Vercel, backups y restauración no fueron accedidos.

**Clasificación:** NO APTO para staging/producción con la evidencia actual. Las pruebas locales no sustituyen concurrencia PostgreSQL, validación de proveedor ni cierre E2E limpio. Consulte `MATRIZ_38_CASOS.md`, `SEGURIDAD_CINET.md` y `RENDIMIENTO_CINET.md` para dependencias concretas.
# Informe de continuación — 2026-11-05

## Resultado de estabilización

Se verificó el checkout esperado (rama `audit/cinet-2026-11-05`, HEAD `c73d524726d2d0cc4d314f0794349339f4dd5819`). Los cambios locales ya existían al inicio y no se puede reconstruir con Git qué hunks pertenecían a trabajo previo del usuario; se limita el seguimiento a dos correcciones E2E y a esta documentación.

La validación local observada fue `npm test` 180/180, `npm run lint` y `npm run build` PASS. No equivalen a validación de proveedor, staging, navegador completo ni producción. `npm audit` conserva 8 findings, incluido 1 crítico bajo `@capacitor/cli@6.2.3` → `tar@6.2.1`; producción (`--omit=dev`) reporta cero.

Se probó `tar@7.5.21` en clon temporal. La versión corrige los dos advisory señalados, pero rompe `cap sync android`: el CLI CommonJS espera `tar.extract` y recibe `undefined`. El override se rechaza y no se toca el lockfile principal. Gradle no se llegó a ejecutar en esta evaluación.

El fake Supabase E2E recibió un cierre sin `process.exit(0)`. Se corrigió la inyección de URL/clave en el bundle rooms y se hizo configurable el puerto. La reproducción mínima dejó evidencia `net::ERR_FAILED` hacia el puerto antiguo mientras se usaban puertos alternativos; la siguiente ejecución no completó cierre natural. E2E completo: BLOCKED, sin afirmar que login esté libre de errores.

No existe PostgreSQL aislado, CI Linux ni credenciales/staging de Auth, Upstash o TMDB. T09–T13/T18, E2E completo y límites efectivos detrás del proxy quedan pendientes. No se debe aprobar staging/producción con el advisory crítico y estas validaciones abiertas.

## Cierre de esta ejecución

En un clon limpio del lockfile vigente: `npm ci` PASS; `npm test` 180/180 PASS; `npm run lint` PASS; `npm run build` PASS; `npm audit --omit=dev` PASS (0); `npm audit` FAIL (8). `git diff --check` PASS. Playwright completó escenarios (30 PASS, 0 FAIL, 3 omisiones de captura) pero no produjo salida natural; E2E BLOCKED. PostgreSQL concurrente, CI Linux, proveedores remotos y staging: BLOCKED/NOT RUN según infraestructura; no aprobación de despliegue.

La verificación de Capacitor con lockfile actual terminó `npx cap sync android` PASS. El build Gradle quedó BLOCKED por ausencia de Android SDK (`ANDROID_HOME`/`sdk.dir`); no hay evidencia de APK ni compatibilidad de dispositivo.
