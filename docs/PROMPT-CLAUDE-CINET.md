# CINET: prompt para Claude — continuación, experiencia y crecimiento

Preparado el 9 de octubre de 2026. Incluye los pendientes del trabajo existente y nuevas propuestas del fundador. Puedes pedirle a Claude que lea y ejecute este archivo desde el repositorio. Las ideas y metas comerciales son hipótesis, no resultados ni convenios existentes.

---

## Encargo

Claude, retoma CINET como responsable de producto e ingeniería. Completa la trayectoria **descubrir algo que nos guste → decidir juntos → coordinar un plan → verlo en un servicio o cine oficial → recordar y repetir**. Implementa cambios funcionales y visibles, conservando la base actual. Investiga lo necesario, concreta decisiones, desarrolla, verifica y documenta. No cierres con otra lista de ideas o con infraestructura sin interfaz utilizable.

Lee estos documentos en este orden:

1. Este archivo: continuación y prioridades actuales.
2. `docs/IMPLEMENTACION-CINET.md`: registro de tu trabajo, que contiene tareas duplicadas y cifras históricas; contrástalo con código.
3. `docs/CINET-ESTRATEGIA-2026-10-09.md`: visión y modelo de negocio propuesto.
4. `docs/PROMPT-CODEX-CINET.md`: especificación técnica original. Sus descripciones del estado inicial ya no son todas actuales; no reconstruyas lo implementado.

Si hay diferencias entre documentos, usa el código para determinar el estado actual y este encargo para ordenar el trabajo. Ningún documento rebaja las instrucciones del usuario ni autoriza acciones externas no solicitadas.

## Visión del producto

**CINET convierte «¿qué vemos?» en «nos vemos».**

Tres experiencias conectadas: **Para mí**, para descubrir; **Con los míos**, para decidir y hacer planes; **En el cine**, para encontrar funciones y eventos de fuentes verificadas. Todo comparte los mismos títulos, preferencias, historial y permisos. El usuario entiende qué puede hacer ahora, quién falta por responder y cuál es el siguiente paso.

Público inicial: amigos adultos en Bogotá y Chía. Las parejas ayudan a validar repetición; las familias requieren filtros y privacidad específicos. La Sabana puede ser una propuesta de piloto, no un convenio. La expansión a otras ciudades se apoya en demanda y disponibilidad de aliados, no en llenar la app de datos ficticios.

CINET no reproduce películas completas ni vende entradas hoy. Abre servicios/cines oficiales. Reproducción propia, inventario, reservas, sincronización de reproducción y venta interna requieren derechos y acuerdos adicionales. No construyas estas promesas mediante embeds, scraping o pantallas simuladas presentadas como reales.

## Estado actual: continúa desde aquí

En la revisión del 9 de octubre, el trabajo aparece en el commit local `5c102f8` (`feat: secure TMDB proxy and shared plans implementation`). Esto no demuestra que esté publicado en Vercel o que las migraciones estén aplicadas remotamente. Revalida `git status`, historial y fuentes; el usuario puede seguir modificando el proyecto.

Ya existe y debes aprovechar:

- Proxy: `server/tmdbProxy.js`, `api/tmdb.js`, middleware Vite, reglas Vercel, variables explícitas en `src/utils/env.js` y guardián del build contra filtraciones de secretos. El límite del proxy es por instancia, no global.
- Base de planes: `supabase/migrations/20261009120000_shared_plans.sql`, tablas `plans`, `plan_members`, `plan_invites`, RLS y RPC, IDs UUID, cupo de 30 miembros por plan e invitaciones con hash, caducidad y revocación.
- Cliente: `src/services/planRepository.js`, `PlanContext` local/remoto, creación asíncrona y adaptaciones parciales de páginas/componentes. No confundas el cupo de planes con el máximo de ocho de Duo.
- Analítica: `src/services/analytics.js`, contrato de eventos y consentimiento. Solo está conectado el evento de creación de plan en la interfaz inspeccionada; falta activar el resto del embudo y el control de consentimiento.
- Producto previo: Duo de 1–8 personas, ronda por turnos, ranking explicable, diversidad, maratones, sagas, dado, historial, favoritos, trailers, catálogo, cuentas Supabase, roles y avatares. Conserva todo.

