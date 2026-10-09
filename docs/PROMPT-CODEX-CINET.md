# Prompt de ejecución para Codex: CINET

Puedes copiar todo este archivo a Codex o pedirle que lo lea y lo ejecute desde el checkout de CINET. La estrategia complementaria está en `docs/CINET-ESTRATEGIA-2026-10-09.md`.

---

Actúa como responsable de producto y arquitecto de software de CINET. Analiza, toma decisiones justificadas e implementa el producto por incrementos funcionales. No termines entregando solo ideas, pantallas vacías o un plan: desarrolla y verifica cada incremento viable, dejando evidencia de qué funciona y de qué depende de una acción externa.

## Objetivo y contexto de negocio

Convertir CINET en una experiencia para descubrir algo que te guste, decidir con amigos, pareja o familia y coordinar un plan en casa o en el cine. La promesa es **«Buenas historias. Mejores planes»**. El motor de recomendación justo y explicable es el activo central; el negocio futuro conecta grupos con servicios oficiales, exhibidores, eventos y aliados.

Primer público: grupos de amigos adultos en Bogotá y Chía. Parejas son un segmento de repetición; familias requieren diseño específico. Un piloto universitario es una propuesta, no un convenio con La Sabana. Explora otras ideas si mejoran esta trayectoria, pero ordénalas por valor, dependencias, coste y evidencia; no agregues una red social genérica sin una necesidad comprobada.

Recorrido que debes completar: **descubrir → decidir → coordinar → abrir el servicio o cine oficial → recordar y repetir**. CINET no tiene actualmente derechos, infraestructura ni catálogo propio para reproducir películas completas. Expresa correctamente qué hace cada botón.

La evaluación del 9 de octubre propone planes y salas compartidos, proxy TMDB, CI, analítica, perfiles, importación CSV, Open Graph, PWA, justicia entre sesiones, grupos, lenguaje natural, veto, familia, alianzas y monetización. Implementa este alcance por fases, incluyendo la preparación técnica de las funciones con dependencias externas, sin presentar acuerdos, licencias, pagos ni disponibilidad simulados como reales.

## Reglas de trabajo

1. Trabaja en `C:\Users\samue\OneDrive\Escaneos\Documentos\GIT\CINET`. No lo confundas con el checkout `cinehub`. Lee los `AGENTS.md` aplicables y los dos documentos de esta propuesta. Comprueba el código actual: este contexto puede quedar antiguo.
2. Ejecuta `git status --short`, revisa diffs y registra los cambios que ya existían. No uses reset/clean, no recuperes archivos eliminados automáticamente ni sobrescribas trabajo ajeno. No hagas commit, push ni despliegue automático.
3. Si existe el grafo y sigue aplicando la instrucción de `C:\Users\samue\AGENTS.md`, usa primero `graphify query` y contrasta sus resultados con el código. Tras modificar código, actualiza el grafo según esa instrucción.
4. Conserva React, Vite, React Router y Supabase. No migres a Next.js ni reescribas toda la app sin demostrar una necesidad. Mantén rutas y enlaces existentes, identidad CINET, avatares, Auth, roles, catálogo, TMDB, favoritos, historial, dado, maratones y plan en casa/cine.
5. No imprimas valores de `.env*`, tokens, sesiones ni datos privados. Usa `.env.example` para documentar nombres y placeholders. Las claves publicables de Supabase pueden estar en cliente; los secretos TMDB, service-role, pasarela y proveedores de IA deben permanecer en servidor.
6. Están autorizados el análisis, los cambios locales necesarios, las nuevas dependencias razonables, migraciones aditivas y comprobaciones locales. Prepara y valida migraciones y configuración antes de pedir cualquier aprobación para cambios externos. No apliques migraciones remotas, compres servicios, habilites cobros reales ni contactes aliados sin autorización específica para esa acción.
7. No solicites confirmación para cada decisión rutinaria. Documenta supuestos razonables y avanza. Si una parte depende de credenciales, permisos, licencia o convenio ausente, completa lo independiente y registra la dependencia exacta; no la sustituyas por una integración ficticia.
8. Puedes delegar auditoría, backend, experiencia y pruebas a subagentes si están disponibles. Define archivos propietarios y contratos antes de ediciones paralelas; evita que varios agentes modifiquen el mismo archivo. Integra y verifica tú el resultado. Si no hay subagentes, ejecuta el mismo trabajo secuencialmente.
9. Lleva un registro persistente de fases, tareas, decisiones y evidencia para reanudar sin repetir trabajo ni dar por terminadas funciones pendientes. Comunica avances breves y hechos comprobados.

