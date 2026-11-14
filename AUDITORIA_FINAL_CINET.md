# AUDITORÍA FINAL CINET

Fecha: 2026-11-06. Alcance: checkout local en Windows. Rama conservada: `audit/cinet-2026-11-05`. Git inicialmente limpio. Sin commit, push, deploy, reset, cambio de rama, migraciones remotas ni eliminación de datos.

## 1. Resumen ejecutivo

Se mejoró el login conservando React, la marca CINET y su identidad carbón/coral: composición de dos columnas en escritorio, tarjeta adaptable en móvil, transiciones, entrada de marca, carga real con barrido y spinner, y respeto por movimiento reducido. Se corrigieron destinos de autenticación, navegación de las pestañas por URL, bloqueo síncrono de envíos y errores de restauración. Se añadieron alias españoles de páginas existentes.

No se declara aceptación total: HW11/HW12 exigen Express/MongoDB/Mongoose que este proyecto no implementa. Auth/JWT son gestionados por Supabase. Existen modos locales deliberados. Persistencia, SMTP, roles y configuración del despliegue remoto no se han verificado. npm audit encuentra ocho vulnerabilidades de herramientas de desarrollo; ninguna en dependencias de producción.

## 2. Arquitectura encontrada

Frontend: React 19, Vite 8, React Router 7, CSS propio, lazy imports, PWA/service worker y contenedor Android Capacitor 6. `src/app/router.jsx` declara las rutas. `src/components` representa UI; `src/pages` compone pantallas; `src/context` mantiene Auth, planes y otros estados; `src/services` contiene lógica y repositorios; `src/utils` valida/normaliza datos.

Backend: Supabase Auth, PostgreSQL, PostgREST, RPC SQL, Storage de avatares y Realtime. Migraciones versionadas en `supabase/migrations`. Funciones Node en `api/` adaptan los manejadores de `server/` a Vercel: TMDB, metadatos OG, webhooks de aliados y cobros sandbox. No hay servidor Express, carpetas backend `routes/`, `controllers/`, `middleware/`, `models/` ni Mongoose. Los repositorios son módulos cliente y las reglas de autorización son SQL/RLS.

Entidades relacionadas: profiles → auth.users; plans → owner y plan_members; grupos → miembros/planes; salas Duo → miembros/rondas/votos; organizaciones → sedes/listings; suscripciones/eventos. CHECK, NOT NULL, claves foráneas, privilegios por columna, triggers y RPC implementan restricciones reales.

Servicios externos: Supabase, TMDB, Vercel, Upstash Redis; SMTP del proveedor para correos; Capacitor/Android para empaquetado. No hay pasarela comercial activa: Plus usa sandbox.

## 3. Login y flujo de autenticación

`AuthForm` valida email y campos; registro exige nombre, contraseña de ocho caracteres y confirmación. Login acepta contraseñas existentes sin imponer reglas de alta. `authService` llama al SDK Supabase; nunca guarda contraseñas. Los errores conocidos se traducen sin revelar detalles internos. Existe mostrar/ocultar, recuperar y establecer contraseña nueva.

`AuthProvider` escucha `onAuthStateChange`; el SDK restaura/persiste y renueva access/refresh tokens. El perfil se consulta fuera del listener y se asocia al UUID para evitar mezclar cuentas. Rutas privadas esperan restauración y las de rol también esperan perfil. `safeNext` permite solo rutas internas normalizadas y excluye acceso/registro/recuperación; query y fragmento se conservan. Tras autenticarse se retoma el destino; un usuario sin permiso de admin acaba en dashboard. Un usuario ya autenticado evita volver al login, salvo invitado anónimo que desea una cuenta permanente.

La prueba de sesión caducada usa credenciales de refresco inválidas en el adaptador local. No certifica TTL, renovación, revocación o expiración remotos. El proveedor controla esos aspectos. Logout usa `signOut`; un access token previamente emitido puede seguir válido hasta expirar.

## 4. Navegación por URL

Públicas: `/`, `/login`, `/register`, `/registro`, `/recuperar`, `/nueva-contrasena`, `/home`, `/movies`, `/catalogo`, `/peliculas`, `/cine`, `/cine/:id`, `/movie/:id`, `/functions`, `/duo`, `/duo/sala`, `/duo/sala/:code`, `/create-plan`, `/plan/:id`, `/invite/:token`, `/my-plans`, `/planes`, `/plans`, `/importar`, `/resumen`, `/aliados`, `/plus`, `/grupos`, `/grupos/:id`, `/grupos/unirse/:token`, `/legal`, `/legal/:doc`. Algunas acciones de estas páginas requieren identidad, membresía, propiedad o rol en el servidor; no se confunde página pública con escritura pública.