Evidencia previa de la inspección: 74/74 pruebas, build correcto, un aviso de lint en `PlanContext`. El token local no apareció en JS/CSS del build inspeccionado. Son resultados de una revisión anterior a tu ejecución: vuelve a medir y distingue tus resultados de estos. PGlite ejecuta SQL/RLS reales en un entorno aislado, pero no prueba el servicio completo de Supabase ni la concurrencia de sesiones independientes.

Pendientes confirmados: no existe `/invite/:token`; `PlanPage` no utiliza `repo.getPlan` ni `subscribePlan`; faltan panel de invitaciones y aviso de importación; permanecen horarios fijos y copy ambiguo; `.github/workflows` está vacío; Auth sigue presuponiendo email; no hay salas remotas, preferencias sincronizadas, grupos, modo familia, portal de cines, PWA ni Plus.

## Reglas de ejecución

1. Trabaja únicamente en el checkout `C:\Users\samue\OneDrive\Escaneos\Documentos\GIT\CINET`. Lee `CLAUDE.md` si existe y los `AGENTS.md` aplicables. Usa Graphify según las instrucciones del proyecto y contrasta el grafo con código; actualízalo tras modificar código.
2. Registra los cambios previos. Conserva trabajo ajeno, rutas, diseño CINET, comportamiento funcional y datos locales. No uses reset/clean ni borres archivos desconocidos por su nombre. No cambies de framework ni reconstruyas la app entera.
3. El usuario autoriza implementación local, dependencias razonables, migraciones aditivas, documentación y pruebas aisladas. No hagas commit/push, despliegue, migraciones remotas, compras, mensajes a aliados ni cobros reales sin una instrucción explícita para esa acción. Prepara primero el resultado revisable y los pasos externos exactos.
4. Nunca imprimas `.env*`, tokens, sesiones, claves ni datos personales. Documenta placeholders en `.env.example`. Mantén secretos de TMDB, IA, pasarela y service-role exclusivamente en servidor; las claves publicables Supabase no reemplazan RLS.
5. No te detengas a preguntar por decisiones reversibles y rutinarias. Explica tus supuestos. Si faltan una licencia, convenio, credencial o permiso, deja esa integración identificada, completa lo independiente y no la sustituyas por una mentira funcional.
6. Puedes delegar análisis, backend, frontend y verificación a subagentes si están disponibles. Define contratos y archivos propietarios; evita ediciones concurrentes del mismo archivo. La integración y comprobación del conjunto siguen siendo tu responsabilidad.
7. Desarrolla por trayectorias completas. Una tabla o un RPC no termina una función hasta que la persona pueda usarla en la interfaz. Un recorrido mock no demuestra acceso desde dos dispositivos a datos compartidos reales.
8. Actualiza `docs/IMPLEMENTACION-CINET.md` con ID de tarea, archivos, evidencia, dependencias y siguiente tarea concreta. No repitas tareas terminadas; no declares terminado un bloque que quedó a medias. Si se agota la sesión, deja un incremento estable y un resumen de reanudación preciso.
9. Comunica lo visible que cambió y dónde probarlo. En una fase de infraestructura, explica qué desbloquea y qué pantalla sigue pendiente. No prometas que completar este prompt garantiza ingresos, alianzas ni crecimiento.

## A. Cierra primero P0: planes reales y confianza

### A1. Corrige los fallos detectados

- Invitación de un uso: después de aceptar, el mismo miembro que reintenta recibe `CN410` porque se valida el consumo antes de comprobar pertenencia. Añade una prueba de regresión y resuelve el reintento idempotente sin permitir reincorporar expulsados, usar tokens revocados o saltarse caducidad. Define esas condiciones explícitamente.
- Importación: `cinet-imported-plans` no está separada por `userId`. Aísla el registro por cuenta y revisa cambios de sesión, deduplicación y resultados parciales. Conserva los originales; no conviertas antiguos RSVP por nombre en confirmaciones autenticadas.
- Carga de plan: no muestres «no encontrado» antes de restaurar Auth y terminar la consulta. Diferencia inexistencia/no acceso, error de red, falta de configuración/migración y cancelación. Una lista remota vacía por error no debe parecer ausencia de planes.
- Revisa las Promises de RSVP, eliminación, edición e importación: estados de envío, fallo visible, reintentos sin duplicados y UI coherente. En remoto usa `myRsvp` e IDs, no nombres para identidad o claves React.
- Corrige el aviso de dependencias de `useMemo` sin desactivar ESLint. Revisa que cambiar de cuenta no mantenga datos, suscripciones o mensajes de la cuenta anterior.
- Revisa validación del proxy, caché y errores con los endpoints reales del cliente. Conserva la advertencia de límite por instancia. No afirmes protección global de abuso sin implementarla y verificarla.