## Estado de partida que debes revalidar

- Paquete `cinehub`, marca CINET, React/Vite, Node tests. `src/app/router.jsx` carga páginas con `lazy`; conserva `/home`, `/duo`, `/movies`, `/movie/:id`, `/functions`, `/create-plan`, `/plan/:id`, `/my-plans`, `/profile`, `/cine`, `/cine/:id`, `/dashboard`, `/admin` y alias.
- `recommender.js` ya implementa filtros, quórum, media/mínimo del grupo, motivos verificables, diversidad, votos de sesión, estrenos, dado sin repetición y maratones. No prometas que siempre existe un candidato para cada persona.
- `DuoVoteRound.jsx` ya congela ocho candidatos y permite «pásale el celular». Es una experiencia local, no seguridad de votos entre cuentas.
- `PlanContext.jsx:11` usa `cinehub-plans`; `planService.js` usa timestamp, `ownerEmail` y nombre para RSVP. El enlace no comparte datos entre dispositivos. Planes sin propietario tienen permisos locales amplios: esa regla no debe pasar al backend.
- Auth, perfiles, roles y avatares usan Supabase. El README contiene afirmaciones antiguas de Auth local: corrígelo con evidencia. Las migraciones actuales no prueban despliegue remoto.
- Favoritos, historial y sesión Duo usan claves globales por navegador. El perfil cinéfilo no equivale a gustos sincronizados por cuenta.
- `supabase/config.toml` desactiva Auth anónima. `authService.toAppUser()` presupone email: no agregues invitados sin corregir ese contrato y revisar guardias/roles.
- `/cine` obtiene títulos TMDB región CO; no son funciones por sede. `showtimes.js` tiene tres sedes y cuatro horas fijas. Las cadenas son enlaces oficiales generales, no convenios ni APIs.
- `tmdbClient.js` usa `VITE_TMDB_READ_TOKEN`, admite URL alternativa y conserva caché/fallback. `new URL(config.baseUrl + path)` necesita adaptación si el proxy es una ruta relativa.
- `vercel.json` tiene rewrite global a `index.html`; las API y páginas de compartir deben resolverse antes del fallback SPA.
- El 9 de octubre esta revisión ejecutó lint correcto, 57/57 pruebas y build correcto, con entrada JS de 500,84 kB y CSS de 201,64 kB. Repite la línea base en tu ejecución; no heredes estos resultados como si fueran tuyos.

## Fase 0. Auditoría y contratos

Inspecciona `src/App.jsx`, router, contexts, hooks, servicios, componentes Duo/planes/cine, migraciones, configuración de hosting y scripts. Identifica estados reales, demos, inconsistencias y regresiones. Ejecuta la línea base con `npm.cmd` en Windows.

Produce un backlog ejecutable: ID, problema del usuario, comportamiento esperado, archivos, dependencias, aceptación y validación. Elige los nombres finales de tablas y contratos; los nombres propuestos abajo son guía, no obligación si el repositorio ya tiene equivalentes.

Define por escrito: cuenta permanente/invitada, identidad de miembro, privacidad de planes y grupos, fases de sala, tratamiento de datos locales, fuentes de funciones, estados de disponibilidad y modelo de permisos. Empieza después el incremento P0; no cierres la entrega solo con esta auditoría.

## Fase 1. Base segura y un plan realmente compartido

### 1A. TMDB en servidor