Privadas: `/profile`, `/perfil` (guardia de página), `/dashboard` (ProtectedRoute), `/admin` (ProtectedRoute admin). `/about` redirige a créditos. Rutas desconocidas muestran 404 de UI. En una SPA el fallback puede responder HTTP 200: no se afirma HTTP 404 del hosting. No se creó una página `/series` ficticia: series comparte el catálogo y sus pestañas existentes.

Vercel conserva rewrites de `/api/tmdb`, enlaces OG y fallback de frontend excluyendo `/api/`. Deep links se probaron en servidor local; la ejecución real de esos rewrites en Vercel queda pendiente.

## 5. Roles y autorización

`profiles.role` admite `user`, `moderator`, `admin`; se crea con `user`. El cliente no puede escribir el rol por privilegios de columna y trigger, ni decidirlo con user_metadata. Admin verifica organizaciones; usuario común no puede ejecutar esa acción. Moderador está declarado pero no tiene una experiencia funcional separada demostrada. Roles de membresía de planes/organizaciones son distintos del rol global.

Las pruebas SQL crean usuarios y un admin local, ejecutan políticas y niegan operaciones cruzadas. Son SQL real en PGlite con identidad simulada. El adaptador E2E no valida firmas JWT criptográficas: no acredita autenticación Supabase real ni presencia de dos roles en la base alojada.

## 6. Convención de evidencias y estados

Estados: **Cumple**, **No cumple**, **Cumple parcialmente**, **No aplica por arquitectura**, **No verificable**. Cumple local no significa aprobado remoto. Códigos de prueba: **A** = `e2e/auth-entry.spec.js`; **P** = `e2e/entry-public.spec.js`; **SQL** = `supabase/tests/*.test.js`; **PROF** = nueva `supabase/tests/profiles.test.js`; **API** = `server/*.test.js`; **NEXT** = `src/utils/authRedirect.test.js`. Cuando dice pendiente no existe prueba remota ejecutada.

## 7. Matriz: inspección y login

| Requisito | Estado | Evidencia | Corrección o pendiente | Prueba |
|---|---|---|---|---|
| 1.1 Arquitectura completa | Cumple | Apartado 2, src/api/server/supabase | Documentada antes de editar | Inspección |
| 1.2 Tecnologías frontend/backend | Cumple | package.json y migraciones | Sin sustituciones | Inspección |
| 1.3 Flujo login | Cumple | AuthForm/authService | Auditado | A |
| 1.4 Sesiones | Cumple parcialmente | AuthProvider/SDK | Rechazos de restauración capturados; remoto pendiente | A |
| 1.5 Permisos | Cumple parcialmente | profiles/RLS/RPC | Pruebas adicionales; remoto pendiente | SQL/PROF |
| 1.6 Rutas/páginas | Cumple | Apartado 4 y router | Alias añadidos | A/P |
| 1.7 Conexión DB | Cumple parcialmente | supabaseClient/repositorios | Conexión remota no verificada | SQL local |
| 1.8 Capas backend | Cumple | Apartado 2 | Ausencias Express explícitas | Inspección |
| 1.9 Vercel | Cumple parcialmente | vercel.json | CSP parcial; hosting pendiente | API |
| 1.10 Git antes de editar | Cumple | Rama indicada, árbol limpio inicial | Rama/cambios preservados | git status/branch |
| 2.1 Diseño moderno/móvil | Cumple | auth.css/AuthPage | Tarjeta, composición, luz coral | A, capturas 390/834/1440 |
| 2.2 Email válido | Cumple | validation.js | Conservado | A inválido/vacío |
| 2.3 Contraseña válida | Cumple parcialmente | Cliente mínimo 8; config local antes 6 | Local alineado a 8; servidor remoto pendiente | A, revisión TOML |
| 2.4 Mostrar/ocultar | Cumple | PasswordField | Conservado, type button | A |
| 2.5 Errores claros | Cumple | MESSAGES y field-error | Estado/contraste mejorados | A |
| 2.6 Carga | Cumple | busy/aria-busy/spinner/barrido | Carga ligada a petición; bienvenida finita no finge avance de red | A petición retenida |
| 2.7 Evitar envíos múltiples | Cumple | pending ref y disabled | Bloqueo síncrono; desbloqueo finally | A dos submit durante petición |
| 2.8 Credenciales incorrectas | Cumple parcialmente | error invalid_credentials | Se conserva reintento | A contra adaptador; remoto pendiente |
| 2.9 Recuperación | Cumple parcialmente | forgot/reset | Sin servicio duplicado | A enlace local; SMTP pendiente |
| 2.10 Persistencia/recuperación sesión | Cumple parcialmente | SDK/AuthProvider | Manejo de promesa rechazada y reintento | A recarga; remoto pendiente |
| 2.11 Logout seguro | Cumple parcialmente | SDK signOut + limpieza caché pública | No se afirma revocación instantánea de JWT | A; remoto pendiente |
| 2.12 Redirigir al expirar | Cumple parcialmente | Evento sin sesión + guards | Destino query/hash preservado | A refresh inválido local |
| 2.13 Autenticado evita login | Cumple | leaving en AuthPage | Excepción intencional invitado/reset | A |
| 2.14 Volver al destino autorizado | Cumple | safeNext/guards | Normalización y exclusión variantes auth | A/NEXT |

