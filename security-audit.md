# Seguridad CINET — 2026-11-06

Alcance: checkout local, código, SQL, dependencias y pruebas. No es certificación ni pentest de producción. Evidencia complementaria: `audit/*2026-11-06*` y `AUDITORIA_FINAL_CINET.md`.

| Punto | Estado | Evidencia y justificación | Corrección / pendiente | Prueba |
|---|---|---|---|---|
| XSS: renderizado | Cumple parcialmente | React escapa texto; revisión de src sin `dangerouslySetInnerHTML`/eval. URLs externas requieren validación específica | CSP parcial añadida: base-uri self, object-src none, frame-ancestors none. Falta política script-src estricta compatible con todo el catálogo | Prueba E2E de nombre HTML; no equivale a fuzzing completo |
| XSS: entradas | Cumple parcialmente | Validadores cliente, CHECK SQL, URLs https de perfiles/aliados; no se eliminan textos arbitrariamente | Revisar todas las fuentes externas en staging | `profiles.test.js`, `partners.test.js`, pruebas webhook |
| NoSQL Injection | No aplica por arquitectura | No hay MongoDB/Mongoose; PostgreSQL/RPC y parámetros del SDK | No introducir MongoDB paralelo. Un objeto como username es rechazado por CHECK | `profiles.test.js`; allowlist de parámetros TMDB |
| SQL y autorización | Cumple parcialmente | RLS y privilegios por columna; role nunca se deriva de user_metadata; RPC verifica identidad | Cotejar políticas efectivas remotas | SQL PGlite: escalada denegada, edición cruzada denegada, rol inválido rechazado |
| CORS | Cumple parcialmente | Funciones propias sin ACAO wildcard: acceso de navegador mismo origen; firma HMAC para webhooks | CORS no es autorización. Supabase es otro origen y su gateway es gestionado; no afirmar allowlist de dominios ni preflight remoto sin medir | Inspección estática; preflight alojado pendiente |
| Validación servidor | Cumple parcialmente | SQL CHECK, enum, límites y validación de eventos TMDB/webhooks | Longitud mínima local de Auth alineada a 8; verificar política remota | SQL + pruebas server; no se ha probado HTTP 400 real PostgREST remoto |
| Secretos | Cumple parcialmente | .env y variantes ignorados; solo .env.example rastreado entre archivos de entorno; env.js usa clave publicable | No se imprimieron valores .env. Build tiene guardia para secretos conocidos; no se certifica historial Git ni configuración remota | git ls-files; build; revisión de nombres y usos |
| Helmet | No aplica por arquitectura | No existe Express | Cabeceras equivalentes parciales en vercel.json; no se instaló middleware sin servidor compatible | `server/securityHeaders.test.js` verifica configuración, no HTTP remoto |
| Cabeceras | Cumple parcialmente | nosniff, DENY, Referrer/Permissions y CSP parcial | Validar respuesta real Vercel; CSP no bloquea todavía todos los scripts externos | Prueba estática y build |
| Rate limit catálogo | Cumple parcialmente | Upstash Lua atómico, límite global/IP, 503 si datastore no está disponible | Validar cuotas y topología en deployment | `tmdbProxy.test.js`: 429, spoof, caída del limitador |
| Rate limit Auth | No verificable | Servicio Supabase Auth, sección auth.rate_limit local | Confirmar límites/CAPTCHA/SMTP del proveedor; no sustituir con temporizador cliente ni express-rate-limit sin Express | No se efectuó ataque de fuerza bruta remoto |
| Sesiones | Cumple parcialmente | SDK persiste access/refresh tokens y escucha cambios; rutas esperan restauración | Captura de rechazo de getSession y recuperación de error en ruta protegida; destino conserva query/hash | E2E caducidad/refresh inválido local; TTL y revocación remotos pendientes |
| Dependencias | No cumple | npm audit actualizado: 8 avisos (6 moderados, 1 alto, 1 crítico); runtime: 0 | Capacitor CLI 6 y tar requieren plan de compatibilidad Android antes de migrar a CLI 8; no se usó force/legacy-peer-deps | JSON completos en audit/dependencies*.json |

## Riesgos y acciones pendientes

1. Dependencias de desarrollo vulnerables: no se aprueba producción ni cadena de suministro como segura. Plan: rama actual preservada, propuesta de actualización alineada de Capacitor core/android/cli y requisitos JDK/Gradle/SDK; build web, cap sync y build/dispositivo Android antes de aceptar. Requiere autorización para cambio mayor de tecnología/versiones.
2. Tokens de una SPA son accesibles a JavaScript; no se guardan contraseñas, pero una vulnerabilidad XSS podría robar sesiones. Un BFF con cookies HttpOnly implicaría cambiar la arquitectura y no se añadió automáticamente.
3. signOut invalida refresh tokens según el proveedor; no implica revocación instantánea de todos los access tokens ya emitidos. Confirmar TTL y políticas remotas.
4. Perfiles son públicos por diseño SQL (incluyen bio y rol, no email). Validar esta decisión de privacidad con el producto.
5. No se realizaron cambios a políticas, secretos, cuentas o datos remotos.

Referencias oficiales consultadas: [sesiones Supabase](https://supabase.com/docs/guides/auth/sessions), [eventos Auth](https://supabase.com/docs/reference/javascript/auth-onauthstatechange), [SPA Vite en Vercel](https://vercel.com/docs/frameworks/frontend/vite), [rewrites](https://vercel.com/docs/routing/rewrites). Son contexto técnico, no evidencia de que este deployment esté configurado.
