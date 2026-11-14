# Auditoría de seguridad de CINET — 2026-11-10

Rama: `audit/seguridad-roles-juan` · Autor: Juan Pablo Vanegas.
Alcance: base de datos (Supabase: RLS, RPC, privilegios), funciones serverless (`api/*`, `server/*`), cliente React, cabeceras HTTP y configuración. Método: lectura del código, pruebas de ataque directo contra una base Postgres real en memoria (PGlite) y verificación en navegador.

## Resumen

| # | Severidad | Hallazgo | Estado |
|---|-----------|----------|--------|
| 1 | Media | `billing_config`, `billing_events` y `entitlements` quedaban con todos los privilegios para `anon`/`authenticated` por los *default privileges* de Supabase (solo las protegía RLS) | Corregido (migración `20261110120000`) |
| 2 | Media | Una URL de aliado que Postgres acepta (`^https://`) pero `new URL()` rechaza rompía todo el panel `/admin` (fila "envenenada") | Corregido (helpers `safeHttpsUrl` + migración `20261110130000`) |
| 3 | Media | `plans.place.url` (JSON libre) se mostraba como enlace en el plan: vector de phishing entre usuarios | Corregido (trigger `20261110140000` + `PlanHero` con etiqueta honesta) |
| 4 | Media | `safeNext` (redirección tras el login) aceptaba rutas como `/\t\evil.com` (open redirect) | Corregido + tests |
| 5 | Media | La política `Perfiles visibles para todos` permitía listar, sin sesión, nombre/avatar/bio de todas las cuentas y localizar a los admin con `?role=eq.admin` | Corregido (migración `20261110150000`) |
| 6 | Baja | `injectMeta` (OG) usaba `String.replace` con texto del usuario: los patrones `$&`, `$'` alteraban el HTML | Corregido (funciones de reemplazo) + test |
| 7 | Baja | Contraseña mínima de Supabase = 6 mientras el formulario exige 8 | Corregido en `config.toml` (verificar el panel alojado) |
| 8 | Baja | Clave de YouTube del tráiler se interpolaba sin validar en la URL del iframe | Corregido (`isYouTubeKey`) + test |
| 9 | Baja | Sin HSTS ni CSP | Añadidos: HSTS y CSP en **modo informe**, validada en navegador real |

Cada corrección tiene prueba que falla sin el arreglo y pasa con él. Se agregó una **auditoría dinámica de privilegios** reutilizable: `node scripts/audit-db-privileges.mjs` (y `supabase/tests/privileges.test.js` como regresión) revisa con `has_table_privilege` / `has_function_privilege` qué pueden hacer `anon` y `authenticated` sobre cada tabla y función.

## Lo que se verificó y está bien

- RLS y RPC con `security definer` y `search_path` fijo; más de 180 pruebas, incluidos ataques directos a las tablas (no solo vía RPC).
- El rol (`user`/`moderator`/`admin`) lo decide la base: privilegios de columna + trigger + RLS. Registrarse con `role=admin` en los metadatos no sirve (test).
- `secretGuard` de Vite, lista blanca del proxy TMDB, webhooks con HMAC + `timingSafeEqual` + anti-replay, escape del HTML en OG, ningún sumidero XSS (`dangerouslySetInnerHTML`, `eval`), enlaces `target=_blank` con `noopener noreferrer`, 0 vulnerabilidades en dependencias de producción.

## Comandos en la barra de búsqueda (por rol)

Escribe `/` en el buscador (Ctrl + K lo enfoca). Código: `src/services/commands.js` (catálogo + resolución), `src/utils/access.js` (reglas de rol), integrado en `MovieSearch.jsx`.

| Nivel | Comandos |
|-------|----------|
| Público | `/inicio` `/peliculas` `/cine` `/duo` `/sala CÓDIGO` `/planes` `/crear` `/grupos` `/plus` `/legal` `/tema` |
| Con sesión (incluye invitados) | `/dashboard` `/perfil` `/resumen` `/aliados` `/salir` |
| Solo administrador | `/admin` |

Decisiones de seguridad: acepta alias, prefijos y tildes; falla cerrado (nivel desconocido ⇒ sin acceso; un invitado nunca es admin); los comandos reservados **no se ofrecen** y su respuesta es idéntica a la de un comando inexistente (no se revela que `/admin` existe); `//evil.com` no es comando; `/sala` valida el código (6 caracteres del alfabeto real de salas) antes de armar la ruta; las acciones son solo navegar a rutas internas, cambiar el tema o cerrar sesión, nunca ejecutar texto. Es control de **interfaz**: el acceso real lo siguen imponiendo `ProtectedRoute` y RLS/RPC.

Limitación de la verificación: el flujo positivo de `/admin` está cubierto por pruebas unitarias; en el navegador se probó como visitante sin sesión (no hay Supabase local configurado).

## Acciones manuales pendientes (no se pueden resolver desde el repositorio)

1. **Rotar el token de TMDB.** El JWT de lectura de TMDB es público: está en el bundle de `gh-pages` y en su historial. Genera uno nuevo en TMDB y actualiza las variables de entorno; considera eliminar la rama `gh-pages` obsoleta.
2. **Supabase alojado:** aplicar las migraciones nuevas (`supabase db push`) y comprobar en el panel Auth: contraseña mínima 8, confirmación de correo, y si hay inicios anónimos, activar CAPTCHA.
3. **Vercel:** `TRUSTED_PROXY_HOPS` debe ser `1`; si no, el límite de peticiones por IP se comparte.
4. **Promover la CSP**: observar la consola unos días en producción; si no hay violaciones, renombrar `Content-Security-Policy-Report-Only` a `Content-Security-Policy` en `vercel.json`. Si se añade otro script inline, actualizar su hash (hay un test que avisa).

## Seguimientos opcionales

- `readBody` debería llamar `req.destroy()` al superar el límite.
- Las columnas `url` de venues/listings/offers solo exigen `^https://`: aplicar el mismo `is_openable_https_url`.
- Cuando existan funciones sociales (reseñas, amistades) definir explícitamente qué campos del perfil se exponen y a quién.
