# Plan priorizado de remediación CINET

Este plan es diagnóstico/propuesta. El trabajo de producto no se inició en esta pasada, conforme al protocolo de presentar primero diagnóstico y plan.

| Etapa | IDs / alcance | Prioridad y dependencia | Cierre verificable | Riesgo / tamaño |
|---|---|---|---|---|
| 0. Recuperar línea base limpia | OP02/OP03, lint, `npm ci`, CI | P0; primero preservar/identificar cambios locales y artefactos Android | Runner limpio instala lockfile; lint revisa fuentes y controles previstos; CI verde; audit con excepciones justificadas | Medio; cambios de lock pueden afectar Capacitor/Vite |
| 1. Planes e identidad | AD01–AD04, AD10–AD12 | P0; E2E local y Supabase staging para recorridos reales | Dos cuentas; invitación y retorno; cero acceso de tercero; estados/error visibles; UUID en RSVP; importación por usuario | Medio/alto; no relajar RLS |
| 2. Integridad transaccional | AD05–AD08 | P0; PostgreSQL real con dos conexiones | Lock order único; pruebas concurrentes repetibles; versión NULL ya rechazada localmente; validación JSON/zona; conflictos sin escritura | Alto; revisar cascadas y contratos SQL |
| 3. Proxy y cuota | API01–API08 | P1; decisión de plataforma/almacén y presupuesto | Almacén atómico o borde; body normalizado; IP confiable; Retry-After parcial ya manejado; fixtures adult; headers probados | Alto; costo/alcance regional/proveedor |
| 4. Búsqueda, Duo y ficha | FE01–FE10 | P1; regresiones unitarias/componentes y E2E | Errores obsoletos aislados; índices válidos; filtros combinados; señales Duo unidas; foco completo; estado sesión robusto; cache acotada; fallo temporal distinguible | Medio |
| 5. Operación y producto | API05, API07, OP04–OP06 | P1; acciones manuales del propietario | Rotación registrada sin valor; headers y embeds; política analítica/receptor; esquema remoto alineado; restauración ensayada | Medio/alto; requiere paneles/cuentas |
| 6. Experiencia/rendimiento | FE08–FE09, OP05 | P2; dispositivo y red de referencia | Presupuesto por ruta basado en medición repetible; datos horarios etiquetados como propuesta/demo o fuente verificada | Medio |

## Secuencia sugerida

1. Confirmar qué cambios locales pertenecen al usuario y cómo preservar el trabajo antes de crear rama o tocar archivos compartidos.
2. Arreglar configuración de ESLint para no tratar bundles minificados como fuentes; conservar controles apropiados sobre fuentes y artefactos de seguridad.
3. Añadir pruebas rojas para API01–03, API08, AD07, AD10/12, FE01/02/05/10. Cambios unitarios pequeños y comprobación de aceptación por caso.
4. Abrir lote de SQL en rama de trabajo: orden de locks y validación bajo dos conexiones reales; añadir migración nueva, ordenada e idempotente solo tras validar compatibilidad.
5. Ejecutar T01–T38 donde el entorno lo permita; usar staging con identidades y datos sintéticos para Auth/RLS/Realtime/Storage.
6. Cerrar tareas del propietario (token, settings Auth, límites de borde, migraciones remotas, backups/restore) sin trasladar secretos al repositorio.

## Responsables sugeridos

- Frontend: estados UI, búsqueda, Duo, diálogos y persistencia local.
- Backend/datos: RPC/RLS, concurrencia, invitaciones, cuotas y validación de datos.
- Release/DevOps: CI, dependencias, Vercel, headers, observabilidad y restauración.
- Propietario de cuentas: rotación TMDB, settings Supabase/Vercel, correo/MFA, firewall/cuotas y backups.

No es una autorización para aplicar migraciones a producción. Ningún caso que dependa del proveedor se cierra con PGlite o build local.
# Seguimiento 2026-11-05

## Hecho en el checkout local