- Implementa un proxy compatible con el hosting real, por ejemplo `/api/tmdb`, y adapta el cliente conservando timeout, errores, caché, disponibilidad regional y fallback.
- Usa una lista explícita de rutas y parámetros permitidos según lo que consume la app. Acepta solo lectura; no aceptes URLs arbitrarias, hosts proporcionados por usuarios, credenciales del cliente ni operaciones de cuenta TMDB.
- Valida IDs, longitud de búsqueda, paginación y parámetros. Usa token solo de servidor, timeout y errores sin secretos. Diferencia TTL de búsquedas, detalles y disponibilidad; indica antigüedad cuando corresponda.
- Añade límite de peticiones adecuado al despliegue. Un contador en memoria de una instancia serverless no es un límite global; no lo reportes como tal. Documenta la solución desplegable y su coste si requiere un servicio adicional.
- Resuelve correctamente la URL relativa y las rutas de Vercel. Comprueba que `/api/*` no termina sirviendo HTML y que las rutas profundas existentes siguen funcionando.
- Verifica con credencial sintética que el build de producción no incluye el secreto. Documenta retirada de `VITE_TMDB_READ_TOKEN` en producción y rotación si el token real se publicó antes; no muestres el token ni rotes la cuenta sin autorización.

### 1B. Persistencia compartida y permisos

- Añade adaptador remoto detrás de los hooks/context actuales y conserva el modo local claramente indicado cuando no existe backend. El modo local no debe afirmar que el enlace comparte información.
- Modelo mínimo: `plans`, `plan_members` y `plan_invites`. Usa UUID, propietario por `auth.uid()`, modo casa/cine, título canónico, fecha/hora/zona, estado y versión. Un resumen del título puede acompañar al ID para resiliencia, respetando términos de datos.
- Plan privado por defecto. Miembros acceden a detalles permitidos; solo propietario modifica/cancela; cada miembro modifica su RSVP. No usar email o nombre como autorización ni `using (true)` para datos privados. Revocar invitaciones y acceso tiene efecto verificable.
- Invitaciones con token aleatorio de alta entropía, hash en base, expiración, revocación y canje validado en servidor. Códigos cortos tienen rate limiting y validación de acceso; no son el único secreto permanente. No registres tokens en analítica.
- Creación, incorporación y confirmación deben ser idempotentes. Restricciones únicas, validación de entrada y transacciones evitan duplicados, miembros de más y pérdida de cambios. Define conflicto de edición y cancelación.
- Conserva los datos locales. Ofrece revisión e importación optativa a la cuenta actual con deduplicación y mapeo de IDs. No atribuyas silenciosamente historial de un navegador compartido a una cuenta, ni conviertas RSVP antiguos por nombre en confirmaciones autenticadas.
- Muestra estados de carga, permiso denegado, invitación vencida/revocada, plan cancelado y error recuperable. No conviertas un fallo remoto en «guardado» ni en un plan local sin avisar.

### 1C. Honestidad y entrega continua

- Sustituye funciones ficticias por hora propuesta por el organizador y enlace oficial hasta disponer de fuente autorizada. Mantén los ejemplos exclusivamente en modo demo identificado. Diferencia título en cartelera regional de función confirmada en una sede.
- Revisa `MovieActions`, compartir y textos de compra/reproducción: «Dónde verla», «Consultar cartelera» y «Comprar en el sitio del cine» solo cuando describan el destino real. Conserva tráileres oficiales y atribuciones existentes.
- Añade CI con instalación reproducible, lint, pruebas, build y un recorrido E2E importante. CI no utiliza producción ni secretos reales; la integración usa un entorno de pruebas aislado.
- Añade contrato de eventos de producto y adaptador de analítica configurable. Sin proveedor configurado, no simules medición remota. Evita email, direcciones, texto privado, gustos y votos individuales en eventos. Define consentimiento, retención y borrado según la implementación y revisión aplicables.

**Aceptación P0:** A crea un plan, B lo abre en otro contexto/dispositivo y responde con identidad propia; A ve la respuesta persistida. Dos miembros con el mismo nombre no se confunden. C, sin invitación, no puede leer detalles privados, editar ni confirmar como B. El build no expone el secreto TMDB y los horarios propuestos se distinguen de funciones reales. Prueba estos controles mediante API/SQL además de la UI.

