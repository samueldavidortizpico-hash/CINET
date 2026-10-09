# CINET: de elegir una película a hacer un plan

Propuesta de producto y negocio · 9 de octubre de 2026.

Este documento organiza la visión del fundador y la evaluación adjunta. Las propuestas comerciales son hipótesis por validar. La revisión de código y las comprobaciones indicadas abajo se realizaron en este checkout de CINET; no prueban el estado de producción.

## 1. La apuesta

**CINET ayuda a encontrar algo que les guste, decidir juntos y convertirlo en un plan que sí ocurre.**

El recorrido es: descubrir → decidir → coordinar → ver en un servicio o cine oficial → recordar y repetir. CINET aporta la recomendación y la organización; reproducir películas dentro de CINET sería otro negocio que requiere derechos y acuerdos propios.

La experiencia debe resolver situaciones concretas:

- «Tenemos dos horas, Netflix y gustos diferentes»: una elección explicada y un plan en casa.
- «Somos seis y nadie se pone de acuerdo»: sala por enlace, votos privados y una decisión compartida.
- «Quiero ver algo con mi familia»: límites de contenido y clasificación conocida, elegidos por el adulto.
- «Queremos salir el viernes»: película, presupuesto aproximado, zona, fecha, asistentes y acceso a compra oficial.
- «Este estreno tiene poca visibilidad»: ayudar al cine a encontrar grupos interesados y medir resultados verificables.

