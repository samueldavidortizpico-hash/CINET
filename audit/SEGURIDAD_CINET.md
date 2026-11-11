# Seguridad CINET — seguimiento 2026-11-05

## Verificado localmente

- API proxy limita host/rutas según implementación y no entrega detalles sensibles de errores. Upstash REST usa operación Lua atómica con ventanas; servidor falla cerrado si faltan credenciales. Se configuró límite global y por IP con TTL. Los límites configurados aún no se han probado contra varias instancias reales.
- `X-Forwarded-For` no se toma como autoridad por defecto. `TRUSTED_PROXY_HOPS` debe describir la topología real; una configuración errónea puede identificar la IP equivocada.
- Las respuestas adultas se filtran en resultados y detalle según política común. Se añadieron cabeceras en `vercel.json`; solo deployment/staging puede verificar las cabeceras realmente emitidas.
- No se accedió a secretos `.env`, ni a producción. `.env.example` contiene nombres requeridos sin valores.
- Pruebas SQL locales cubren permisos y validaciones implementados, pero usan PGlite. No equivalen a JWT/RLS reales.

## Pendiente de Supabase staging

Usar proyecto aislado y usuarios sintéticos A/B/C. Verificar Auth (registro, confirmación, sesión expirada, recuperación); RLS y RPC con `auth.uid()` ante lecturas/escrituras cruzadas; Realtime DELETE y filtrado por miembro; Storage de avatar propio/ajeno y políticas; migraciones desde base vacía y esquema anterior; cambio de cuenta en navegador. Guardar evidencia sin tokens ni datos personales.

## Pendiente de plataforma

- Upstash: `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`; someter ráfaga multi-instancia, cuota global/IP, expiración y caída del datastore. La ruta serverless falla cerrada sin estas variables.
- TMDB: rotación del token por el propietario; probar 401/429/5xx y confirmar ausencia en bundle y source maps.
- Vercel: inspeccionar cabeceras en cada ruta y confianza del proxy en staging.
- Backups: obtener política/retención, propietario, cifrado y realizar restauración ensayada en entorno aislado.
- Migraciones: comparar historial local/remoto y aplicar solo con aprobación y plan de reversión.

No se afirma validación remota ni cumplimiento de producción.
# Seguimiento de seguridad — 2026-11-05

- **API TMDB:** hay allowlist GET, validación de parámetros, saneamiento de contenido adulto, errores sin token y límite por IP/global atómico con Upstash. Pruebas de unidad en `server/tmdbProxy.test.js` ejercitan encabezados, IP falsa, fallo del almacén, 429 y errores del upstream. El límite global en deployment requiere Upstash configurado; hoy no se probó en staging. No generalizarlo a todas las APIs/Auth.
- **Credenciales:** `TMDB_READ_TOKEN` y tokens Upstash deben permanecer en variables server-side. No hay evidencia en estas comprobaciones que permita certificar historial Git o configuración remota; `VITE_*` no es secreto. No se probó rotación contra proveedor.
- **Auth:** no se pudo validar login contra Supabase remoto. Los fallos E2E locales tuvieron solicitud al fake server en puerto incorrecto (`net::ERR_FAILED`); tras parametrizar URL/puerto no se obtuvo nueva corrida con salida natural.
- **Dependencias:** 8 findings totales (6 moderados, 1 alto, 1 crítico); 0 runtime con `npm audit --omit=dev`. Advisory crítico de `tar` persiste en CLI dev. `tar@7.5.21` pasa `npm ci` y elimina tar del audit, pero rompe CLI 6 en `cap sync android`; no aplicar sin migración/solución de compatibilidad.
- **Ataques ejecutados:** límite de 10,001 IP sintéticas, X-Forwarded-For spoof, caída de Upstash, parámetros/verbos fuera de lista, body roto, upstream y cabeceras están cubiertos por las pruebas unitarias anteriores. No sustituyen pentest autenticado, fuzzing remoto, revisión RLS desplegada ni límites del proveedor.

## Cierre de verificación

La suite E2E validó localmente Auth, recuperación, redirecciones y separación de cuentas. No se validó Supabase remoto ni límites propios del proveedor. Las pruebas de proxy acreditan el rate limit Upstash solo unitariamente; el límite efectivo y la confianza en IP requieren staging. Secretos remotos no se inspeccionaron ni rotaron. Advisory crítico `tar` sigue abierto.