### A2. Completa el recorrido de plan e invitación

- `PlanPage`: carga remota por ID, refresh/realtime, cleanup, estados de carga/error y banner de cancelado. Mantén planes locales y explica su alcance. No caigas a un plan local silenciosamente cuando falla Supabase.
- Organizador: editar, crear/copiar enlace de invitación, ver invitaciones vigentes, revocar, cancelar, eliminar y quitar miembro. Persona invitada: aceptar, responder por su identidad y salir. Validación de permisos tanto en servidor como en UI.
- Nueva `InvitePage` y ruta `/invite/:token`: autenticación, preview mínimo autorizado, caducidad/revocación/cupo y aceptación. Mantén el enlace durante login sin redirección abierta. No registres el token en logs, analytics ni previews públicos; controla referrer y caché de la página según su sensibilidad.
- Comparte el enlace de invitación cuando el destinatario aún no sea miembro. `/plan/:id` es acceso para miembros, no una forma de conceder permisos. Revocar un enlace bloquea nuevos canjes; expulsar un miembro es una acción distinta que revoca su acceso.
- `MyPlansPage`: carga, error, modo local/remoto y revisión explícita de planes para importar. Una importación parcial informa qué se copió y qué falló, conservando la opción de reintentar.
- Espera a que la creación remota sea visible antes de navegar o carga el detalle por ID inmediatamente; evita el salto a «Plan no encontrado» tras un éxito de creación.

### A3. Horarios, copy, CI y medición

- `FunctionsPage`/`showtimes.js`: sustituye funciones inventadas por hora propuesta por quien organiza y consulta oficial. La cartelera TMDB por país no confirma funciones por sede. Datos de demo solo en entorno/mode explícito.
- Corrige `MovieActions`, compartir y textos de compra: «Dónde verla», «Consultar cartelera» y acceso al sitio oficial según el destino real. No pierdas trailers, favoritos ni botones de crear plan.
- Conecta eventos pertinentes del embudo Duo/planes con atributos mínimos y valores validados por tipo/enumeración. Una lista de claves permitidas no basta si admite texto personal arbitrario en sus valores. Añade interfaz de consentimiento y retirada. Sin endpoint/proveedor configurado no simules medición; prepara el contrato del receptor y su borrado/retención.
- CI: instalación reproducible, lint, pruebas, SQL/RLS, build y E2E crítico con datos de prueba. No conectes CI a producción. Documenta Node y comandos Windows `npm.cmd`.
- Actualiza README, `.env.example` y registro. Prepara `docs/DESPLIEGUE-CINET.md` para Vercel/Supabase: variables, proyectos, migraciones pendientes, revisión `--dry-run`, configuración y verificación. Revisar un deployment antiguo no publica código nuevo. No cambies `.env.local`, rotes tokens ni ejecutes migraciones remotas automáticamente.

**Salida A:** cuenta A crea; cuenta B acepta su invitación desde otro contexto y confirma; A recibe el cambio; C no puede leer/modificar. Mismo nombre no colisiona. Cancelación, revocación, expulsión, doble envío y fallos producen estados correctos. El token no aparece en cliente. El recorrido debe tener evidencia y las verificaciones externas pendientes quedar identificadas.

## B. Haz social Duo: cada persona desde su celular