## 8. Matriz: rutas

| Requisito | Estado | Evidencia | Corrección o pendiente | Prueba |
|---|---|---|---|---|
| 3.1 Mejorar router existente | Cumple | React Router | Reutilizado | A/P |
| 3.2 URL por sección | Cumple | router | Registro/login ahora cambian URL; series en catálogo | A |
| 3.3 Entrada directa | Cumple parcialmente | Router/fallback local | Hosting pendiente | A/P |
| 3.4 Recarga conserva sección | Cumple parcialmente | URL declarada | Hosting pendiente | A |
| 3.5 Atrás/adelante | Cumple | Historial router | Pestañas navegan, sin replace | A |
| 3.6 Rutas públicas | Cumple | Apartado 4 | Conservadas | A/P |
| 3.7 Rutas privadas | Cumple | Guards | Reintento de restauración en ProtectedRoute | A |
| 3.8 Protección por rol | Cumple parcialmente | Admin guard + RPC | Remoto pendiente | A/SQL |
| 3.9 Sin sesión → login | Cumple | ProtectedRoute/ProfilePage | Conservado | A/P |
| 3.10 Login → destino permitido | Cumple | from/safeNext/role guard | Conserva query/hash | A/NEXT |
| 3.11 Página 404 | Cumple | NotFoundPage y wildcard | No equivale a HTTP 404 del hosting | A/P |
| 3.12 Sin bucles | Cumple | safeNext | Rechaza /LOGIN/, /registro, codificación y dot segments auth | NEXT |
| 3.13 Rewrites Vercel | Cumple parcialmente | vercel.json | Configuración existente conservada | Inspección/API; remoto pendiente |
| 3.14 URL no evita permisos | Cumple parcialmente | Admin guard/RLS/RPC | Nuevas pruebas escalada | A/SQL/PROF; remoto pendiente |

## 9. HW11 — Express REST API

| Requisito | Estado | Evidencia | Corrección o pendiente | Prueba |
|---|---|---|---|---|
| api-design.md corresponde a endpoints | Cumple | Documento nuevo, api/server | Contratos reales y límites explícitos | Inspección + API |
| routes/ Express | No cumple | No existe Express/routes | Requiere arquitectura autorizada | No ejecutable |
| CRUD completo entidad REST | No cumple | Planes usan RPC y cancelación | No crear DELETE destructivo ni duplicar API | SQL solo arquitectura actual |
| GET consultar | Cumple parcialmente | TMDB y PostgREST | No es router Express | API/SQL |
| POST crear | Cumple parcialmente | RPC planes/webhooks | No es CRUD Express | SQL/API |
| PUT actualizar | No cumple | Edición por RPC; Auth PUT gestionado | Falta PUT entidad Express | No ejecutable |
| DELETE eliminar | No cumple | Cancelación conserva historia | Definir borrado antes de implementarlo | No ejecutable |
| Error {error,code numérico} | No cumple | Contratos distintos documentados | Versionar y adaptar consumidores si se exige | API confirma contratos actuales |
| Paginación page y limit | Cumple parcialmente | Proxy page 1–500, listPlans sin paginar | Falta limit y paginación planes | API valida page |
| deployment.txt | Cumple | Archivo nuevo | Explicita hosting no verificado | Inspección |
| AI-LOG.md | Cumple | Registro existente ampliado | Incluye cambios/evidencias reales | Inspección |
| ESLint sin errores | Cumple | Log lint | Reejecutado tras correcciones | npm run lint |
| Deploy funcional Vercel | No verificable | Sin deploy efectuado | Autorización y staging | Pendiente |

