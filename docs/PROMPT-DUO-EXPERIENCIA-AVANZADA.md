# Prompt para Claude: Duo visual, divertido y con mejores recomendaciones

Propuesta del 9 de octubre de 2026, preparada después de inspeccionar el código actual. Complementa `PROMPT-CLAUDE-CINET.md` y `DUO-EXPERIENCIA-2026-10-09.md`. Este encargo se concentra en Duo y su recorrido hacia el plan; no pretende ejecutar al mismo tiempo todo el negocio de CINET.

## Diagnóstico previo: qué necesita cambiar

El activo actual es un motor explicable y una experiencia local que funciona con 1–8 personas, series, películas y maratones. Ya existen ocasiones, ánimo colectivo, comparación de hasta tres propuestas, votación por turnos, dado, similares, favoritos, exclusiones y preparación de casa/cine. No hay que construirlos otra vez.

La oportunidad visual está en transformar formularios y tarjetas en una experiencia con escenas, decisiones pequeñas y una revelación que tenga sentido. La oportunidad del motor está en captar mejores señales, comprobar datos y evaluar resultados. Una interfaz animada no demuestra una mejor recomendación.

Hallazgos de código, sin atribuirles resultados de usuarios:

| Hallazgo | Evidencia | Consecuencia para este encargo |
| --- | --- | --- |
| Preferencias principalmente por géneros, tono e intérpretes | `DuoPersonStep.jsx`, `buildProfile`, `hitsFor` | Falta una entrada mediante películas concretas y feedback personal más expresivo. |
| El tono se aproxima con géneros y keywords | `recommender.js: tonesOf` | «Relajada», «compleja» o «intensa» no son hechos certificados por TMDB; no inventar etiquetas finas. |
| Las butacas expresan una heurística de ajuste | `hitsFor`, `groupFit`, `scoreTitle` | No convertir puntos o coincidencias en porcentajes de probabilidad de disfrute. |
| Hay límites tratados como preferencias ampliables | `checkTitle`, `runtimeStatus` | Puede aparecer una alternativa hasta 30 minutos más larga o con parte de los imprescindibles. Resolver qué es un límite obligatorio y qué es una preferencia; la etiqueta «alternativa» no basta para un veto duro. |
| Proveedor desconocido no activa el rechazo de plataforma | `checkTitle`: comprobación condicionada a `Array.isArray(title.providers)` | Un título puede pasar ese control sin disponibilidad comprobada. «Cumple todos los filtros» necesita un contrato de datos desconocidos. |
| Se enriquecen hasta 40 candidatos con dos consultas cada uno en paralelo | `duoService.js: ENRICH`, `enrich` | Puede haber hasta 80 consultas de detalle/disponibilidad en esa tanda, además de discover y sagas; no es una medición de peticiones reales por sesión. Presupuestar y medir. |
| El ranking previo al enriquecimiento no usa el historial de la sesión | `discoverForDuo` llama `rankTitles` sin ese historial | Se pueden gastar consultas en títulos que el ranking final excluye. |
| La afinidad por intérprete usa `castMatch` de la fuente de candidatos | `sources`, `fetchSources`, `hitsFor` | No equivale a comprobar todo el reparto de todos los candidatos. |
| El feedback transforma votos en títulos gustados/rechazados por mayoría | `feedbackFrom` | Pierde diferencias personales que importan al grupo; separar aprendizaje individual y decisión colectiva. |
| El tablero conserva títulos válidos aunque cambie el ranking | `fillBoard` | Una nueva señal no debe venderse como una actualización visible si las propuestas siguen iguales. Actualizar la próxima tanda de forma explícita. |
| Tres propuestas son los primeros títulos válidos del tablero | `shortlistItems` | No hay todavía selección de tres roles distintos optimizada como conjunto. |
| La ronda conserva baraja y fase en el estado del componente; los votos pertenecen a la sesión | `DuoVoteRound` | Definir reanudación, rondas nuevas y votos previos antes de añadir una experiencia más compleja. |