- Salas por enlace, QR y código, con anfitrión, participantes, cupo de ocho, nombre visible y configuración mínima. Mantén la ronda local por turnos como opción funcional.
- Primera versión con cuentas permanentes; luego acceso invitado mediante identidad propia sin email. Corrige `toAppUser`, el significado de cuenta invitada, trigger de perfil y guardias. Un invitado no obtiene roles privilegiados ni acceso al historial de otra cuenta. Documenta habilitación de Auth anónima, abuso, expiración/limpieza y conversión a cuenta; no supongas configuración remota.
- Estados de sala: lobby, preferencias, candidatos fijados, votación, revelación, elección, plan, cierre/expiración. Congela baraja y participantes por ronda. Reingreso, integrante tardío, anfitrión que abandona y plazo de cierre tienen reglas conocidas.
- Gustos privados, aporte explícito a la sesión y resumen mínimo para el grupo. RLS y autorización de canales según el mecanismo de Realtime usado. La capacidad, membresía, cambios de fase y cierre se validan transaccionalmente en servidor.
- Votos privados hasta cierre, incluido para el anfitrión. Realtime no distribuye votos ajenos ni los expone a consultas directas. Progreso no sensible y revelación controlada. Un voto por persona/candidato/ronda; cierre doble produce un resultado único.
- Usa el motor existente para razones comprobables y decisión canónica. Define empate, votación incompleta, unanimidad, quórum y falta de match; no llames acuerdo universal a la opción más votada.
- Permite votación asíncrona con plazo y pantalla del anfitrión para una TV/computador. La pantalla muestra QR/progreso/revelación; no requiere una aplicación específica de TV.
- Reconexión desde estado persistido, reintentos idempotentes, cancelación de listeners al salir/cambiar cuenta, actualización real de permisos al expulsar. Presence no es fuente de votos ni prueba de asistencia.

**Salida B:** contextos independientes ven las mismas opciones y resultado; desconexión/refresh no pierde ni duplica respuestas; extraños y miembros expulsados no acceden; el backend impide leer votos ajenos antes del cierre. Una ronda incompleta se describe honestamente.

## C. Personalización y descubrimiento que ahorran tiempo

- Perfil privado de gustos por cuenta: región, plataformas, géneros, tono, duración, filtros y preferencias actuales. Separa **lo que me suele gustar** de **lo que quiero hoy**. No escribas preferencias sensibles en la tabla pública de perfiles.
- Sincroniza favoritos, vistas, rechazos, valoraciones y recomendaciones recientes; distingue historial individual y colectivo. Importación local optativa, cambio de cuenta seguro y exportación/borrado. Lo desconocido sigue siendo desconocido, no una preferencia inferida como hecho.
- «Tres buenas opciones»: entrada rápida con una explicación por opción y controles para ver más, cambiar criterios o usar el dado. Preserva resultados completos para quien quiere explorar. Mide si reduce tiempo de elección; no impongas una nueva encuesta larga.
- Inicio por intención: «Para mí», «Con amigos», «En pareja», «En familia», «En casa» y «En el cine». Accesos claros a continuar sala/plan y a catálogo/búsqueda existentes. Mejora composición, jerarquía y responsive; no escondas funcionalidades detrás de una landing enorme.
- Descubrimiento equilibrado: familiaridad, novedad, joyas, cine colombiano/latinoamericano y géneros relacionados. Evita repetir siempre popularidad, respeta límites duros y explica por qué aparece una opción. Un estreno patrocinado tiene espacio y etiqueta separados.
- Control «Sin spoilers»: sinopsis acotada, detalles adicionales/trailer voluntarios y avisos pertinentes. No prometas haber revisado todo el contenido ni inventes advertencias temáticas inexistentes.
- Feedback posterior opcional de una pregunta: «¿Valió la pena para ti?». Convierte respuestas en ajustes transparentes y limitados; distingue elección de haber visto el título. No declares gustos permanentes por una noche.
- CSV de Letterboxd/IMDb: tamaño/filas acotados, parser correcto, preview, matching por IDs o título/año, ambiguos revisables, política de merge y deduplicación. Exportación CSV segura frente a fórmulas. Nunca pedir credenciales ni importar mediante scraping.
- Lenguaje natural: «Como Interstellar, menos de dos horas y para ver con mi mamá» se transforma en filtros editables. Empieza con interpretación acotada; una IA futura opera en servidor con esquema, presupuesto, timeout y fallback. Títulos, certificación, disponibilidad y motivos se comprueban con fuentes/motor; no los inventa el modelo.
- Idioma, subtítulos, audiodescripción y otras necesidades se pueden expresar como preferencias; solo afirmar una opción concreta si hay datos verificables. No confundir idioma original con idioma del audio disponible.