## 10. HW12 — MongoDB/Mongoose

Estos incumplimientos son respecto de la rúbrica literal, aunque PostgreSQL tenga capacidades relacionales equivalentes.

| Requisito | Estado | Evidencia | Corrección o pendiente | Prueba |
|---|---|---|---|---|
| models/ Mongoose | No cumple | Solo esquema SQL | Requiere cambio autorizado | Inspección |
| Dos modelos relacionados Mongoose | No cumple | Varias tablas FK, no modelos Mongoose | Plan pendiente | SQL no acredita Mongoose |
| Relaciones definidas | Cumple parcialmente | FK plans/plan_members y más | Correctas en SQL; no Mongoose | SQL |
| required | Cumple parcialmente | NOT NULL SQL | No validadores Mongoose | SQL |
| enum/minlength/maxlength | Cumple parcialmente | CHECK roles/longitudes/formato | No validadores Mongoose | SQL/PROF |
| Validación HTTP 400 | Cumple parcialmente | Proxy/webhook retornan 400 | PostgREST remoto no medido | API |
| Errores descriptivos | Cumple parcialmente | Mensajes cliente y SQLSTATE | No contrato Mongoose | API/SQL/A |
| .env.example | Cumple | Archivo existente revisado | Sin valores reales | Inspección |
| .env protegido .gitignore | Cumple | Reglas .env* y excepción example | Ningún .env real rastreado | git ls-files |
| Sin credenciales expuestas | Cumple parcialmente | env.js/server; build guard | Historial/remote no certificados | Inspección/build |
| populate() | No cumple | Select embebido plan_members | No afirmar equivalencia | Inspección |
| Persistencia real MongoDB | No cumple | No usa MongoDB | Migración no autorizada | No ejecutable |
| Persistencia PostgreSQL remota | No verificable | Repositorios reales implementados | Verificar dos clientes/reinicio en staging | SQL/E2E solo local |
| Conexión DB correcta | Cumple parcialmente | Cliente Supabase configurado por env | Proveedor remoto pendiente | SQL/E2E local |
| Variables Vercel | No verificable | .env.example/deployment.txt | Revisar configuración remota | Pendiente |

## 11. HW13 — Full stack y autenticación

| Requisito | Estado | Evidencia | Corrección o pendiente | Prueba |
|---|---|---|---|---|
| Integración frontend/backend real | Cumple parcialmente | SDK/RPC/proxy reales | Disponibilidad alojada pendiente | SQL/API/E2E local |
| POST /api/auth/register | No cumple | Se usa /auth/v1/signup de Supabase | No duplicar Auth sin autorización | Inspección |
| POST /api/auth/login | No cumple | Se usa token grant password | No duplicar Auth sin autorización | Inspección |
| bcrypt propio | No cumple | Hash delegado al proveedor | No se inspeccionó almacenamiento proveedor | No ejecutable localmente |
| Verificación contraseña | Cumple parcialmente | signInWithPassword | Proveedor remoto pendiente | A adaptador |
| Generación/validación JWT propia | No aplica por arquitectura | SDK/proveedor Supabase | No acredita JWT Express propio | JWT fake E2E no criptográfico |
| Middleware autenticación Express | No cumple | Guards UI y RLS/RPC | Cambio de arquitectura pendiente | Inspección |
| Authorization Bearer | Cumple parcialmente | SDK PostgREST, server webhooks | Validación JWT remota pendiente | SQL/E2E no firman tokens reales |
| Endpoints protegidos | Cumple parcialmente | RLS/RPC y firmas webhook | Confirmar deployment | SQL/API |
| HTTP 401 sin token válido | Cumple parcialmente | Webhooks 401 firma inválida | API Auth/PostgREST reales pendiente | API; no JWT remoto |
| Sesión segura | Cumple parcialmente | SDK, no contraseñas guardadas | Riesgo token accesible JS de SPA | A + security-audit |
| Expiración token | Cumple parcialmente | SDK refresh + eventos | Política servidor pendiente | A refresh inválido |
| Redirección al expirar | Cumple parcialmente | Guards | Query/hash conservados | A local |
| Dos roles reales en DB | Cumple parcialmente | user/admin creados en SQL/E2E local | Presencia remota no verificable | SQL/A |
| Rol en mecanismo auth | Cumple parcialmente | Perfil servidor asociado a UID | No claim personalizado firmado en JWT | SQL/A |
| Experiencias por rol | Cumple | Admin verifica organizaciones | No solo colores | A/partners SQL/E2E |
| Secciones/acciones diferenciadas | Cumple | Admin y verificación solo operador | Conservadas | A/SQL |
| Consultas reales backend | Cumple parcialmente | from/select/rpc y proxy | Remoto no verificado | SQL/API/E2E |
| Sin arrays locales sustitutos | No cumple | movieService fallback, PlanContext local | Preservados por requisito de no eliminar funciones | E2E modo sin cuentas |
| CORS dominios autorizados | Cumple parcialmente | API propia mismo origen, sin wildcard | Gateway Supabase remoto pendiente | Revisión; preflight pendiente |
| deployment.txt actualizado | Cumple | Documento nuevo | Variables/plan staging | Inspección |