## Fase 2. Duo desde cada celular

- Conserva «pásale el celular» y añade sala por enlace/QR/código. Primer subincremento con cuentas permanentes; completa acceso invitado sin email cuando su configuración local y permisos estén verificados.
- Si usas Supabase Auth anónima, adapta `toAppUser`, sesión, perfil y guardias. Una identidad invitada autenticada no obtiene funciones de admin ni debe verse como cuenta permanente. Revisa el trigger de perfiles públicos para no añadir datos privados. Documenta pérdida de acceso al borrar la sesión, prevención de abuso y conversión segura a cuenta permanente. No presupongas que Auth anónima está habilitada en remoto.
- Modelo orientativo: `duo_rooms`, `room_members`, `room_rounds`, `round_candidates`, `round_votes`. Conserva el máximo actual de ocho. La capacidad y el asiento son decisiones transaccionales, no cálculos confiados al cliente.
- Estados explícitos: lobby, preferencias, candidatos fijados, votación, revelación, elección, plan y cierre/expiración. Congela participantes y baraja por ronda. Un integrante tardío espera otra ronda; no cambies las opciones a mitad de los votos.
- Votos privados: durante la ronda cada persona lee/escribe solo sus votos. Ni anfitrión, ni invitado, ni canal de Realtime deben recibir votos ajenos antes del cierre. Realtime transmite progreso no sensible y cambios autorizados; el resultado canónico lo cierra el servidor.
- Utiliza políticas RLS de tablas y, si empleas Broadcast/Presence, autorización de canales privados. No confundas privacidad de canal con permisos de filas. El número de sala o un filtro frontend no son autorización.
- Gustos personales privados; comparte únicamente el resumen necesario de la sesión con permisos definidos. No publiques el historial completo de nadie para calcular el grupo. El motor actual puede reutilizarse en servidor para la decisión canónica.
- Un voto por participante/candidato/ronda, reintentos idempotentes, cierre transaccional y resultado único. Define empate, abandono, plazo, votos incompletos y falta de match. «Más votada» no significa unanimidad; no inventes consenso.
- Recupera un snapshot persistido al reconectar. Presence no demuestra asistencia ni constituye la fuente del estado. Detén suscripciones al salir o cambiar cuenta. Aplica revocación de miembro también a su canal y compruébala.
- Pantalla del anfitrión para TV/computador: QR, progreso y revelación accesible sin exposición de datos personales. Considera sesión asíncrona con fecha de cierre; no construyas infraestructura especial de TV.

**Aceptación P1:** varios contextos separados participan y ven la misma baraja y resultado; recargar, desconectar y reintentar no duplica votos ni pierde identidad. Consulta directa de otro voto se rechaza antes del cierre. Un extraño no se une enumerando salas; cierre doble y última plaza simultánea producen un único estado válido.

## Fase 3. Gustos, grupos y planes que se repiten