**Salida C:** el segundo uso reutiliza gustos privados, permite corregirlos y reduce pasos; historial no se mezcla entre cuentas; tres opciones respetan restricciones; la importación es revisable/repetible y la interpretación de texto no inventa disponibilidad.

## D. Grupos, familias y planes completos

- Grupos guardados: «Los del viernes», pareja o familia; invitaciones/membresía revocables, organización clara, historial colectivo con consentimiento, próximas propuestas y watchlist compartida. La watchlist individual sigue siendo privada salvo elección expresa.
- «Repetir plan»: reutiliza configuración y grupo, pide fecha nueva y confirma disponibilidad; no copia respuestas antiguas como asistencia nueva. Recurrencias optativas con posibilidad de cancelar.
- Encuesta simple de fecha con pocas franjas, deadline y timezone. Acuerdos casa/cine, zona y presupuesto manual por persona. No exijas GPS, agenda ni contactos. Dirección exacta únicamente visible a personas autorizadas cuando sea necesaria.
- Plan en casa: plataforma, hora, duración, ambiente, comida sugerida y tareas optativas («yo llevo las crispetas»). Para comida, preferencias y aportes manuales primero; precios, menús, pedidos y comisiones solo con fuente/acuerdo.
- Plan en cine: función verificada o propuesta pendiente de consulta, sede, idioma/formato conocidos, asistentes y enlace oficial. Resumen compacto que se pueda compartir sin duplicar la coordinación de WhatsApp.
- `.ics` y recordatorios optativos. Descargar calendario no equivale a enviar notificaciones. Implementa transporte/colas/configuración solo cuando estén definidos y no envíes a terceros durante desarrollo. Respeta cancelaciones y opt-out.
- Veto opcional: uno por persona/ronda, servidor lo valida; si elimina todo, otra ronda o revisión de criterios. No relajes vetos o filtros de contenido para rellenar resultados.
- Justicia entre sesiones: ajuste acotado y explicable, con decaimiento, desactivación y reinicio. Usa valoraciones consentidas o ajuste percibido; no etiquetes a una persona como «siempre cede» por inferencia oculta. Las restricciones duras permanecen.
- Familia: preferencias mínimas administradas por adultos, duración y certificación por país. Clasificación desconocida se excluye en modo estricto o requiere revisión explícita. Sin cuentas infantiles obligatorias ni promesa de «contenido seguro» por ausencia de datos. El tratamiento específico de datos de menores requiere validación independiente.
- Memoria del grupo, diario voluntario y resumen anual compartible con preview. No publicar automáticamente gustos, votos o datos de menores. Evita recompensas que presionen a consumir o invitar.
- Accesibilidad: teclado, foco, etiquetas, contraste, tamaños táctiles, reducción de movimiento y mensajes comprensibles. Capacidad física de una sede solo con confirmación de fuente, no por su nombre o cadena.

**Salida D:** un grupo organiza otra noche sin empezar de cero, elige fecha, confirma y descarga calendario correcto. Miembros revocados pierden acceso. La familia no recibe títulos sin clasificación presentados como aptos. La compensación y el veto no vencen límites duros.

## E. Cines, eventos y negocio con datos reales