- AD05/06/12 SQL: migración de orden de locks y operaciones serializadas; falta prueba concurrente con dos conexiones PostgreSQL reales.
- AD08: pruebas locales JSON/zona horaria; falta verificación de límites de zona navegador/DB.
- AD10: importaciones por UUID y prueba unitaria; falta recorrido A→B→A en navegador.
- API01/04/06/07: Upstash REST atómico, IP confiable configurable, política adulta uniforme y cabeceras Vercel. Falta desplegar configuración en staging y probar varias instancias.
- FE01/02/03/05/06/08/10: correcciones pequeñas con pruebas unitarias disponibles; falta teclado/manual y medición real de memoria y solicitudes.
- ESLint ignora los assets generados bajo `android/app/src/main/assets/public/**`, manteniendo fuentes Android en el alcance.
- Dependencias: se aplicaron solo actualizaciones compatibles sin `--force`; permanecen 8 avisos completos y 1 crítico de herramienta de desarrollo.

## Pendiente externo o de entorno

1. Ejecutar pruebas de concurrencia sobre PostgreSQL de test, usando dos sesiones independientes y fixtures aislados.
2. Configurar Upstash en staging; probar atomicidad multi-instancia, 429, Retry-After y fallo del datastore.
3. Verificar trust proxy real y cabeceras HTTP desde staging; no confiar en X-Forwarded-For sin topología exacta.
4. Ejecutar Auth, RLS/RPC, Realtime DELETE, Storage y cambio de cuenta en Supabase staging con usuarios sintéticos.
5. Reproducir E2E en runner Linux limpio y resolver cierre del proceso Windows sin forzar salida.
6. Evaluar Capacitor CLI 8 frente a Capacitor core/Android 6 para cerrar vulnerabilidad crítica `tar` sin actualización mayor ciega.
7. Confirmar migraciones remotas, rotación TMDB por el propietario y simulacro de backups/restauración.

No aplicar migraciones ni desplegar hasta completar staging y revisión del diff.
# Seguimiento de estabilización — 2026-11-05

- **Tar/Capacitor — BLOCKED:** un override `tar@^7.5.21` no es compatible con el consumidor actual `@capacitor/cli@6.2.3`: `cap sync android` falla en `tar.extract` por cambio de exportación. Mantener CLI/core/plugins en la línea 6 hasta evaluar una migración compatible; el advisory crítico del tar 6 queda abierto.
- **Rate limit API — implementado localmente, producción BLOCKED:** el proxy TMDB cuenta con cuotas por IP/global atómicas vía Upstash y responde cerrado si el almacén falta o falla. Requiere crear variables Upstash, verificar `TRUSTED_PROXY_HOPS` con el proxy real y probar límites/429 en staging. Esto protege `/api/tmdb`, no constituye rate limit global de Supabase Auth/REST.
- **Login/E2E — FAIL/BLOCKED:** la compilación rooms no inyectaba configuración fake Supabase; se corrigió. Un endpoint en puerto alternativo aún falló porque el bundle usó `localhost:4176`; el generador ahora deriva esa URL del mismo puerto. El runner no cerró naturalmente durante la observación, así que no se aprueba la ruta login.
- **PostgreSQL — BLOCKED:** provisionar base aislada autorizada y ejecutar T09–T13/T18 con dos conexiones y barreras. Aplicar solo migraciones locales y guardar SQLSTATE/filas/versiones/membresías/invitaciones.
- **Secretos:** solo `TMDB_READ_TOKEN` servidor y credenciales Upstash servidor. `VITE_*` es visible en cliente; no almacenar allí secretos. Verificar historial Git y rotar credenciales si se confirma una exposición real.
- **Cierre:** clon limpio con lock final, suite unitaria/lint/build, suite E2E con salida natural, auditorías npm, análisis de secretos y revisión de hunks antes del commit. No aprobar staging con el advisory crítico abierto ni sin validación de configuración Upstash.

## Evidencia final

- Lockfile actual limpio: `npm ci`, 180/180 unitarias, lint y build PASS; runtime audit 0; audit completo 8 avisos.
- Auth E2E local: escenarios de alta/login/recuperación/redirección pasan; capturas omitidas y Playwright no sale naturalmente. Mantener E2E BLOCKED.
- No habilitar staging hasta resolver el advisory crítico sin romper Capacitor 6, validar Upstash/proxy y completar CI/E2E/PostgreSQL donde corresponda.
- Android — BLOCKED: `cap sync` funciona con lockfile vigente; falta Android SDK para `:app:assembleDebug`.