- Preferencias privadas por cuenta: región, plataformas, géneros, tono, duración y límites; historial de vistas/rechazos/valoraciones separado del colectivo. Reutilización editable al iniciar sesión, exportación y borrado. Aisla también la caché personal al cerrar/cambiar cuenta.
- CSV de Letterboxd/IMDb aportado por el usuario: parser que respete comillas/newlines, límite de tamaño/filas, validación, vista previa, mapeo y coincidencias por ID o título/año. Marca ambiguos y permite resolverlos; importación repetida no duplica ni sobreescribe sin elegir una política. Si exportas CSV, evita interpretación de celdas como fórmulas. No hagas scraping ni pidas contraseñas externas.
- Grupos guardados y membresía revocable, con nombre, próximas propuestas e historial colectivo compartido con permiso. «Repetir plan» reutiliza personas/configuración y pide fecha nueva; no copia confirmaciones antiguas.
- Plan completo: casa/cine, fecha o encuesta acotada de horarios, plataforma o sede, RSVP, presupuesto aproximado manual, ambiente y comida sugerida. Diferencia estimaciones, aportes de usuarios y precios verificados. No añadas ubicación precisa obligatoria.
- Exportación `.ics` y resumen para compartir. Zona inicial `America/Bogota`, configurable; fechas consistentes y privacidad de dirección/póster. Descargar calendario no significa que un recordatorio se vaya a enviar. Notificaciones reales son optativas y requieren transporte/configuración verificados; ningún envío automático a terceros durante desarrollo.
- Un veto opcional por miembro/ronda, explicado y validado en servidor. Si todos los candidatos quedan excluidos, genera otra ronda o solicita editar preferencias; no recuperes vetados para rellenar.
- Modo familia administrado por adultos: límites de duración y contenido, certificación regional normalizada y perfiles mínimos. Clasificación desconocida no equivale a apta: en modo estricto se excluye o requiere revisión explícita del adulto. No relajes límites para aumentar resultados ni prometas certificación de seguridad. Cuentas infantiles y tratamiento específico de sus datos requieren validación independiente antes del lanzamiento correspondiente.
- Justicia entre sesiones opcional: ajuste acotado, decaimiento y reinicio. Usa únicamente decisiones/valoraciones consentidas o ajuste percibido explicado; no declares que alguien «cedió» a partir de una inferencia oculta. Conserva los filtros duros y permite desactivarlo.
- Resumen anual/recuerdos con vista previa y publicación voluntaria. No expongas votos, gustos privados ni datos de menores. Evita rachas que presionen a consumir.
- Open Graph en servidor para títulos públicos y enlaces autorizados. Un plan privado tiene preview genérico por defecto; póster/título compartible requiere política explícita. No metas asistentes, dirección, gustos ni tokens privados en metadatos/cache/CDN. Título, descripción e imagen escapados y rutas compatibles con la SPA.

**Aceptación P2:** repetir con un grupo reduce pasos; cuenta A/B en el mismo navegador mantiene datos separados; CSV repetido y ambiguo se manejan sin pérdida; familia no admite títulos sin clasificación como aptos automáticamente; veto y justicia no superan restricciones; calendario conserva hora/zona y el preview de un plan privado no filtra detalles.

## Fase 4. Descubrimiento y conexión con cines

- Ofrece caminos de entrada por ocasión: solo, pareja, amigos, familia, casa o cine. Unifica lo existente en vez de ocultar catálogo o funcionalidades. Propón descubrimiento de cine colombiano, películas menos conocidas, ciclos y eventos con datos trazables.
- Contrato de `showtimeService`: título canónico, exhibidor/sede, zona, inicio con timezone, formato/idioma, URL oficial, precio si existe, fuente, última actualización, vigencia y estado. Construye un adaptador manual autorizado primero y deja sitio para API del aliado.
- Sin fuente no afirmes hora, cupos, accesibilidad, precio, asientos ni disponibilidad. Una función vencida deja de recomendarse. No extraigas cartelera automáticamente sin verificar permiso y condiciones de su fuente.
- Panel mínimo de aliado: solo usuarios vinculados a su organización gestionan sus sedes, funciones, eventos y ofertas. Verificación por operador de CINET; RLS y auditoría por organización. No uses solo una ruta protegida o el rol admin global como aislamiento entre cines.
- Fuente manual también requiere vigencia, validación y responsable. Datos de prueba están en entorno/demo separado e identificado; nunca se anuncian como convenio o cartelera real.
- Recomendación por zona, tiempo y presupuesto solo con datos disponibles. Los patrocinios tienen etiqueta y espacio separados del ranking orgánico. No permitas pagar para aparentar mejor afinidad.
- Atribución: impresiones, clics a compra oficial, planes y redenciones son eventos distintos. Venta/comisión solo con confirmación auténtica del aliado mediante importación validada o webhook firmado e idempotente. Protege contra replay y duplicados; considera cancelaciones/reembolsos.
- Prepara `docs/PILOTO-CINES.md`: propuesta de valor, piloto de una sede, entrevista, datos que debe aportar, reglas de medición, responsabilidades y borrador de acuerdo para revisión humana. No envíes mensajes ni presentes el documento como contrato aprobado.
- Prepara clubes/eventos moderados para organizadores verificados si encajan en el piloto. Proyecciones públicas y eventos tienen requisitos propios que deben resolver sus responsables; una ficha publicada no concede derechos de exhibición.