- `showtimeService`: ID canónico de título, exhibidor, sede/ciudad, inicio/zona horaria, idioma/formato, URL oficial, precio si existe, fuente, responsable, última actualización, caducidad y estado. Normaliza títulos para no confundir película/serie o IDs de diferentes proveedores.
- Empieza con programación manual autorizada y verificable; después adapta API/feed contractual si existe. No extraigas datos de cadenas ni construyas enlaces de compra supuestos. Fuente ausente = consulta oficial o propuesta del usuario.
- Explorar por zona, día, duración, presupuesto y ocasión con datos disponibles. Comparar casa/cine muestra estimaciones manuales frente a ofertas verificadas; no inventa precios o ahorros.
- Portal mínimo de aliado `/aliados` o equivalente: organización, sedes, personas autorizadas, programación, ofertas/eventos con condiciones y vencimiento. Alta/verificación por operador, permisos por organización y auditoría. A no accede a datos operativos o privados de B; rol frontend no es la protección.
- «CINET Estrenos»: curaduría de películas menos conocidas y cine local, campañas o ciclos identificados. Interés orgánico y patrocinio se separan; ningún pago aumenta en secreto afinidad o explicaciones.
- «Quiero que la proyecten»: recoge interés no vinculante por título/zona en grupos, con consentimiento. No es reserva, preventa, función confirmada ni compromiso del cine. Solo un aliado puede convertirlo en una propuesta real y debe resolver derechos, programación y condiciones.
- Clubes/ciclos/noches temáticas de organizadores verificados, descubrimiento y RSVP moderados. Publicación/reportes/bloqueo donde corresponda. Empieza curado; no construyas chat abierto, red de desconocidos o encuentros sin reglas como condición del MVP.
- Compra: enlace oficial primero. Compra grupal/asientos juntos, cupones, reservas y pago interno quedan condicionados a inventario, integración y acuerdos autorizados. No marques un grupo como con boletas por haber pulsado un botón.
- Atribución separada: impresiones, clics, planes, redenciones y compras confirmadas. Validar CSV del aliado o webhook firmado/idempotente, evitar replay/duplicados y considerar cancelación/reembolso. No compartir gustos individuales para justificar una campaña.
- Panel del aliado con datos reales y denominadores claros. Sin integración de venta presenta interés/clics, no «ventas generadas». Demostrar incrementalidad requiere referencia acordada; no atribuir todas las compras al uso de CINET.
- `docs/PILOTO-CINES.md`: propuesta concreta de una sede, funciones seleccionadas por el aliado, fuentes, responsabilidades, entrevistas, medición y borrador de acuerdo por revisar. No envíes emails ni anuncies convenios inexistentes.

**Salida E:** una sede autorizada publica datos vigentes, un grupo los usa y el aliado ve resultados distinguibles. Funciones caducadas se retiran. Campaña no manipula ranking. Un clic sin comprobación no crea venta, comisión ni reserva.

## F. Producto instalable, compartible y operable

- Open Graph/SEO de títulos y páginas públicas desde servidor, rutas profundas correctas y navegación accesible. Plan privado: preview genérico por defecto; detalle compartible solo con política explícita. Nunca asistentes, direcciones, gustos ni tokens en metadatos/cache/CDN/indexación.
- PWA: manifest, iconos, actualización/versionado y shell offline. Cachear únicamente contenidos permitidos; no sesiones, invitaciones, votos o planes privados indiscriminadamente. Borrar datos personales locales al logout según la política definida. Offline no significa RSVP/voto sincronizado.
- Snapshot del catálogo con script reproducible, límites y atribución. Programación documentada si no está activada. Un respaldo envejecido no se convierte en disponibilidad actual ni cartelera.
- Consolidación CSS por tokens/componentes/páginas, eliminación de duplicados comprobados y capturas comparadas. Preserva identidad CINET, estilos Duo/cine, mobile y reduced motion. Haz mejoras de presentación visibles ligadas al uso, no solo cambios de color.
- Medir JS/CSS, carga inicial, imágenes, requests y comportamiento en red lenta; optimizar los costes reales con lazy loading, caché y consultas acotadas. Verifica restauración Auth si cambias carga de Supabase. No ocultes el warning de bundle aumentando el umbral.
- Errores operativos trazables sin secretos ni datos personales; métricas de fallos, proveedores y coste por sala/plan. UI de estado y recuperación; soporte/reporte solo si el canal es real. No inventes disponibilidad 24/7 o SLA.
- Antiabuso: cuota de crear salas/planes/invitaciones, límites de búsqueda y prevención de enumeración; solución global desplegable si corresponde, sin asumir que un Map en serverless basta. Limpieza de cuentas/salas temporales y retención con configuración documentada; no ejecutes purgas remotas desde desarrollo.
- Cuentas: recuperación de acceso, conversión de invitado, exportación y solicitud/borrado de cuenta con consecuencias claras. Privacidad/consentimientos, controles del grupo y administración por rol en servidor. No presentar borradores legales como revisados.
- Contratos e índices, paginación, orden estable, fechas/timezones y normalización para otras ciudades. No implementar microservicios o infraestructura global antes de medir necesidad. Añade compatibilidad futura por diseño, no complejidad especulativa.

