# Matriz de ejecuciÃ³n T01â€“T38

Fecha de corte: 2026-11-05. **PASS** solo cuando se ejecutÃ³ un escenario equivalente a la aceptaciÃ³n indicada. **BLOCKED** requiere proveedor/infraestructura o acceso que no estÃ¡ disponible en esta pasada. **NOT RUN** significa que el escenario especÃ­fico no se ejecutÃ³; evidencia parcial se anota, pero no se asciende a PASS.

> Seguimiento de continuaciÃ³n: los estados de cada caso se expresan exclusivamente como PASS, FAIL, BLOCKED o NOT RUN; el texto despuÃ©s del estado identifica evidencia y entorno.

| Caso | Estado | Evidencia / motivo / automatizado |
|---|---|---|
| T01 InvitaciÃ³n completa | PASS | `e2e/shared-plan.spec.js`: â€œAna organiza, Bea entra con el enlace y confirma con su propia cuentaâ€ reportÃ³ PASS con contextos de navegador locales. No es Supabase remoto/staging. |
| T02 ExtraÃ±o sin token | PASS | `npm test`: `supabase/tests/plans.test.js`, pruebas de aislamiento y SELECT denegado; automatizado PGlite, no staging. |
| T03 Token revocado/vencido | PASS | `npm test`: prueba de invitaciones revocadas/caducadas; automatizado PGlite. |
| T04 Recarga profunda lenta | NOT RUN | No se controlÃ³ restauraciÃ³n de sesiÃ³n lenta en navegador. |
| T05 Error de lectura remota | NOT RUN | No se ejecutÃ³ rechazo de `listPlans` y reintento visible. |
| T06 Nombres repetidos | PASS | `npm test`: dos usuarios â€œSamâ€ y respuesta por UUID en pruebas SQL/adaptador; automatizado parcialmente. |
| T07 Responder sin red | NOT RUN | No se probÃ³ UI con rechazo RPC ni `unhandledrejection`. |
| T08 Clics rÃ¡pidos RSVP | NOT RUN | No se probaron latencias invertidas en componente. |
| T09 Cancelar contra aceptar | BLOCKED | Requiere dos conexiones PostgreSQL concurrentes; PGlite secuencial no lo demuestra. |
| T10 Cancelar contra responder | BLOCKED | Requiere carrera real con barreras; no ejecutado. |
| T11 Cupo invitaciones | BLOCKED | Pruebas de lÃ­mite secuencial sÃ­ existen; carrera al borde requiere PostgreSQL real. |
| T12 VersiÃ³n nula | PASS | MigraciÃ³n aditiva cambia a `IS DISTINCT FROM`; `supabase/tests/plans.test.js` prueba rechazo NULL y verifica que la fila no cambia. PGlite, no deployment remoto. |
| T13 Dos ediciones iguales | BLOCKED | Prueba de versiÃ³n vieja existe; competencia simultÃ¡nea en dos conexiones no ejecutada. |
| T14 JSON incompatible | NOT RUN | No se ejecutÃ³ corpus de estructuras/subtipos malformados. |
| T15 Zona incompatible | NOT RUN | No se contrastaron `pg_timezone_names` con `Intl.DateTimeFormat`. |
| T16 DELETE privado | BLOCKED | Requiere Realtime/Supabase y tercero en despliegue; la prueba local solo constata publicaciÃ³n configurada. |
| T17 Importar con dos cuentas | BLOCKED | La utilidad de importaciÃ³n por UUID tiene prueba unitaria PASS; falta recorrido de navegador Aâ†’Bâ†’A con Auth staging. |
| T18 Repetir Ãºltimo canje | BLOCKED | La prueba PGlite secuencial conserva evidencia unitaria, pero el caso exigido de reintento concurrente con conexiones independientes no se pudo ejecutar sin PostgreSQL aislado. |
| T19 Cuota entre procesos | BLOCKED | No hay almacÃ©n compartido/procesos coordinados disponibles para este escenario. |
| T20 Muchos contadores | PASS | `server/tmdbProxy.test.js` excede 10.000 IP sintÃ©ticas y comprueba que la IP agotada sigue en 429. |
| T21 Cuerpo interrumpido | PASS | `server/tmdbProxy.test.js` hace fallar `response.text()` despuÃ©s de headers y comprueba 502 JSON estable sin detalle sensible. |
| T22 IP no confiable | BLOCKED | Requiere despliegue staging detrÃ¡s del proxy real. |
| T23 CaÃ­da del limitador | BLOCKED | No hay limitador externo/Redis configurado en el escenario actual. |
| T24 Retry After | PASS | `src/services/tmdbClient.test.js` inyecta reloj/sleep y verifica segundos, fecha HTTP y tope de 30 s. No cubre abandono/cancelaciÃ³n. |
| T25 BÃºsqueda con carrera | BLOCKED | El guard de consulta actual tiene prueba unitaria; no se simulÃ³ en navegador red A2/B1 fuera de orden con respuestas deferred. |
| T26 Actor mÃ¡s texto | PASS | Fixture de servicio comprueba combinaciÃ³n actor + texto; recorrido UI dedicado pendiente. |
| T27 Orden bÃºsqueda | NOT RUN | El cÃ³digo aplica sort; fixture de rating/paginaciÃ³n no ejecutado como caso dedicado. |
| T28 Ãndice sugerencias | PASS | Helper de Ã­ndice seguro probado al cambiar cantidad de sugerencias; teclado real queda pendiente. |
| T29 Duplicados reparto | PASS | Servicio de Duo une coincidencias por id conservando seÃ±ales de todos los participantes. |
| T30 Modal teclado | BLOCKED | Se corrigiÃ³ foco inicial/trampa/retorno en componente, pero falta prueba manual/automatizada de teclado en navegador. |
| T31 SesiÃ³n local daÃ±ada | PASS | `src/hooks/useDuoSession.test.js` normaliza tipo/estilo/recuento/duraciÃ³n invÃ¡lidos, `entries:null` y votos no objeto; falta recarga en navegador real. |
| T32 Login y confirmaciÃ³n | BLOCKED | Requiere Supabase Auth staging y correo de prueba. |
| T33 Permisos perfil | PASS | `npm test` ejecuta pruebas SQL locales de rol/aislamiento de perfiles; sin proveedor remoto. |
| T34 Avatar propio/ajeno | PASS | `npm test` incluye validaciÃ³n de rutas UUID y limpieza conservadora; cobertura de servicio local, no Storage remoto. |
| T35 Secretos build | NOT RUN | Build pasÃ³, pero no se inyectÃ³ marcador sintÃ©tico ni se inspeccionaron artefactos por ese marcador. |
| T36 Headers y embeds | NOT RUN | Build local no prueba headers HTTP CSP ni flujo de embeds en deployment. |
| T37 Consentimiento | PASS | `npm test`: analÃ­tica no envÃ­a sin consentimiento/endpoint, permite aceptaciÃ³n y retirada; automatizado. |
| T38 Build y migraciones | PASS | Clon temporal limpio del lockfile vigente: `npm ci`, `npm test` (180/180), `npm run lint`, `npm run build`; migraciones locales ejercitadas con PGlite. No demuestra PostgreSQL real ni migración remota. |