## 12. HW15 — Seguridad

Ver `security-audit.md`: matriz individual de XSS, entradas, NoSQL/SQL, CORS, validación servidor, secretos, Helmet/cabeceras, rate limiting y sesiones. NoSQL/Helmet/express-rate-limit no aplican literalmente a la arquitectura; no se instalaron librerías sin un servidor que las use. La protección de datos depende de SQL/RLS desplegado, nunca del avatar o de ocultar enlaces.

## 13. Problemas y correcciones

1. Pestañas login/registro conservaban URL anterior: ahora navegan y responden a recarga/atrás/adelante, conservando el destino solicitado.
2. Redirecciones aceptaban variantes de pantallas de acceso y normalizaciones: ahora se normalizan, se filtran controles y se excluyen alias/variantes.
3. Bloqueo de submit dependía de actualización React: ref síncrona evita reentradas durante petición; finally libera el formulario.
4. getSession rechazado podía quedar sin catch: capturado; reintento libera loading en finally. ProtectedRoute ofrece reintento si restauración inicial tarda/falla.
5. Destino de ProtectedRoute perdía fragmento y ProfilePage fijaba /profile: ambos conservan pathname, query y hash, incluidos alias.
6. Contraseña mínima del backend local era seis frente a ocho del formulario: TOML alineado. No se cambió configuración alojada.
7. Cabeceras sin CSP: añadida política parcial compatible. No se declara protección XSS completa.
8. Login visual poco expresivo: nueva composición y animación descritas, conservando servicios/formularios existentes.
9. Dependencias dev vulnerables: pendiente cambio mayor de Capacitor y revisión ESLint; no se aplicaron fixes forzados ni cambios incompatibles.
10. Contratos académicos ausentes: documentados con plan; no se simularon endpoints, roles remotos, MongoDB o despliegue.
11. ESLint incluía JavaScript generado por trazas Playwright: se excluyeron solo `test-results/` y `playwright-report/`, conservando el análisis del código y las pruebas fuente.

## 14. Archivos modificados y añadidos

Código/configuración: `src/pages/AuthPage.jsx`, `src/styles/pages/auth.css`, `src/components/auth/AuthForm.jsx`, `src/app/router.jsx`, `src/pages/ProfilePage.jsx`, `src/components/ProtectedRoute.jsx`, `src/context/AuthContext.jsx`, `src/utils/authRedirect.js`, `supabase/config.toml`, `vercel.json`, `eslint.config.js`.

Pruebas: `e2e/auth-entry.spec.js`, `src/utils/authRedirect.test.js`, `server/securityHeaders.test.js`, `supabase/tests/profiles.test.js`. Documentos: este informe, `api-design.md`, `deployment.txt`, `security-audit.md`, `AI-LOG.md`. Evidencias: logs/JSON/capturas fechados en `audit/`.

## 15. Resultados de validación