Hay configuración y pruebas Playwright en el checkout actual, además de tests Node y de render. Su existencia no acredita que este recorrido se haya probado en navegador. No se ejecutaron nuevas pruebas ni revisión visual durante la preparación de este prompt. El estado remoto tampoco se comprobó.

---

## Copia desde aquí para ejecutar

Actúa como responsable de diseño de interacción, producto e ingeniería de CINET. Implementa una evolución sustancial de Duo: visual, dinámica, divertida y fiable para decidir qué ver y organizar un encuentro. Lee primero el código y este diagnóstico; convierte la propuesta en un recorrido funcional con evidencia. No entregues únicamente un moodboard, componentes aislados o un plan.

Trabaja en `C:\Users\samue\OneDrive\Escaneos\Documentos\GIT\CINET`, conservando React, Vite, React Router y Supabase. Lee los AGENTS aplicables y los documentos `DUO-EXPERIENCIA-2026-10-09.md`, `PROMPT-CLAUDE-CINET.md`, `IMPLEMENTACION-CINET.md` y `CINET-ESTRATEGIA-2026-10-09.md`. Revalida cada descripción histórica.

### 1. La experiencia que vamos a construir

La promesa de Duo es: **«Traigan sus gustos. Salgan con un plan».**

La persona debe sentir que está preparando una noche y descubriendo historias con los suyos. El recorrido recomendado es: **ocasión → gustos visuales → coincidencias y límites → tres finalistas → votación y revelación → plan → recuerdo voluntario**. Mantén la vía rápida y permite editar o saltar preguntas opcionales. La diversión debe reducir el esfuerzo, no alargarlo.

Diseña estas escenas conectadas:

| Escena | Lo que se ve | Acción real | Qué significa el movimiento |
| --- | --- | --- | --- |
| Preparar la noche | Composición de pósteres, ocasión elegida y butacas que se suman | Elegir formato, personas, tiempo y plataformas | Entrar en la sesión y reconocer a quiénes participan; no simular gente conectada. |
| Mostrar mis gustos | Pósteres identificables, ficha breve y controles claros | «Me encanta», «No es para mí», «Ya la vi», «No la conozco»; gustos/límites editables | Guardar una señal reversible y mostrar la siguiente propuesta. |
| Encontrar el punto de encuentro | Mapa sencillo de coincidencias declaradas y resumen de límites | Revisar acuerdos, resolver un conflicto o afinar una pregunta | Mostrar cómo cambió el criterio; no afirmar que el sistema leyó emociones. |
| Conocer finalistas | Hasta tres propuestas distintas, póster dominante, duración y disponibilidad | Comparar, abrir tráiler, votar, elegir o pedir otra tanda | Hacer comprensible qué propuesta cambió y por qué. |
| Decidir juntos | Baraja fija, turno o progreso autorizado, resultado y motivos | Votar por turnos o desde sala real; elegir el resultado | Una revelación breve celebra una decisión ya calculada. |
| Hacer que pase | La elección se convierte en una tarjeta de plan | Elegir casa/cine, fecha, RSVP y acceso al servicio oficial | La tarjeta cambia de estado: de propuesta a plan guardado solo después del éxito. |

### 2. Dirección visual: transformar el recorrido

Haz una reconstrucción visible de la composición de Duo manteniendo la marca CINET. Usa fondos carbón, coral/rojo, ámbar y acentos individuales; tipografía de títulos amplia, pósteres protagonistas y controles con jerarquía clara. No resuelvas este encargo con más sombras, un degradado nuevo o una capa de overrides.