**Salida F:** instalación y shell offline probados; privacidad no se filtra al compartir/cachear; actualización de versión funciona; errores son recuperables y rendimiento tiene evidencia antes/después, sin pérdida de funciones.

## G. Ingresos y crecimiento sostenible

- Mantén gratis el núcleo existente de Duo de hasta ocho, invitaciones, votación básica y protección de familia. Nunca pongas un pago a mitad de una sesión en curso ni retires funcionalidad existente sin instrucción del usuario.
- Plus como comodidad avanzada del anfitrión: organización recurrente, opciones de personalización y herramientas avanzadas que el piloto demande. Matriz de beneficios y prueba de disposición a pagar. COP 9.900/mes es hipótesis previa, no tarifa validada.
- Cobros únicamente en sandbox hasta licencia, proveedor, condiciones y autorización de producción. Derechos de pago en servidor, webhooks firmados/idempotentes, expiración, cancelación y estados coherentes. No prometer reembolsos/prueba cobrable sin políticas definidas.
- Referidos de boletas/comida con convenio. Preparar adaptador y reglas comerciales sin inventar comisiones, precios, entrega, cupones o socios. Patrocinios identificados y separados del ranking; declarar relaciones comerciales cuando existan.
- Herramientas para exhibidores se prueban con un aliado antes de convertirlas en suscripción B2B. Tendencias agregadas son una investigación posterior: demanda real y revisión de anonimización/consentimiento. Quitar nombres no prueba anonimato; no vender perfiles ni datos de menores.
- Ciclo de crecimiento: invitado participa, el plan aporta valor y ese integrante puede organizar la siguiente noche. Compartir muestra el plan/resultado elegido con permiso. No acceder a agenda, importar contactos, mandar spam ni crear testimonios o contadores ficticios.
- Piloto de 10–15 grupos y dos ocasiones como propuesta inicial, entrevistas a organizadores e invitados, comparación de primer uso/repetición y prueba de valor para una sede. Marketing, embajadores, Reels y noches patrocinadas se preparan como materiales revisables; no se publican ni se atribuyen convenios sin autorización.
- `docs/NEGOCIO-CINET.md`: propuesta B2C/B2B, segmentos, experimentos, costes reales/por cotizar (TMDB, infraestructura, analítica, IA, soporte, pasarela), margen, riesgos operativos y próximos acuerdos necesarios. Obtén cotización de licencia comercial TMDB; no uses USD 149 como tarifa oficial universal.

**Salida G:** precios y modelos están identificados como hipótesis; sandbox no cobra; evento verificado habilita ingresos según reglas acordadas; core social accesible y costes/retención medidos antes de proclamar viabilidad.

## Orden, aceptación y criterio de «todo»

Implementa A primero. Después B; preferencias básicas de C en cuanto faciliten B. Completa C y D; habilita E con fuente/aliado de pruebas autorizado. F se incorpora donde cada capacidad lo exige; evita dejar accesibilidad, privacidad y gestión de errores para el final. G prepara validación y sandbox, manteniendo integraciones externas desactivadas hasta resolver sus dependencias.

La hoja de ruta completa es obligatoria como backlog trazable. No significa introducir todo en un único cambio ni exigir datos/contratos que aún no existen. Las propuestas condicionales (demanda de funciones, compra interna, ingresos de tendencias, IA externa y expansión) se clasifican con dependencia y criterio de activación; no anuncies disponibilidad por haber dibujado una pantalla.

Para cada tarea asigna ID, prioridad, problema del usuario, ruta/componente visible, contrato, archivos, dependencia, prueba y estado. Estados: **implementado/verificado local**, **implementado/pendiente de verificación**, **bloqueado por dependencia concreta** y **propuesta condicionada posterior**. No mezcles «escrito» con «funciona».