Ver cierre de ejecución al final del documento. No se confunden checks de configuración, adaptadores E2E o PGlite con servicios remotos. Las pruebas disponibles cubren CRUD/RPC de planes, reglas de permisos, relaciones, errores SQL, proxy 400/404/429/5xx, webhooks 401/validación/idempotencia, recuperación, rutas, separación de cuentas y recorridos Duo/grupos/aliados/Plus.

## 16. Despliegue y variables pendientes

No verificable. No se publicó nada. Ver `deployment.txt` para variables por nombre y recorrido de staging. Sin inspección de secretos reales ni confirmación de configuración remota. UPSTASH y token TMDB son servidor; clave Supabase publicable puede ser cliente; service_role nunca debe usar prefijo VITE_.

## 17. Intervención y autorización necesarias

Para cumplir literalmente HW11/12/13: primero confirmar con el responsable académico si acepta arquitectura Supabase/PostgreSQL. Si exige Express/MongoDB/JWT propio, presentar contrato de entidad y permisos, estrategia única de identidad, correspondencia de datos, migración/reversión, convivencia temporal limitada y retiro del mecanismo anterior. Estimar trabajo y probar staging antes de migrar. Requiere autorización explícita; no se recomienda añadir una segunda autenticación paralela solo para cumplir nombres de archivos.

Actualizar Capacitor 6 → versión compatible corregida implica revisar core/android/cli, JDK/Gradle/SDK y app Android; requiere autorización del cambio mayor. Resto de moderados necesita resolución compatible de árbol ESLint y nueva auditoría. Probar correos, Supabase, RLS, Storage, Realtime, roles, Upstash y Vercel requiere entorno staging y acceso adecuados. Deploy definitivo, push o migración remota requieren aprobación expresa.

## 18. Criterio de aceptación

Mejora y comprobaciones locales realizadas dentro de la arquitectura. Aceptación integral pendiente de servicios remotos, vulnerabilidades dev y decisión académica. No se marca el proyecto como totalmente aprobado.

## 19. Matriz de pruebas funcionales

| Prueba requerida | Estado | Evidencia | Corrección o pendiente | Prueba ejecutada |
|---|---|---|---|---|
| Login correcto/incorrecto | Cumple parcialmente | A | Auth remoto pendiente | Credenciales del adaptador, error y reintento |
| Email inválido/campos vacíos | Cumple | A | Foco al primer error | Formulario registro/login |
| Persistencia/logout/expiración | Cumple parcialmente | A | TTL/revocación remotos pendientes | Reload, logout, refresh inválido |
| URL directa/recarga | Cumple parcialmente | A/P | Hosting pendiente | goto/reload/alias |
| Navegación/atrás/adelante | Cumple | A | Pestañas con URL | goBack/goForward |
| Sin sesión/roles | Cumple parcialmente | A/SQL/PROF | Gateway/roles remotos pendientes | Guards y escalada denegada |
| Ruta inexistente/redirecciones | Cumple | A/P/NEXT | UI 404, no HTTP hosting | Wildcard, destino y query/hash |
| CRUD backend | Cumple parcialmente | SQL/API | No CRUD Express | Crear/editar/cancelar planes |
| Datos inválidos | Cumple parcialmente | SQL/API/PROF | Remoto pendiente | CHECK/validación proxy/webhooks |
| Errores 400 | Cumple parcialmente | API | PostgREST remoto pendiente | Proxy/webhooks |
| Errores 401 | Cumple parcialmente | API | JWT remoto pendiente | Firma webhook inválida |
| Errores 404 | Cumple parcialmente | API | Hosting pendiente | Proxy ruta/título |
| Paginación | Cumple parcialmente | API | Falta limit/planes | page inválido 400 |
| Persistencia | No verificable | SQL local/adaptador | Reinicio DB remota pendiente | Sin prueba remota |
| Relaciones/populate | Cumple parcialmente | SQL/repositorios | Sin populate Mongoose | FK/select embebido |
| XSS | Cumple parcialmente | A nueva | Fuzzing pendiente | HTML en nombre no ejecutado |
| Inyección | Cumple parcialmente | PROF/API | Pentest remoto pendiente | Objeto username y parámetros proxy rechazados |
| CORS/preflight | No verificable | Config inspeccionada | HTTP remoto pendiente | Sin prueba completa de dominios |
| Cabeceras | Cumple parcialmente | API | HTTP Vercel pendiente | Config defensiva/CSP |
| Credenciales | Cumple parcialmente | git/build/env.js | Historial/remote pendientes | No .env real rastreado |
| Rate limiting | Cumple parcialmente | API | Auth/Upstash remoto pendientes | 429/503/spoof unitarios |
| ESLint | Cumple | audit/lint-2026-11-06.txt | Sin errores | npm run lint |
| Unitarias/integración | Cumple | audit/tests-2026-11-06.txt | 181/181 | npm test |
| Build | Cumple | audit/build-2026-11-06.txt | Producción local | npm run build |
| E2E | Cumple parcialmente | Logs E2E, cierre abajo | No proveedor remoto | npm run test:e2e |