**Aceptación P3:** aliado A no modifica funciones ni ve datos privados de B; evento caducado desaparece; funciones muestran fuente/actualización; una campaña no altera ranking; un clic sin confirmación de compra no produce venta ni comisión. El piloto sin convenio permanece identificado como preparación.

## Fase 5. Comodidad, sostenibilidad e ingresos

- Lenguaje natural como interfaz al motor existente. Primero una interpretación limitada y explícita; si incorporas IA, servidor, coste acotado, esquema validado, timeout y fallback a filtros. Muestra lo entendido y permite corregirlo. El modelo no decide títulos, clasificación, funciones ni disponibilidad sin comprobación; genera criterios y el motor calcula razones reales. No envíes gustos de terceros a un proveedor sin resolver privacidad.
- PWA instalable: manifest, iconos y service worker compatibles con hosting. App shell y contenido público seleccionado; no cachees indiscriminadamente sesiones, votos, planes privados o respuestas de cuenta. Versionado, limpieza al logout y estados offline explícitos. No muestres una confirmación o un voto offline como sincronizado.
- Respaldo de catálogo mediante script reproducible, respetando licencia, atribución y límites de TMDB. Agenda/configuración documentada si no está activada. No hagas pasar ese snapshot por cartelera, clasificación o disponibilidad actual.
- CSS: consolida tokens y estilos por componente/página, elimina duplicados verificados y evita nuevas capas de overrides. Trabaja con capturas antes/después, sin reconstruir la identidad ni quitar funciones. Optimiza chunks e imágenes según medición; investiga carga de Supabase conservando restauración de Auth. No ocultes el aviso de tamaño subiendo el umbral.
- Mantén accesibles Duo básico de hasta ocho, invitación, votación básica y seguridad de familia. Diseña Plus como organización avanzada del anfitrión, recurrencias y personalización, con matriz de derechos y prueba de precio. COP 9.900 es hipótesis, no precio validado.
- Cobros: implementación de prueba y feature flag hasta licencia, proveedor y condiciones resueltos. Entitlements comprobados en servidor, webhook firmado/idempotente, cancelación y expiración coherentes. No habilites producción, descuentos, pruebas gratuitas cobrables ni promesas de reembolso sin definición autorizada.
- Comisiones de comida y boletas requieren acuerdo. Construye el contrato/adaptador y un fallback de sugerencia o enlace oficial; no muestres integración inexistente. Reportes de tendencias quedan en backlog hasta demanda y revisión real de anonimización/consentimiento; nunca vendas perfiles individuales.
- Prepara documentos de costes y salida al mercado: licencia/cotización TMDB, proveedores, infraestructura, soporte, pasarela, política de privacidad/términos por revisar y obligaciones operativas. No inventes SLA, certificaciones, precios de licencia ni alianzas.

**Aceptación P4:** IA no inventa hechos y vuelve a filtros si falla; PWA carga el shell offline sin filtrar datos privados; nuevo build se actualiza; permisos de pago no dependen de flags del navegador; sandbox no cobra realmente; rendimiento se compara con línea base y QA conserva funcionalidad.

## Medición y validación continua

Mide grupos que realizan un plan y repiten, separando autoinforme de compra/realización verificada. Instrumenta nombres consistentes como `duo_started`, `room_joined`, `preferences_completed`, `round_started`, `round_completed`, `title_chosen`, `plan_created`, `rsvp_changed`, `official_booking_clicked` y `plan_completed_reported`. Deduplica eventos y define elegibilidad/denominadores/cohortes. Los atributos serán mínimos y sin secretos de invitación, datos de menores ni preferencias individuales.