JustWatch ya ofrece disponibilidad y recomendaciones personalizadas. Nuestra apuesta es competir por la calidad de la decisión en grupo y el plan completo; no asumir que una función es exclusiva sin revisar el mercado. [Descripción oficial de JustWatch](https://support.justwatch.com/article/what-is-just-watch).

## 2. Lo que el código ya ofrece

| Área | Evidencia actual | Consecuencia |
| --- | --- | --- |
| Duo | `src/services/recommender.js`, `src/services/duoService.js`, `src/data/duo.js` | Preservar 1–8 personas, filtros, quórum, explicaciones, diversidad, dado e historial. |
| Votación | `src/components/duo/DuoVoteRound.jsx` | Ya existe una ronda por turnos en un dispositivo; falta colaboración real. |
| Planes | `src/context/PlanContext.jsx:11`, `src/services/planService.js:36` | Todo se guarda localmente; propiedad por email, RSVP por nombre e ID por timestamp. |
| Cuentas | `src/context/AuthContext.jsx`, `src/services/authService.js`, `supabase/migrations/` | Auth, perfiles, roles y avatares sí tienen integración Supabase. El README todavía mezcla esta realidad con descripciones antiguas de Auth local. |
| Gustos | `src/hooks/useFavorites.js`, `src/hooks/useDuoHistory.js`, `src/hooks/useDuoSession.js` | Datos por navegador, sin separación y sincronización completas por cuenta. |
| Cine | `src/pages/CinemaPage.jsx`, `src/data/showtimes.js` | Cartelera de títulos desde TMDB y enlaces oficiales; tres sedes y cuatro horarios fijos para planes. No son inventario de funciones. |
| Películas | `src/components/movie-detail/MovieActions.jsx:20` | «Mira … en CINET» y «Ver película» necesitan describir con precisión el destino externo. |
| TMDB | `src/services/tmdbClient.js:22` | Token VITE visible en cliente si está configurado. Admite otra URL, pero el proxy aún debe construirse. No se inspeccionaron valores de `.env.local`. |
| Despliegue | `vercel.json`, `.github/workflows/` | SPA con rewrite global y carpeta de workflows vacía; faltan API, metadatos dinámicos y CI. |

Comprobaciones ejecutadas: `npm.cmd run lint` correcto; `npm.cmd test`, **57/57**; `npm.cmd run build` correcto. Build: entrada JS **500,84 kB / 146,76 kB gzip**, CSS **201,64 kB / 37,56 kB gzip**, con aviso de chunk grande. No se ejecutó QA de navegador ni se verificaron políticas, cuentas, datos o configuración del Supabase remoto.

El repositorio tiene muchos cambios anteriores a esta revisión. La ejecución posterior debe preservarlos y trabajar sobre el estado actual.

## 3. Las ideas prioritarias

| Prioridad | Experiencia propuesta | Qué aporta |
| --- | --- | --- |
| P0 | Un plan que abre en otro celular | Hace real la promesa actual de compartir y confirmar. |
| P0 | Datos honestos de funciones y disponibilidad | Evita organizar una salida con horarios ficticios. |
| P1 | Sala Duo por enlace, código y QR | Cada persona participa desde su celular; el anfitrión puede mostrar la revelación en una pantalla grande. |
| P1 | Gustos que se recuerdan | La siguiente sesión reutiliza preferencias privadas y lo ya visto, con edición y borrado. |
| P1 | «Los del viernes» | Grupo persistente, historial compartido elegido y un botón para repetir el plan. |
| P1 | Plan completo | Película, lugar o plataforma, encuesta de fecha, RSVP, calendario, ambiente y comida. |
| P2 | Justicia entre sesiones | Compensación limitada y explicada para quien cedió, sin superar límites de contenido ni vetos. |
| P2 | Modo familia | Filtros regionales y perfiles gestionados por adultos; clasificación desconocida visible. |
| P2 | Un veto por persona | Regla opcional y uniforme por ronda; si elimina todas las opciones, pedir nuevos candidatos. |
| P2 | Descubre tu próxima favorita | Mezcla de familiaridad, novedad y cine local, sin repetir siempre los títulos populares. |
| P2 | «Algo como Interstellar, pero más corto» | Texto convertido a filtros editables; el motor actual sigue decidiendo y explicando. |
| P2 | Importar CSV | Historial y valoraciones con revisión de coincidencias, sin pedir credenciales de otras plataformas. |
| P3 | CINET Estrenos y funciones especiales | Descubrimiento por zona, cineclubes y eventos aportados por aliados verificados. |
| P3 | Panel del cine | Publicar funciones autorizadas y medir interés, planes, clics y ventas confirmadas por separado. |
| P3 | Resumen del grupo | Recuerdos y resumen anual voluntario, sin publicar gustos o votos personales por defecto. |

Estas ideas completan la evaluación original. PWA, Open Graph, CI, analítica, rendimiento, CSS y actualización del respaldo son trabajo de soporte dentro de las fases, no productos separados.

## 4. Cómo puede crecer

Empezar por grupos de amigos adultos en Bogotá y Chía. Parejas aportan frecuencia; las familias son una expansión con necesidades propias. La Sabana puede ser un piloto propuesto, sin presentar un convenio institucional inexistente.

El ciclo buscado es: alguien crea una sala → invita → el grupo decide → confirma el plan → cuenta si lo realizó → otro integrante organiza la siguiente ocasión. Invitar debe servir para hacer el plan, sin obligar a publicar contactos o dar acceso a agendas.

Mantendría gratis el núcleo social existente de hasta ocho personas, la participación por enlace y la seguridad del modo familia. La propuesta del informe de cobrar por salas y reducir gratis a cuatro puede dificultar el crecimiento y retirar capacidad ya existente. Se puede cobrar por recurrencias, organización avanzada y personalización después de observar uso repetido.

Experimentos iniciales: 10–15 grupos, al menos dos sesiones por grupo y entrevistas breves al organizador y a invitados. Es una propuesta de piloto, no una muestra representativa ni una cifra ya alcanzada. Probar el flujo en situaciones reales antes de gastar en adquisición masiva.

## 5. La oferta para los cines

**Propuesta:** «Ayudamos a grupos a descubrir una película, coordinar una salida y llegar a su compra oficial; medimos cada paso». La hipótesis de que pierden clientes por falta de visibilidad debe contrastarse con cines y asistentes: también pueden influir precio, distancia, programación y competencia.

Entrar con un solo exhibidor dispuesto a colaborar, sea una sede de cadena, una sala independiente o un cineclub. El primer piloto puede funcionar con programación cargada por el aliado y enlaces oficiales, sin una API de boletas.

1. El aliado selecciona funciones reales y vigentes, condiciones y cupos promocionales que pueda acreditar.
2. CINET presenta contenido editorial o una campaña identificada, junto a recomendaciones orgánicas independientes.
3. Un grupo crea el plan y accede a la compra del aliado.
4. Un código o mecanismo acordado permite verificar redenciones o compras, sin compartir perfiles individuales.
5. Se compara el resultado con funciones o periodos de referencia acordados; clics y planes no se cuentan como boletas vendidas.

El primer acuerdo debe definir fuente y actualización de funciones, atribución, comisión si aplica, atención de incidencias, cancelaciones, caducidad y tratamiento de datos. Inventario, asientos, reservas y cobro dentro de CINET llegan solo cuando exista acceso autorizado y una operación viable.

Existe al menos una oferta oficial de ventas corporativas, confitería y funciones empresariales de Cinépolis Colombia; esto muestra una vía para explorar conversaciones, no una alianza con CINET ni la disponibilidad actual de un programa de afiliados. [Documento oficial de Cinépolis](https://static.cinepolis.com/pdf/venta-corporativa-co.pdf).

## 6. Ingresos, en orden de validación

| Modelo | Condición para probarlo | Qué evitar |
| --- | --- | --- |
| Referidos de boletas | Acuerdo escrito y compras atribuibles | Prometer comisión sin convenio o llamar venta a un clic. |
| Campañas de estrenos/eventos | Patrocinio identificado y métricas verificables | Alterar en secreto el ranking del grupo. |
| CINET Plus | Usuarios que vuelven y piden funciones avanzadas | Cobrar por la primera invitación o retirar el Duo actual. |
| Herramientas para exhibidores | Un piloto que demuestre utilidad operativa | Construir un panel enorme antes de conocer el proceso del cine. |
| Comida para el plan | Aliado y términos de enlace/pedido autorizados | Inventar precios, menús, disponibilidad o integración. |
| Tendencias agregadas | Demanda comercial y revisión de privacidad independiente | Vender perfiles, datos de menores o asumir que quitar nombres anonimiza. |

COP 9.900/mes es una hipótesis heredada del informe; no una tarifa recomendada ni validada. La prueba de precio debe considerar licencias, infraestructura, soporte, pasarela, impuestos aplicables y margen. La viabilidad se calcula con costes reales y compras/usuarios retenidos, no con el número de visitas.

TMDB distingue los proyectos comerciales por su finalidad de generar ingresos y exige consultar la licencia comercial. Su FAQ no confirma una tarifa universal de USD 149/mes; hay que obtener una cotización para CINET. [FAQ oficial de TMDB](https://developer.themoviedb.org/docs/faq).

La disponibilidad de plataformas proviene de JustWatch vía TMDB, requiere atribución y ese endpoint no entrega todos los enlaces profundos a reproducción. No se deben construir URLs ni promesas de disponibilidad inventadas. [Watch Providers oficial](https://developer.themoviedb.org/reference/movie-watch-providers).

## 7. Qué medir y qué significa

Métrica principal propuesta: **grupos que reportan haber realizado un plan y organizan otro**. Mientras no haya confirmación de asistencia, reportar por separado planes creados, confirmados y realizados según autoinforme.

| Medida | Definición |
| --- | --- |
| Tiempo para elegir | Desde inicio de preferencias hasta elección; separar primer uso, repetición y espera a invitados. |
| Tasa de decisión | Salas elegibles que terminan en elección / salas elegibles iniciadas. |
| Coordinación | Planes con al menos otro RSVP positivo / planes compartidos. |
| Realización | Planes reportados como realizados / planes ocurridos con respuesta; mostrar cobertura del autoinforme. |
| Retención D7/D30 | Grupos y organizadores de una cohorte que vuelven; no mezclar nuevos con recurrentes. |
| Invitación | Invitaciones abiertas, participantes nuevos y cuántos luego organizan. |
| Cine | Clics externos, redenciones y compras verificadas, cada uno con su denominador. |
| Coste | Coste por sala y por plan coordinado; margen por usuario de pago o referido confirmado. |

Metas iniciales para debatir tras una línea base: mediana de elección inferior a tres minutos en uso repetido, más del 60% de salas del piloto con elección y más del 30% de grupos con una segunda sesión en 14 días. Son umbrales de experimentación, no pronósticos ni resultados.

## 8. Orden de ejecución

1. **Base real:** proxy TMDB, planes compartidos, permisos por UUID, CI y honestidad de horarios/copy.
2. **Decisión social:** invitados, salas, votos privados, reconexión, perfiles y enlaces compartibles.
3. **Repetición:** grupos, planes completos, calendario, familia, veto, justicia, importación y descubrimiento.
4. **Piloto comercial:** funciones de fuente autorizada, panel mínimo de aliado y atribución de resultados.
5. **Ingresos y expansión:** Plus y campañas con licencias/acuerdos resueltos; luego otras ciudades y aliados.

Noventa días sirve como horizonte del informe original; no como garantía de entrega, licencia comercial o cierre de alianzas. Cada fase requiere evidencia funcional antes de ampliar la siguiente. No hace falta una app nativa para probar la idea; la PWA llega después de estabilizar el flujo compartido y su comportamiento sin conexión.

## 9. Alcance de esta entrega

Esta revisión entrega estrategia y un prompt de ejecución en `docs/PROMPT-CODEX-CINET.md`. No implementa todavía estas funciones ni cambia configuración o secretos. El prompt incluye tareas, dependencias, pruebas, límites comerciales y entregables para que otra ejecución pueda realizar el desarrollo.