- En móvil, concentra cada escena en una decisión principal, una acción siguiente evidente y salida para volver. Reserva altura para imágenes y carga; evita que el encabezado y el resumen obliguen a hacer scroll antes de actuar. El resumen puede abrirse como panel; su edición sigue accesible.
- En escritorio, usa el espacio como escenario: área principal para la historia/decisión y resumen útil al lado. No agrandes sin más el formulario móvil.
- Trata cada persona como una butaca o avatar de color estable. Inicial y etiqueta deben acompañar el color; no dependas solo de él. Los nombres no son identificadores de autorización.
- Los pósteres deben ser reconocibles: no recortes indiscriminadamente el título o las caras. Conserva proporciones cuando sean relevantes y usa backdrops para escenas anchas. Nunca rellenes datos faltantes con carteles que parezcan títulos reales.
- Diferencia visualmente elección, recomendación, candidato pendiente, alternativa y disponibilidad desconocida. Un punto verde no puede significar indistintamente «le gusta», «votó sí», «está disponible» y «está conectado».
- Concreta una dirección artística memorable: al preparar la noche, un abanico de pósteres con profundidad y una entrada digital de sesión; al expresar gustos, una mesa de pósteres y marcas breves de corazón/vista/paso; al comparar, tres carteles protagonistas con una franja de diferencias; al revelar, una luz de proyección detrás del póster elegido. Son composiciones realizables con DOM/CSS, no una obligación de añadir un motor 3D.
- La ambientación puede cambiar entre cita, amigos y maratón mediante luz, composición y detalles; mantiene contraste, controles y significado. En la revelación, usa una transición de luz suave y finita, no destellos ni una pantalla que bloquee el resultado.
- Escribe textos cortos y humanos: «Hoy quiero algo ligero», «Esta toca un gusto de cada uno», «No hay una opción que cumpla esos límites». Evita promesas de unanimidad o seguridad sin evidencia.
- No conviertas la navegación en un carrusel automático. Una animación muestra una acción y termina; no compite con los botones ni obliga a esperar.

Antes de reconstruir, captura el estado actual en los tamaños disponibles y escribe un storyboard de seis escenas con móvil/escritorio, jerarquía y estados vacíos. Guarda decisiones en `docs/DUO-DISENO-AVANZADO.md`. Si una herramienta de navegador no está disponible, identifica esa limitación; implementa lo independiente y deja la comparación visual pendiente. No inventes capturas.

### 3. Movimiento y diversión con propósito

Implementa primero un sistema coherente de movimiento; CSS y Web Animations pueden ser suficientes. Una biblioteca adicional es opcional y debe justificar su utilidad, tamaño y compatibilidad. Evita WebGL/3D permanente como requisito del recorrido.

- **Butacas:** sumar o quitar a alguien produce un movimiento breve; conserva respuestas de los participantes restantes. Quitar una persona con respuestas tiene una consecuencia visible y opción razonable de recuperación.
- **Pósteres:** tarjeta elegida pasa al área de decisión; las tarjetas descartadas avanzan con dirección comprensible. Mantén botones equivalentes al gesto.
- **Afinar:** al cambiar un criterio, muestra qué se actualizó. Durante una ronda fijada, ningún póster cambia de identidad ni de orden.
- **Revelación:** transición opcional de alrededor de 700–1.000 ms, con «Ver resultado» para omitirla. El resultado no depende de esperar, audio, una conexión Realtime o terminar la animación.
- **Elección a plan:** reutiliza el póster y el color de sesión en la tarjeta final; muestra fecha y confirmaciones reales cuando existan.
- **Dado:** conserva el sorteo válido y sin repetición; el efecto acompaña el resultado calculado. No uses una ruleta decorativa para justificar candidatos que violan límites.
- **Audio:** opcional, apagado inicialmente y activado por acción expresa; el recorrido completo funciona sin él. No reproduzcas automáticamente tráileres o música ajena ni descargues vídeos completos como ambientación.
- **Movimiento reducido:** respetar `prefers-reduced-motion` y ofrecer «Menos movimiento» en la experiencia. Eliminar parallax, desplazamientos grandes y animaciones decorativas cuando corresponda; mantener feedback estático y foco.
- Sin destellos, rachas obligatorias, votos cronometrados, puntos por ver más películas, retos de consumo ni animaciones que retrasen el CTA. Puede existir una noche temática elegida voluntariamente.

