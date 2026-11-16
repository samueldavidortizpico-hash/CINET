# Entrega de estabilización de CINET

Fecha: 15 de noviembre de 2026. Trabajo del desarrollador 2 sobre la base `ac7869c6fbfda64a1679287feea8ed1ab9f488a9`, procedente de `fix/audit-2026-11-07`. Rama de entrega: `devlop`, según la última confirmación de David. La rama no existía al comenzar; no se atribuye su ausencia a falta de permisos. El repositorio permitió lectura y escritura. No se modifica ni se publica directamente sobre `main`.

Esta entrega estabiliza lógica y servicios existentes. Conserva arquitectura, pesos del recomendador y archivos visuales reservados al desarrollador 1. La nueva paginación necesita aplicar una migración aditiva antes de desplegar el cliente. Los cambios no se consideran aplicados al Supabase alojado hasta que el equipo lo compruebe allí.

## Resultado y recorrido de verificación

La línea base de este commit dio 275 pruebas correctas, lint correcto y construcción web correcta. El E2E local dio 40 correctas, una fallida y tres omitidas. La falla dependía del reloj: a las 22:00 el recorrido seleccionaba hoy a las 20:30 y esperaba que el plan aún fuera futuro. Se fijó el reloj de ese caso a mediodía del 15 de noviembre de 2026 y se conservaron las dos expectativas, antes y después de la fecha. El caso focal pasó sin modificar la pantalla ni sus reglas.

Los resultados de integración del árbol final se registran en el informe Word y en los logs de entrega. Los contratos y pruebas focalizadas de cada bloque no se presentan como sustituto de los checks globales. Las mediciones de rendimiento usan datos sintéticos y no expresan precisión de recomendación, satisfacción humana ni capacidad de producción.

## Funcionalidades del proyecto

### Descubrimiento y fichas

CINET permite explorar películas y series, buscar títulos o personas, combinar filtros y consultar fichas con sinopsis, reparto, imágenes y tráiler. La disponibilidad por plataforma depende de TMDB y la región. El catálogo local sirve de respaldo; los datos remotos pasan por el proxy de lectura del servidor. La credencial TMDB no pertenece al navegador. Los enlaces externos requieren confirmar allí disponibilidad y condiciones; CINET no reproduce películas completas ni vende entradas por sí mismo.

Los favoritos guardan identificadores en el navegador. Historial y sesión Duo también pueden ser locales. La persistencia del navegador y los datos privados de una cuenta cumplen contratos diferentes: cerrar sesión no debe anunciarse como borrado de todos los datos locales.

### Autenticación perfil y preferencias

Supabase Auth gestiona registro, confirmación, login, recuperación, renovación y sesión invitada cuando está habilitada. Profiles contiene presentación y un rol protegido; user_preferences conserva preferencias privadas. El avatar usa Storage con límite y reglas por propietario. La cuenta normal no puede elevar su propio rol, y el administrador de plataforma no obtiene por ese rol acceso general a planes privados.

La interfaz sigue usando los servicios existentes. La API REST de servidor incorpora una frontera adicional para sus rutas, sin sustituir las políticas RLS ni todas las llamadas directas a Supabase. Los JWT son credenciales portadoras: su firma, vigencia y sesión se delegan a Auth, y el rol de una operación administrativa se contrasta además contra la base vigente.

### Duo y recomendaciones

Duo reúne preferencias de una a ocho personas, separa restricciones obligatorias de señales de afinidad, filtra candidatos, calcula una puntuación y presenta finalistas con razones. Combina géneros, tonos, reparto, calidad, popularidad, grupo, historial y recencia con los pesos existentes. Su parser de frases en español usa reglas; no llama a un modelo generativo.

Las preferencias negativas de exclusión y el historial de títulos rechazados deben mantenerse al generar alternativas. La calibración de títulos conocidos añade señales personales, sin convertir cada parecido en una prohibición absoluta. La puntuación no es un porcentaje ni una probabilidad de disfrute. La diversidad y los turnos opcionales ayudan a distribuir elecciones, pero cuatro fuentes de actores no cubren necesariamente todos los gustos de ocho personas.

El modo familiar necesita una procedencia compatible de clasificación. La referencia para CO sigue siendo la definida por el producto, sin inventar una certificación colombiana. La ausencia de información se trata como desconocida. En series ese filtro no dispone de la misma ruta discover y no se relaja silenciosamente. Maratón compone entradas con presupuesto temporal y ahora evita elegir una primera serie cuyos episodios no caben.

### Salas compartidas