Propuesta de piloto: 10–15 grupos con dos ocasiones. Obtén primero una línea base. Tres minutos para elegir, decisión >60% y repetición >30% en 14 días son hipótesis iniciales, no resultados que debas inventar ni promesas públicas.

Valida lo siguiente en el incremento que corresponda:

1. Lint, Node tests, build y rutas existentes. Conserva pruebas significativas del motor; añade casos de invariantes reales, no tests que repitan el código.
2. PostgreSQL/RLS aislado con propietario, miembro, extraño, cuenta invitada y organizaciones distintas. No basta mockear `supabase.from()` para demostrar permisos o transacciones.
3. Navegador con contextos separados, cambio de cuenta, refresco de rutas, móvil 390 px, tablet 834 px y escritorio 1440 px. Revisa teclado, foco, lector/etiquetas pertinentes, reduced motion, overflow, errores de consola y estados vacíos.
4. Fallos de red/TMDB, disponibilidad desconocida, invitación caducada/revocada, mismo nombre, reconexión, última plaza simultánea, doble cierre, duplicación de webhook y conflicto de importación.
5. Ataques directos a contratos: cambiar propietario, votar/confirmar como otro, leer votos antes de tiempo, enumerar planes/salas, elevar rol o acceder a otra organización. Comprueba respuestas del servidor y ausencia de filtraciones.

Usa herramientas disponibles y resultados reales. Si no puedes ejecutar navegador, Supabase local, API desplegada, webhook o revisión remota, identifica exactamente esa verificación pendiente. Un build o una prueba local no prueba producción. No presentes un mock como recorrido multidispositivo real.

## Entregables y condición de cierre

Entrega código integrado, migraciones aditivas verificadas, `.env.example` sin secretos, instrucciones reproducibles, CI, pruebas pertinentes, documentación de contratos y una matriz de todas las ideas con su fase y estado. Mantén README y registro de implementación fieles al producto final.

En el informe final distingue:

- **Implementado y verificado localmente:** comportamiento y evidencia concreta.
- **Implementado, pendiente de despliegue/verificación remota:** código preparado, configuración o migración y pasos exactos.
- **Pendiente de acción comercial/configuración externa:** licencia, convenio, proveedor o autorización necesaria y resultado preparado para revisar.
- **Backlog posterior:** alcance y motivo, sin anunciarlo como disponible.

No declares logrado «todo CINET» por haber creado tablas, botones, placeholders o flags. Cada fase se cierra con su recorrido de usuario y permisos comprobados; las dependencias comerciales permanecen explícitas. Continúa con tareas independientes cuando una integración externa no esté disponible. Si la ejecución debe reanudarse, deja el último incremento estable, la evidencia y la siguiente tarea exacta.

Empieza ahora por la auditoría breve y el primer incremento P0. Antes de escribir, explica en pocas líneas el problema verificado y el resultado que implementarás; después desarrolla y valida sin pedir aprobación por pasos rutinarios.

---

## Fuentes de apoyo para la ejecución

Verificadas durante la preparación; revísalas otra vez si cambian proveedor o condiciones:

- [OpenAI Docs: guía de prompting de Codex](https://developers.openai.com/cookbook/examples/gpt-5/codex_prompting_guide): contexto, implementación, persistencia y verificación. Este prompt no impone un modelo concreto.
- [TMDB FAQ](https://developer.themoviedb.org/docs/faq): licencia comercial y atribución; no tarifa universal confirmada.
- [TMDB Watch Providers](https://developer.themoviedb.org/reference/movie-watch-providers): atribución JustWatch y límites de enlaces de disponibilidad.
- [Supabase: Auth anónima](https://supabase.com/docs/guides/auth/auth-anonymous): identidad invitada, rol authenticated, conversión y abuso.
- [Supabase: autorización Realtime](https://supabase.com/docs/guides/realtime/authorization): permisos de Broadcast/Presence y comportamiento de Postgres Changes con RLS.

La revisión jurídica y los acuerdos comerciales son dependencias de negocio; estos requisitos técnicos no acreditan cumplimiento legal ni conceden derechos sobre películas, datos o exhibición.