Como objetivos iniciales de diseño, usa feedback breve de 120–180 ms y transiciones de 220–360 ms; ajústalos tras comprobar percepción y rendimiento. Son decisiones propuestas, no límites normativos ni resultados medidos.

### 4. Aprender gustos con películas, sin convertirlo en examen

Añade una entrada optativa por pósteres para reemplazar buena parte del esfuerzo del formulario. Conserva géneros, actores, tono y límites como editor accesible, y permite comenzar sin calibración.

- Ofrece inicialmente unas seis películas diversas y una sesión de calibración de tres a cinco respuestas como hipótesis de UX. Usa títulos canónicos y datos existentes; mezcla géneros, épocas y popularidad de manera justificable.
- Diferencia **me encanta**, **no es para mí**, **ya la vi** y **no la conozco**. «Ya la vi» no significa que gustó; «no la conozco» no es un rechazo. La exclusión de vistas y la afinidad son señales separadas.
- Permite deshacer y revisar. Una respuesta negativa a una película no crea un veto automático a todo su género ni a su reparto.
- Guarda señales con identidad y alcance: personales privadas, contexto de hoy y votos de ronda. La ocasión «cita» no equivale a preferir romance; «amigos» no implica comedia.
- El usuario ve y puede corregir lo aprendido: «Tus favoritas comparten ciencia ficción; ¿te representa?». Mostrar una inferencia como tal, no escribirla silenciosamente como preferencia confirmada.
- Evita volver a preguntar lo ya respondido, salvo que esté desactualizado o la persona quiera cambiarlo. Cuenta que cambia en el mismo navegador no hereda gustos ajenos.
- Puede haber una pregunta adicional cuando reduzca una ambigüedad real. Primero usa criterios deterministas de dispersión entre candidatos válidos y cobertura de respuestas. Si no hay datos para distinguir, no inventes una pregunta «inteligente».

### 5. Mejorar el motor: corrección, señales y tres propuestas como conjunto

Preserva funciones puras y separa recuperación de candidatos, filtrado/certeza de datos, puntuación personal, agregación de grupo y selección final. No reemplaces el motor por respuestas de un LLM. La estructura actual ya permite evolucionar estas etapas.

**5A. Contrato de límites y datos desconocidos — primero.**

- Define `hardConstraints`, `preferences`, `evidence` y una versión de esquema, o equivalentes compatibles con el repositorio. «Nunca quiero terror», «máximo 100 minutos» y un veto explícito no se flexibilizan para rellenar.
- Distingue duración máxima de duración preferida. Si existe una preferencia ampliable, muestra el excedente exacto y pide una ampliación explícita cuando se convierte en límite obligatorio. La UI y el motor deben usar el mismo contrato.
- Todos los géneros marcados «imprescindibles» se cumplen como tales; un candidato que cumple uno de dos no satisface esa condición. Formaliza las alternativas de preferencias sin meterlos en una supuesta lista estricta.
- Disponibilidad desconocida, duración exacta desconocida, clasificación desconocida y estado de serie desconocido tienen estados propios. Un título por confirmar no aparece como disponibilidad verificada; con una plataforma obligatoria, queda fuera del conjunto verificado hasta comprobarla.
- Una cota de duración proveniente de un filtro de discover no es una duración exacta. Guarda procedencia y vigencia de datos importantes y muestra lo necesario al usuario.
- No recuperes vetados, vistos excluidos o contenido sin certificación válida en modo familiar estricto para completar tres propuestas. Cero o una propuesta es una respuesta válida con una salida útil.
- Añade casos específicos para imprescindibles parciales, +1 minuto sobre un máximo duro, proveedores nulos/vacíos, conflicto de límites, duplicados y metadatos contradictorios.

**5B. Candidatos y coste.**