Un anfitrión crea una sala y comparte código o QR; otras personas se incorporan desde sus navegadores. Las preferencias y votos privados se protegen por identidad y pertenencia. Las rondas fijan participantes y candidatos, distinguen sí, tal vez, no y veto, y calculan un resultado según el contrato SQL. Los límites de miembros y acciones se exigen en servidor. Las pruebas locales no acreditan entrega real de Realtime ni cuotas del proyecto alojado.

### Planes invitaciones y grupos

Un plan concreta título, lugar, fecha, hora, mensaje y asistentes. Los planes locales pertenecen al navegador; los remotos se leen por membresía y se escriben por RPC. Un enlace de invitación se acepta explícitamente y tiene vencimiento y revocación. RSVP se asocia al UUID, por lo que dos nombres iguales no comparten respuesta. La edición tiene control de versión y los estados cancelados restringen operaciones.

Los grupos reúnen participantes y permiten compartir o repetir planes, sin convertir toda futura incorporación al grupo en acceso automático al historial anterior. La encuesta propone horarios y registra disponibilidad. ICS exporta un archivo que puede importarse a un calendario; no equivale a un servicio de notificaciones de CINET. El feedback posterior es voluntario, local y alimenta el historial.

### Importación y resumen

El importador procesa CSV de servicios compatibles, limita volumen, resuelve por identificador externo o título y año y permite revisar ambigüedades. La marca de importación se separa por cuenta. Las consultas de coincidencia pueden acudir al proveedor de metadatos; el archivo no debe describirse como cargado íntegramente a un servicio que el código no usa.

El resumen anual agrega planes y señales con las fechas disponibles y ofrece cifras para compartir. No certifica asistencia ni ventas. Los contadores locales sin fecha y las cifras filtradas por año deben conservar etiquetas que expliquen su alcance.

### Aliados y Plus

Las organizaciones solicitan verificación; un operador decide su estado. Los miembros autorizados publican sedes, funciones y ofertas, con fuente, vigencia y enlace externo. Las ofertas patrocinadas se muestran aparte del ranking. Añadir colaboradores utiliza invitación con aceptación, sin reutilizar el antiguo mecanismo de alta forzada por correo.

Los webhooks verifican HMAC, ventana temporal, cuerpo acotado, campos, idempotencia y plazo de almacenamiento. Un clic de salida no es una venta confirmada. Billing mantiene un estado ordenado de eventos; el sandbox Plus y noche fija no se presentan como una pasarela de cobro real ya conectada. La integración de dinero requiere proveedor, conciliación y comprobación externa.

### Distribución y medición

La PWA conserva recursos públicos y permite abrir parte de la experiencia sin conexión; no encola escrituras privadas ni reemplaza la conexión colaborativa. Capacitor empaqueta la experiencia Android según la configuración actual. Construir la web no valida una APK instalada, retorno de enlaces, firma o ciclo de vida en un dispositivo.

La analítica requiere endpoint y consentimiento, limita eventos y permite retirar la decisión. Si se activa, el equipo debe explicar proveedor, retención y finalidad. Los documentos legales y comerciales del repositorio no equivalen a contratos firmados con cines o proveedores de pago.

## Cambios implementados

La validación final local terminó con **306 pruebas de servicios, API y SQL correctas**, lint sin errores y construcción web correcta. En navegador finalizaron **41 recorridos correctos y 3 omitidos**, sin recorridos fallidos. Las omisiones se conservan identificadas en el informe. `git diff --check` no detectó errores de formato y los 44 archivos JavaScript/HTML inspeccionados del build no contenían el nombre `VITE_TMDB_READ_TOKEN`. La comprobación del bundle se hizo sobre el build de producción anterior a la reconstrucción aislada de las fixtures E2E.

