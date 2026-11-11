# Duo: ocasiones, decisión breve y siguiente plan

Incremento local del 9 de octubre de 2026. Complementa `PROMPT-CLAUDE-CINET.md`; no cierra toda la hoja de ruta de CINET.

La siguiente propuesta de reconstrucción visual y evolución del motor está en [PROMPT-DUO-EXPERIENCIA-AVANZADA.md](PROMPT-DUO-EXPERIENCIA-AVANZADA.md). Sus funciones nuevas son un encargo por ejecutar, no parte del incremento descrito aquí.

## Problema y resultado

Antes, empezar requería recorrer los pasos personales y los resultados abrían una recomendación grande junto a muchas opciones. La elección final solo ofrecía crear un plan en casa. La preparación de cine mostraba sedes y horas fijas sin una fuente de funciones.

Ahora, la presentación ofrece cuatro ocasiones: cita, amigos, solo y maratón. Cada una prepara formato y número de personas, sin atribuir gustos a los integrantes. Desde la configuración se puede seguir la encuesta o ir a hasta tres propuestas. Las maratones conservan su recorrido completo.

El ánimo colectivo es opcional y se aplica a esta sesión. Añade una señal de tono al ranking; no modifica las respuestas personales ni hace que las butacas aparezcan conformes sin haber expresado preferencias. Los rechazos, formatos y límites siguen gobernados por el motor existente.

La vista «Solo tres» compara propuestas del tablero actual: póster, duración, valoración, disponibilidad conocida, motivos y votos. Conserva el orden persistido, muestra menos si no hay tres y distingue las alternativas. «Explorar todas» mantiene la tarjeta principal, favoritos, similares, exclusiones, dado y opciones adicionales. La ronda por turnos usa las mismas propuestas visibles (hasta tres aquí, hasta ocho en la vista completa).

La elección final conduce a casa o cine; las series conducen a casa. La preparación de cine permite elegir cadena, escribir una sede propuesta y proponer una hora, con enlace a su cartelera oficial. No anuncia una función, reserva, precio o asiento confirmado. La ficha usa «Dónde verla», «Consultar cartelera» y «Organizar salida al cine», según el destino real.

## Archivos principales

- `src/services/duoExperience.js`: ocasiones, inicio nuevo y comparación del tablero.
- `src/data/duo.js`, `src/hooks/useDuoSession.js`: persistencia y normalización de ocasión, ánimo y vista.
- `src/services/recommender.js`: señal de tono colectivo sin alterar afinidades personales.
- `src/pages/DuoPage.jsx`: integración, foco al cambiar paso, estado de dispositivo y reintento de carga.
- `src/components/duo/DuoIntro.jsx`, `DuoModeStep.jsx`, `DuoShortlist.jsx`, `DuoResults.jsx`, `DuoFinal.jsx`, `DuoSummary.jsx`: recorrido y presentación.
- `src/styles/pages/duo-experience.css`, `duo-intro.css`: estilos de las nuevas piezas y ajustes de escena; reglas para pantallas pequeñas, foco y movimiento reducido.
- `src/pages/FunctionsPage.jsx`, `src/components/functions/BookingSummary.jsx`, `src/components/movie-detail/MovieActions.jsx`, `src/services/planService.js`: destino del plan y textos de disponibilidad.

No se añadieron dependencias ni migraciones. No se hicieron commit, push ni cambios remotos por este incremento. El usuario informó que configuró Vercel y Supabase; eso no se verificó aquí. Durante el trabajo aparecieron ediciones adicionales de planes/invitaciones, que se conservaron; su recorrido autenticado no forma parte de la evidencia de este incremento.

## Evidencia local

- Línea base ejecutada: 74/74 pruebas y lint limpio.
- Resultado: `npm.cmd test`, 82/82 pruebas; `npm.cmd run lint`, limpio; `npm.cmd run build`, correcto.
- Cinco pruebas nuevas de invariantes: reinicio sin pérdida de región/plataformas, ánimo sin gustos inventados, filtros duros, comparación sin relleno artificial y recuperación de sesión.
- Tres pruebas de render de componentes reales: disponibilidad/alternativas, entrada rápida según formato y destinos de la elección. Usan Vite y React server rendering en un entorno aislado; no ejecutan clics ni prueban un navegador.
- Último build observado: entrada JS 507,87 kB (149,41 kB gzip), CSS 212,77 kB (39,49 kB gzip), Duo JS 85,66 kB (25,92 kB gzip). Incluye las ediciones concurrentes existentes en ese momento. Sigue el aviso de entrada mayor de 500 kB; no se cambió el umbral ni se afirma una mejora de rendimiento.
- `graphify update .` ejecutado para actualizar el grafo de código.

## Cómo revisar

1. Ejecutar `npm.cmd run dev` y abrir `/duo` en la URL indicada por Vite. Si hay una sesión guardada, «Ver presentación de Duo» muestra las ocasiones sin borrar esa sesión; «Continuar» vuelve a ella.
2. Elegir «Noche de amigos»: comprobar cuatro integrantes; cambiar el tamaño y formato; elegir un ánimo y luego «Ver hasta tres propuestas».
3. Comparar motivos y disponibilidad; votar en una butaca, guardar un título y alternar a «Explorar todas». Comprobar que el dado, los similares y las exclusiones siguen disponibles ahí.
4. Abrir la ronda y votar por turnos. Elegir una propuesta, preparar casa/cine y comprobar que una salida al cine pide una hora manual y ofrece el sitio oficial.
5. Recargar y comprobar respuestas/vista/votos; probar filtros incompatibles, falta de disponibilidad y catálogo local. Probar series y maratones por su recorrido guiado.

Pendiente: navegador a 390/834/1440 px, overflow, teclado, diálogo/foco, reduced motion, consola y recorrido interactivo completo. La herramienta de navegador devolvió `Browser is not available: iab`. No hay capturas antes/después ni verificación visual que pueda darse por realizada. También quedan pendientes publicación y comprobación en el sitio desplegado.

## Ideas siguientes, ordenadas por valor

| Idea | Valor para las personas | Estado y dependencia |
| --- | --- | --- |
| Sala desde cada celular, enlace/QR y pantalla del anfitrión | Cada integrante aporta gustos y vota con identidad propia | Próximo incremento social. Requiere tablas/RPC/RLS y cierre canónico; la ronda actual sigue siendo local. |
| Grupos recurrentes y «Repetir la noche» | Reduce pasos en la segunda ocasión | Gustos privados por cuenta y membresías revocables; no copiar RSVP anteriores ni atribuir historial del navegador automáticamente. |
| Encuesta de dos o tres fechas y exportación de calendario | Resuelve cuándo, además de qué ver | Integrar con planes persistidos y zona horaria; descargar calendario no envía recordatorios. |
| «¿Valió la pena?» después del plan | Mejora futuras decisiones y registra recuerdos voluntarios | Feedback optativo; distinguir autoinforme de asistencia o compra verificada. |
| Familia con límites reales | Da al adulto control de duración y clasificación | Certificación regional normalizada, desconocidos excluidos en modo estricto; no tratar una ocasión como aprobación de contenido. |
| Funciones y ciclos de una sede aliada | Conecta el descubrimiento con una salida viable | Fuente autorizada, vigencia y permisos por organización. No sustituir el trabajo comercial por datos de ejemplo. |

La siguiente tarea técnica exacta para Duo es diseñar el contrato de sala remota y sus permisos, conservar el modo local y probar identidad/votos privados/cierre simultáneo antes de anunciar participación multidispositivo. Antes de publicar este incremento, ejecutar el recorrido de revisión anterior en navegador y verificar el sitio desplegado.