- Instrumenta localmente cantidades de candidatos, fuentes, enriquecimiento, fallos, cache hits y tiempos; no imprimas preferencias privadas ni secretos. Antes de aumentar peticiones, establece la línea base y un presupuesto por sesión.
- Filtra duplicados y exclusiones conocidas antes del enriquecimiento cuando sea posible. Evita gastar detalle/disponibilidad en candidatos que no van a llegar a la decisión.
- Limita concurrencia, aplica timeout/cancelación de consultas obsoletas y deduplica peticiones en vuelo. Como punto de partida por medir, considera 4–6 solicitudes concurrentes, no 80 de golpe. No lo presentes como solución de rate limiting global del proxy.
- Enriquece progresivamente un conjunto pequeño que pueda producir finalistas con datos comprobados; amplía de manera acotada si no hay suficientes. No muestres un título como finalista confirmado y luego retires silenciosamente su elegibilidad cuando llegue su detalle.
- Revisa cobertura por integrante y fuente. No permitas que el límite de combinaciones de géneros deje sistemáticamente fuera a una persona. Si no hay candidatos válidos para ella, explícalo.
- Verifica coincidencias de intérpretes cuando se usen como explicación; no asumas que `castMatch` es todo el reparto. Cualquier endpoint adicional debe pasar por la lista permitida del proxy y sus pruebas.

**5C. Afinidad y aprendizaje personal.**

- Añade señales de películas valoradas explícitamente, keywords comprobadas y similitud de contenido. Empieza con una fórmula interpretable y acotada; pesos configurados/versionados y desglose de motivos.
- Conserva votos por persona en el aprendizaje; usa agregación de grupo para la decisión. Un voto negativo de una persona no desaparece porque otras dos votaron sí. Un veto es una acción separada, opcional y explícita.
- Distingue falta de preferencia de satisfacción. Una persona que no respondió no ha aprobado ni disfrutará necesariamente el resultado.
- Compara políticas de ajuste del grupo y cobertura contra la fórmula actual de media/mínimo. No declares superior una fórmula por ser más compleja. Conserva filtros duros en todas.
- Diversidad, novedad y actualidad se equilibran con relevancia; «menos popular» no significa automáticamente «mejor». Evita que las tres propuestas sean de la misma saga cuando existan alternativas válidas.
- Si hay pocos datos, di qué falta y usa la recomendación contextual existente. No añadas collaborative filtering ni embeddings de pago sin datos, evaluación y utilidad demostrada.
- IA en lenguaje natural, si se implementa más tarde, interpreta criterios editables desde servidor con esquema validado y fallback. No decide hechos de disponibilidad, contenido o afinidad por improvisación.

**5D. Tres finalistas con razones distintas.**

Implementa selección del conjunto de hasta tres sobre candidatos elegibles, no solamente `slice(0, 3)`. Usa como roles posibles:

1. **Punto de encuentro:** mejor equilibrio de afinidad expresada y cobertura.
2. **Algo para descubrir:** alternativa válida con suficiente relevancia y menor similitud con la primera; novedad trazable.
3. **Otra forma de la noche:** propuesta que aporta un gusto menos cubierto o un tono distinto dentro de los criterios aceptados.

Los roles se asignan solo si sus datos y puntuaciones lo justifican. No forces tres carriles ni sacrifiques límites para completar el diseño. «Punto de encuentro» sigue siendo una recomendación, no unanimidad. Explica diferencias concretas: género, duración, gustos que toca y disponibilidad.

Si el grupo quiere ampliar preferencias, presenta el cambio necesario y su consecuencia antes de generar la nueva tanda. Un empate o falta de match ofrece revisar, elegir entre las más votadas o continuar otra ronda; no crea consenso ficticio.

Aplica el aprendizaje a la **siguiente tanda** con acción explícita y un resumen comprensible. Conserva el tablero de la ronda abierta. Evita una interfaz donde los títulos se mueven después de cada voto y el usuario pierde el que estaba leyendo.

### 6. Decidir juntos: local completo y sala real como siguiente entrega