## 20. Salvaguardas de corrección

Se reutilizaron router, AuthForm, PasswordField, AuthProvider y repositorios. Se mantuvieron tecnologías, funcionalidades, modos locales, separación de capas, migraciones y datos. No se introdujeron datos ficticios de producto: los usuarios/payloads añadidos son exclusivamente pruebas locales. Git no cambió de rama y no se hicieron operaciones destructivas ni publicación. Lint, SQL/unitarias y E2E se ejecutaron tras los grupos de cambios; los intentos incompletos o fallidos se conservan en los logs y se distinguen del cierre válido.

## 21. Evidencia visual y comandos reproducibles

Capturas inspeccionadas visualmente: `audit/login-390.png`, `audit/login-834.png`, `audit/login-1440.png`; también estados `login-validation-*.png` y `login-loading-1440.png`. No hay desbordamiento horizontal a esos anchos, comprobado en navegador. Animaciones de transform/opacity y movimiento reducido probados; no se midieron FPS ni se probó teléfono físico.

```powershell
npm.cmd run lint
npm.cmd test
$env:CINET_E2E_LOCAL_PORT='4223'
$env:CINET_E2E_ROOMS_PORT='4226'
npm.cmd run test:e2e
# Esperar a que termine: pretest:e2e genera builds aislados de los servicios reales.
npm.cmd run build
git -c core.safecrlf=false diff --check
```

No ejecutar build de producción a la vez que E2E: ambos escriben `dist`. Tampoco ejecutar dos pretest:e2e simultáneamente: comparten `node_modules/.cache/cinet-e2e-rooms`. Los puertos parametrizados evitan conflictos con otros servidores, pero no aíslan los archivos de build.

Registros no aceptables como cierre: `e2e-final-2026-11-06.txt` sufrió interferencia de builds; `e2e-complete-2026-11-06.txt` detectó dos fallos por contaminación del nombre en la prueba XSS. Se corrigió la limpieza en finally y `e2e-acceptance-2026-11-06.txt` muestra 36 aprobadas/3 omitidas. La verificación adicional `e2e-exit-2026-11-06.txt` registra además el código nativo para distinguir los avisos stderr de PowerShell del resultado real de npm/Playwright.

## 22. Cierre de resultados ejecutados

| Comprobación | Resultado final | Evidencia |
|---|---|---|
| ESLint | Sin errores; salida 0 | `audit/lint-2026-11-06.txt` |
| Unitarias e integración SQL | 181 aprobadas, 0 fallos, 0 omitidas; salida 0 | `audit/tests-2026-11-06.txt` |
| E2E completo | 36 aprobadas, 0 fallos, 3 omitidas; **EXIT_CODE=0**; 2,7 min | `audit/e2e-exit-2026-11-06.txt` |
| Omisiones E2E | Solo tres pruebas antiguas de capturas Duo bajo demanda; nuevas capturas Auth sí ejecutadas | `e2e/duo-journey.spec.js`, log |
| Build de producción | Completado; salida 0; repetido después de E2E para restaurar dist de producción | `audit/build-2026-11-06.txt` |
| Whitespace Git | Sin errores; salida 0 | `git -c core.safecrlf=false diff --check` |
| npm audit completo | 8 avisos: 6 moderados, 1 alto, 1 crítico; salida 1 esperada por vulnerabilidades | `audit/dependencies-2026-11-06.json` |
| npm audit runtime | 0 vulnerabilidades; salida 0 | `audit/dependencies-runtime-2026-11-06.json` |
| Hosting/servicios remotos | No verificados; sin deploy ni cambios remotos | `deployment.txt` |

Este cierre acredita las pruebas locales descritas, no el cumplimiento literal de Express/Mongoose ni la aceptación de producción.