Métrica principal propuesta: grupos que reportan haber realizado un plan y organizan otro. Distingue autoinforme de compra/asistencia comprobada. Mide tiempo de elección, tasa de decisión, segundo RSVP, repetición D7/D30, invitados que organizan y coste por sala/plan. Define denominadores/cohortes y deduplica eventos. Tres minutos, decisión >60% y repetición >30% en 14 días son hipótesis del piloto, no datos reales.

## Verificación requerida

- Línea base propia y comprobaciones pertinentes por incremento: lint, Node tests, SQL/RLS y build. No escribir tests que solo reflejen la implementación; cubre identidad, invariantes, regresiones y concurrencia.
- Backend aislado con dueño, miembro, extraño, invitado y organizaciones diferentes. PGlite demuestra SQL local; para transacciones simultáneas y el flujo HTTP/Auth/Realtime usa un entorno que realmente los ejecute y declara lo pendiente si no está disponible.
- Browser con cuentas/contextos separados: invitación → ingreso → RSVP/revelación → plan; refresh, cambio de cuenta, reconexión, expulsión/cancelación y errores. Pruebas contra mocks identificadas como mocks; no sustituyen integración real.
- Casos críticos: mismo nombre, invitación de un uso/reintento, invitación vencida/revocada, última plaza concurrente, cierre doble, voto ajeno, edición antigua, importación repetida/parcial, sin clasificación, datos de función caducados, webhook duplicado y no autorizado.
- Verificación directa por API/SQL: no leer/editar otra cuenta u organización, no elevar rol, no responder/votar como otro y no consultar votos antes de tiempo. No basta esconder un botón.
- UI: 390, 834 y 1440 px, teclado/foco, contraste, reduced motion, overflow y consola. Guarda evidencia de las pantallas nuevas y explica qué acciones cambiaron. No simules capturas o resultados.
- Producción/remoto solo tras autorización específica. Revisa Vercel y Supabase como sistemas distintos: código/configuración para hosting y migraciones/configuración de base. No traslades una credencial del frontend a la nube sin comprobar que se publica la versión correcta.

## Entrega y reanudación

Entrega cambios integrados, migraciones aditivas (si una migración pudo aplicarse, corrígela con una nueva en vez de cambiar su historia), pruebas pertinentes, CI, `.env.example`, README fiel y documentos de implementación/despliegue/piloto/negocio cuando correspondan. Nunca subas secretos.

Al terminar cada bloque, indica qué puede probar el usuario, ruta exacta, comportamiento y evidencia. Diferencia validación local, integración real, remoto y pendientes. Una función con backend sin interfaz se reporta incompleta.

Si alguna dependencia externa falta, describe: qué falta, para qué, archivos preparados, pasos exactos y qué puede seguir avanzando. No inventes la configuración ni pidas nuevamente autorización para cambios locales ya permitidos.

Si debes detenerte por límite de sesión, registra último bloque estable, ID siguiente, archivos relevantes, pruebas corridas, fallos abiertos y dependencias. La sesión siguiente retoma ese punto, no empieza otra auditoría general ni modifica el informe para aparentar avance.

**Empieza ahora:** verifica brevemente el estado actual, reproduce/corrige los fallos A1 y completa `PlanPage`, invitaciones e importación. Continúa implementando y verificando la hoja de ruta; no entregues solo el plan. El primer resultado a mostrar es un plan que otra cuenta puede aceptar y confirmar con permisos reales.

---

## Fuentes y naturaleza de las propuestas

- [Buenas prácticas oficiales de Claude Code](https://code.claude.com/docs/en/best-practices): contexto concreto y verificaciones ejecutables. El encargo no depende de un modelo o función avanzada específicos.
- [TMDB FAQ](https://developer.themoviedb.org/docs/faq): requisitos de uso comercial y atribución; precio a cotizar.
- Las fuentes técnicas complementarias están en `docs/PROMPT-CODEX-CINET.md`.
- Las nuevas experiencias son propuestas originales para explorar en CINET, no afirmaciones de exclusividad, demanda probada, convenio ni cumplimiento jurídico. Implementación técnica y revisión comercial/jurídica tienen estados separados.