Mantén «pásale el celular» como recorrido completo y rápido. Los votos en ese dispositivo están en su almacenamiento; ocultarlos en la pantalla no garantiza privacidad entre cuentas.

Para la ronda local, define ID, baraja fijada, participantes fijados, fase, votos, resultado y tratamiento de recarga/cierre. Reanudar una ronda no duplica votos; empezar otra no copia votos anteriores como nuevas confirmaciones. Una mini comparación de dos finalistas puede añadirse después del primer voto, sin cambiar el significado de los votos ni combinar modalidades sin reglas de desempate.

Prepara e implementa después la sala desde cada celular usando los contratos del prompt general: anfitrión, enlace/QR, capacidad transaccional, lobby, preferencias privadas, ronda fija, votos privados hasta cierre, cierre canónico y reanudación. Cuentas permanentes primero; invitados solo tras verificar Auth anónima y guardias. Un QR debe abrir una sala funcional, no una página de ejemplo.

La pantalla grande del anfitrión muestra progreso no sensible y el resultado permitido; no revela gustos individuales, nombres privados o votos antes de tiempo. Presence no acredita participación y el anfitrión no puede votar por otra cuenta. Añade RLS/RPC y pruebas SQL/API, no solo guardias React.

### 7. Del resultado a una experiencia que se repite

El primer cierre debe permitir elegir casa/cine, guardar el plan y continuar por la infraestructura de planes/invitaciones existente, revalidada. El guardado fallido sigue siendo una propuesta y ofrece reintentar; no se convierte automáticamente en éxito local.

- Ofrece tiempo de inicio/fin estimado solo si se conoce la duración y se aclara la estimación. No prometas acabar una serie entera en ese intervalo.
- Prepara encuesta acotada de fechas y calendario como incremento siguiente si el backend de planes ya está estable; conserva zona horaria y privacidad.
- «Repetir la noche» copia configuración y personas autorizadas con fecha nueva, sin confirmaciones ni votos viejos. Los grupos guardados requieren permisos y membresía revocable.
- Después de la fecha, ofrece «¿La vieron? ¿Les gustó?» de forma optativa. «Plan realizado según el grupo» no es compra verificada. Puede generar un recuerdo que se revise antes de compartir.
- Comparte el resultado o invitación elegidos, no todo el perfil ni votos privados. El preview de un plan privado es genérico por defecto.
- Familia es un modo con restricciones comprobadas, administrado por adultos; no es solo otro tile vistoso. No anuncies seguridad infantil a partir de un género o un póster.

### 8. Preparar publicación e ingresos sin cortar la experiencia central

La propuesta comercial es una hipótesis: Duo gratuito para decidir e invitar, Plus para organización avanzada del anfitrión (recurrencias, colecciones y personalización) y un piloto futuro con cines por visibilidad y conversiones verificadas. Mantén decisión básica, hasta ocho personas, seguridad y colaboración esencial accesibles. No añadas una suscripción para simplemente desbloquear una interfaz menos incómoda.

Antes de decidir qué cobrar, define a quién se le ahorra trabajo, en qué ocasión vuelve y cuánto está dispuesto a pagar. Prepara una matriz de derechos y un experimento de interés transparente, sin cobro automático ni botones que aparenten una suscripción existente.

Documenta costes por sesión y mes: peticiones/cache, hosting, almacenamiento, licencia de datos/imágenes, servicios optativos, soporte y futura pasarela. Si un precio no está cotizado, déjalo como pendiente; no inventes margen ni coste de TMDB.

La intención de generar ingresos hace relevante la licencia comercial de TMDB: consulta condiciones oficiales y prepara la solicitud/cotización para revisión humana. Tener token y despliegue no demuestra licencia. No contacten proveedores o cines ni activen pagos durante desarrollo sin autorización específica.

Los patrocinios, si llegan a existir, tienen espacio y etiqueta propios y no se mezclan con afinidad orgánica. Clic al cine, plan, asistencia autoinformada, venta y comisión son eventos distintos.