1. Duo exige clasificación de origen compatible, corrige el presupuesto de la primera serie del maratón, estabiliza la selección de fuentes ante permutaciones y reduce asignaciones en diversidad sin cambiar su selección de referencia.
2. Los repositorios incorporan páginas de transferencia con cursor compuesto y máximo fijado por servidor. Los consumidores actuales pueden seguir usando wrappers que devuelven arrays completos; el desarrollador 1 dispone también de páginas para carga incremental.
3. La API REST añade cursor compuesto para planes y organizaciones, valida límites y parámetros repetidos y distingue errores de dependencia de errores internos. Antes de administración exige rol actual además del claim firmado.
4. La matriz SQL cruza anon, dueño, miembro, ajeno, operador, sesión invitada, miembro revocado y service_role. Retirar la membresía elimina la lectura y escritura previstas en la base local.
5. CI incluye `devlop`. El E2E dependiente del horario usa un reloj fijo, sin retirar expectativas. No se cambiaron páginas, componentes visuales, router, favoritos, historial ni CSS del desarrollador 1.
6. El smoke de despliegue ya no adjunta el secreto de bypass a HTTP ni a orígenes arbitrarios. Si se configura bypass, exige `SMOKE_TRUSTED_ORIGINS` con orígenes HTTPS exactos autorizados; sin coincidencia aborta antes de llamar. Las redirecciones permanecen manuales. El operador debe configurar esa lista fuera del repositorio.
7. La CSP efectiva permite imágenes de Supabase Storage para no bloquear avatares. La regresión de navegador carga una imagen de ese origen con bytes ficticios locales y conserva el bloqueo de scripts no autorizados. Se retira el fallback Node antiguo `VITE_TMDB_READ_TOKEN`; el build final debe confirmar ausencia de ese nombre, sin confundir su aparición anterior como código muerto con una credencial expuesta.

## Contratos y coordinación con el desarrollador 1

Consultar `CONTRATOS-PAGINACION-2026-11-15.md` antes de conectar carga incremental. Debe conservarse el cursor como cadena opaca, usar el mismo al reintentar y distinguir un resultado parcial de uno completo. La migración se aplica antes del cliente; no se usa un fallback silencioso al límite antiguo cuando faltan las RPC.

`DUO-EVALUACION-2026-11-15.md` describe la procedencia opcional `filtered.family` y el motivo `rejectedBy.family`. No debe fabricarlos la pantalla para forzar un resultado. Puede añadirse un mensaje de ausencia de clasificación; esa modificación visual corresponde al desarrollador 1.

`REVISION-JWT-ENDPOINTS-2026-11-15.md` describe métodos, errores, límites y respuestas. En las rutas REST `before/nextBefore` permanecen deprecados para compatibilidad; para recorrer todas las filas debe usarse `nextCursor`. La promoción a administrador puede requerir renovar el JWT y la retirada se comprueba con el rol vigente en las rutas administrativas.

La paginación no crea un snapshot transaccional entre peticiones. Una inserción nueva que quede detrás de una posición ya recorrida se verá al refrescar. Las páginas evitan el salto por empate y la repetición de filas al continuar un conjunto estable; no prometen congelar indefinidamente una lista que otros están editando.

## Pendientes y límites externos

La rotación del token TMDB histórico sigue sin confirmación, según la respuesta de David. No se probó la credencial antigua ni se copiaron secretos a este documento. El responsable debe revocarla o confirmar su revocación en el proveedor; retirar una variable pública del build actual no invalida una copia histórica.

El proyecto Supabase alojado no se modificó. Están pendientes migración efectiva, hook de claims, configuración de correo y CAPTCHA, audiencia e issuer, sesiones reales revocadas, Realtime, Storage, backups y restauración. La API usa Auth para validar la sesión, pero las llamadas directas a PostgREST conservan el contrato propio del proveedor. No se garantiza revocación instantánea universal de todo JWT.

La lectura completa de todas las páginas preserva el contrato de las pantallas actuales, pero el trabajo total sigue creciendo con el historial. El desarrollador 1 puede usar las funciones por página y virtualización si el volumen real lo requiere. No se añadieron cachés globales de datos mutables ni índices sin una medición que los justificara.

Las herramientas de desarrollo conservan dos paquetes con avisos en la consulta de dependencias al corte, uno alto y otro crítico; el conjunto de producción no registró avisos. Actualizar el árbol de Capacitor requiere una tarea de compatibilidad y construcción Android. No se aplica una actualización mayor forzada ni se atribuye la alerta de herramienta a una explotación web demostrada.

Tres recorridos visuales E2E permanecen omitidos según el contrato del repositorio. Las funciones comerciales, el rendimiento móvil y el comportamiento de servicios reales no se consideran verificados por las pruebas con PGlite y proveedores simulados. Antes de abrir uso real, probar en staging con identidades ficticias y registrar versión, resultados y recuperación, sin exponer tokens en evidencia.

Los últimos checks remotos de la base tenían quality y dependencies correctos, secrets fallido en el paso Gitleaks y deploy smoke fallido. No se obtuvo un resumen que acreditara la causa de esas fallas: no se atribuyen a una credencial concreta ni a la descarga de la herramienta. El estado de una nueva ejecución se informa por SHA y no se confunde con el resultado de la base anterior.