## Cobertura adicional de comandos

## Seguimiento de esta continuaciÃ³n

- T09, T10, T11, T13 y T18: **BLOCKED** â€” no hay servidor PostgreSQL escuchando en 5432 ni herramienta `psql`, Docker o Podman accesible. No se simularon carreras con PGlite.
- T19, T22 y T23: **BLOCKED** â€” faltan coordinador multi-proceso, proxy/staging y Upstash de prueba accesibles.
- T32: **BLOCKED** â€” Auth remoto/correo de prueba no configurados; fake local no sustituye proveedor.
- T35: **NOT RUN** â€” no se hizo escaneo de secretos del bundle final con marcador canario dedicado en esta continuaciÃ³n.
- T38: **FAIL** para el override propuesto y **BLOCKED** para Android del lockfile actual. En clon temporal `npm ci` con override instalÃ³ tar 7.5.21, pero `cap sync android` lanzÃ³ `TypeError` en `@capacitor/cli/dist/util/template.js` porque la exportaciÃ³n CommonJS default no expone `extract`. No se extrapola esto a incompatibilidad mÃ³vil del proyecto sin override.
- Comprobaciones observadas en checkout: `npm test` **PASS** 180/180; `npm run lint` **PASS**; `npm run build` **PASS**; `npm audit --omit=dev` **PASS** 0 advisories; `npm audit` **FAIL** 8 advisories. Las verificaciones finales aÃºn requieren clon limpio del lockfile final, suite E2E completa y `git diff --check`.
- E2E auth, ejecuciÃ³n mÃ­nima: **FAIL** por solicitud `POST /auth/v1/signup` a `http://localhost:4176` con `net::ERR_FAILED` al correr con puertos alternativos; la causa fue una URL fija en bundle de rooms y se parametrizÃ³. La nueva repeticiÃ³n no obtuvo salida natural del runner; suite completa **BLOCKED**. Sin capturas vÃ¡lidas nuevas.
- CI Linux: **NOT RUN**, no hay runner configurado en esta sesiÃ³n.

- `npm test`: PASS final, 169/169 (baseline previa: 163/163).
- `npm run build`: PASS.
- `npm run lint`: FAIL, 210 errores en assets minificados Android; lint dirigido `eslint src server api`: PASS.
- `npm run test:e2e`: 31 escenarios reportados PASS, 2 capturas omitidas; el proceso no terminÃ³ tras la salida de pruebas y se interrumpiÃ³ (cÃ³digo 1). El escenario local T01 reportÃ³ PASS; no asumir cierre limpio del runner.
- `node --test supabase/tests/plans.test.js`: PASS, 10/10 tras incluir el caso de versiÃ³n NULL.
- `node --test src/hooks/useDuoSession.test.js`: PASS, 2/2 para normalizaciÃ³n de sesiÃ³n corrupta.
- `npm audit`: 11 vulnerabilidades; `npm audit --omit=dev`: 0.
- `npm ci`, pruebas contra proveedores, concurrencia PostgreSQL real y despliegue: no ejecutados.


- Estado final E2E: **BLOCKED** — 30 PASS, 0 FAIL y 3 omitidos de captura; los casos Auth/cuentas pasan localmente. Faltan `DUO_CAPTURE=1` y código de salida natural de Playwright.
- T38: **PASS** — clon temporal limpio del estado final, `npm ci`, `npm test` (180/180), `npm run lint`, `npm run build`; migraciones locales ejercitadas por las pruebas PGlite. No demuestra PostgreSQL real ni migración remota.
- Android en clon limpio del lockfile vigente: `npx cap sync android` PASS; build `:app:assembleDebug` **BLOCKED** por SDK ausente (`ANDROID_HOME`/`sdk.dir`).