### 9. Arquitectura y reglas de ejecución

1. Empieza con `git status --short` y diffs. Hay trabajo ajeno y archivos nuevos: registra el estado, no uses reset/clean, no reconstruyas eliminados ni hagas commit/push/despliegue automático.
2. Usa Graphify primero cuando exista el grafo y lo exija AGENTS; contrasta con código. Actualízalo después de modificaciones de código.
3. No imprimas `.env*`, tokens o datos de sesión. Conserva TMDB en servidor, Auth/roles/avatares y rutas actuales. Cambios remotos y compras requieren autorización específica; completa primero lo local y revisable.
4. Extrae un contrato de estado/reducer de Duo si las nuevas escenas lo necesitan. Separa navegación, preferencias, baraja, ronda y resultado. Mantén compatibilidad de sesiones guardadas y explica cualquier nueva semántica de límites.
5. Servicios orientativos: normalización de señales, políticas de límites, recuperación/enriquecimiento, ranking personal/grupal, selección de finalistas y explicación. Reutiliza módulos existentes; no agregues archivos solo para cumplir una lista de nombres.
6. Estilos por escena/componente con tokens compartidos y sin capas de overrides. Optimiza carga de CSS/chunks e imágenes por medición, sin subir el umbral del aviso de tamaño.
7. Una librería de gestos o animación no es obligatoria. Versiones, APIs y alternativas se comprueban antes de añadirla; cambia dependencias solo si resuelve una necesidad concreta.
8. Implementa por incrementos integrados y actualiza un registro persistente. No ejecutes los ocho bloques simultáneamente. Las decisiones rutinarias están autorizadas; documenta supuestos y avanza sin pedir confirmación por cada componente.

### 10. Orden de entregas y aceptación

**Entrega A — corrección y primer recorrido visual completo.** Formalizar límites/desconocidos, instrumentar candidatos, rediseñar escenas de configuración → preferencias → comparación → elección/plan; conservar modo rápido, series, maratón y herramientas. La aceptación es un recorrido local completo que no etiqueta desconocidos como comprobados, no viola límites duros y refleja datos reales en cada animación.

**Entrega B — calibración y finalistas mejores.** Pósteres con señales reversibles, aprendizaje por persona, enriquecimiento acotado, selección diversa de hasta tres y siguiente tanda explícita. Añadir evaluación comparada; no afirmar mejora estadística sin usuarios y datos adecuados.

**Entrega C — votación y sala.** Primero ronda local reanudable con revelación; después sala remota con identidad, privacidad, reconexión y servidor canónico. Una prueba con dos cuentas y un extraño debe demostrar que compartir la sala no permite leer votos privados ni actuar como otro.

**Entrega D — repetición y lanzamiento.** Grupos, fecha/calendario/feedback según backend disponible; documentación comercial y de coste, métricas y piloto. Pagos y alianzas permanecen preparados pero desactivados hasta resolver sus dependencias.

Empieza ahora con auditoría breve, contrato de límites y la entrega A; después continúa con tareas independientes de B. No cierres la ejecución tras escribir este plan. Cada entrega incluye interfaz, comportamiento, errores y validación; preparar tablas o componentes sin recorrido no equivale a terminarla.

### 11. Evaluación de recomendación y UX

Guarda una versión del algoritmo anterior para comparar sobre los mismos snapshots autorizados y las mismas preferencias. Añade un conjunto reproducible de escenarios con gustos diferentes, pocos datos, límites incompatibles, duración desconocida, regiones/plataformas, series, títulos ya vistos, veto y personas sin preferencias.

Primero mide invariantes y calidad de datos: violaciones de límites duros (objetivo cero), falsos estados «verificado» (cero), duplicados, cobertura por participante con gustos, diversidad entre propuestas, disponibilidad comprobada, repetición, fuentes, peticiones y latencia. Cobertura heurística no equivale a satisfacción real; no llames precisión a la ausencia de errores de filtros.

En un piloto consentido de 10–15 grupos con al menos dos ocasiones, separa efecto visual y efecto del motor. No cambies ambos tratamientos a la vez y luego atribuyas el resultado a uno. Usa cambios por etapas o una comparación apropiada a la muestra; reporta exploración y limitaciones, no significancia que no puedas sostener.

Evalúa tiempo hasta elegir, abandono por escena, opciones consultadas, decisión aceptada por el grupo, utilidad después de ver, creación de plan y repetición. Las ventanas y denominadores se definen antes; una sesión que no eligió también cuenta. La meta de elegir en unos tres minutos es hipótesis, no promesa ni resultado.

Analítica mínima, consentida y configurable: `duo_started`, `calibration_completed`, `shortlist_shown`, `round_started`, `round_completed`, `title_chosen`, `plan_created`, `plan_completed_reported`. No envíes títulos de preferencias individuales, votos, nombres, emails ni secretos de invitación en eventos. Si no hay proveedor, la app no finge estar midiendo remotamente.

### 12. Pruebas y condición de cierre

- Ejecuta lint, Node tests y build; las 82 pruebas registradas anteriormente son históricas y no sustituyen tu ejecución. No modifiques tests para que acepten filtraciones o límites violados.
- Aprovecha Playwright y la configuración existente si se pueden ejecutar. Recorre ocasión → preferencias → comparación → ronda → elección → plan; prueba recarga, volver, deshacer, cambiar de formato/cuenta, red lenta y fallo de guardado.
- Revisa 390/834/1440 px, zoom 200%, teclado, foco, lectores/etiquetas pertinentes, gestos con alternativa de botón, movimiento reducido y consola. Capturas antes/después y al menos comparación de configurador, voto y resultado. Un render estático no prueba clicks, overflow, FPS ni accesibilidad completa.
- Verifica que aumentar animación no provoca trabajo bloqueante, desplazamientos de layout ni contenido indispensable invisible. Define presupuesto de rendimiento con la línea base real del dispositivo; no declares 60 fps o mejoras de Core Web Vitals sin medirlas.
- Para salas y datos por cuenta, añade PostgreSQL/RLS y ataques directos: votar como otro, leer votos antes del cierre, enumerar sala, revocación, cupo simultáneo y cierre doble. Mocks frontend no prueban permisos.
- Para cada nueva escena, cubre carga, vacío, pocos resultados, error, permiso denegado y modo local. No añadas controles decorativos sin una consecuencia real.

Entrega código integrado, documentación de diseño/contratos, evaluación reproducible, capturas auténticas cuando sea posible, lista de archivos y registro de evidencia. El informe final distingue implementado/verificado local, pendiente de navegador/remoto, dependencia comercial y backlog. Debe mostrar cómo se completa la noche, qué cambió en la recomendación y qué evidencia lo sostiene. No declares revolucionaria la app ni ingresos validados por haber terminado pantallas.

## Fuentes y alcance de las propuestas

- [Google: generación de candidatos, puntuación y reordenación](https://developers.google.com/machine-learning/recommendation/overview/types). La separación de etapas del motor sigue esa arquitectura; los pesos y roles de finalistas aquí son propuestas para CINET, no resultados del proveedor.
- [W3C: alternativa a arrastrar](https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements), [animación por interacción](https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions) y [pausar movimiento automático](https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide). Las recomendaciones de movimiento se apoyan en estas guías; su aplicación no acredita por sí sola conformidad de toda la app.
- [TMDB FAQ: servicio comercial y atribución](https://developer.themoviedb.org/docs/faq). La licencia/cotización comercial se verifica con TMDB; no existe aquí una tarifa aprobada ni una licencia acreditada.

Las escenas, políticas de producto, duración de animaciones, piloto y propuesta de ingresos son decisiones e hipótesis de este documento. Requieren implementación y evaluación; no son capacidades actuales, resultados de usuarios ni garantía de monetización.
