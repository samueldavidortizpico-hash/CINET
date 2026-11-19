# Demo Day — guion y preparación (12 min)

## Guion (5 + 5 + 2)

### 1) Demo en vivo (5 min) — happy paths de las 3 funciones centrales
Cuenta de prueba lista **antes** de entrar (no registrar en vivo). Tener una pestaña de respaldo con el plan ya creado.

1. **Descubrir** (1 min): `/movies` → buscar una película → abrir ficha (tráiler, dónde verla). Mostrar el atajo: escribir `/` en el buscador → lista de comandos según rol.
2. **Crear un plan** (2 min): como organizador, elegir película, cine y horarios → crear → copiar el enlace de invitación.
3. **Responder** (1 min): abrir el enlace en otra ventana (invitado) → Voy / Tal vez / No puedo → el organizador ve la confirmación.
4. **Roles** (1 min): como usuario normal, `/admin` no aparece y la ruta redirige; como admin, `/admin` abre la cola de aliados. *(Duo es la extra si sobra tiempo.)*

### 2) Arquitectura (5 min)
- **Componentes:** `Layout` → `Header` (Navbar, `MovieSearch` con comandos, `UserMenu`) → páginas lazy por ruta; `ProtectedRoute roles=[…]`; contextos `AuthContext`, `MovieContext`, `PlanContext`, `ToastContext`; servicios en `src/services/` (la UI no llama a `fetch`).
- **API:** `/api/v1/*` en Vercel (ver [API.md](API.md)): JWT de Supabase, rol por ruta (403) + RLS en Postgres. Proxy TMDB con lista blanca, límite por IP y token solo en servidor. Webhooks con HMAC.
- **Base de datos (Supabase/Postgres):** `profiles(role)`, `plans`, `plan_members`, `plan_time_options/votes`, `plan_invites`, `groups*`, `duo_rooms/room_*`, `organizations/venues/listings/offers`, `entitlements`. 20 migraciones. Seguridad: RLS en todas las tablas, funciones `security definer` con `search_path` fijo, el rol solo cambia desde la base.

### 3) Preguntas (2 min) — ver abajo.

## Rúbrica M3 ↔ lo que realmente tiene CINET (decirlo con precisión)

| Criterio | Estado real | Cómo explicarlo |
|----------|-------------|-----------------|
| CRUD contra **MongoDB Atlas** | La BD es **Supabase (PostgreSQL)**, no MongoDB. Todo persistente, nada en memoria | Decirlo de frente: elegimos Postgres porque el modelo es relacional (planes↔miembros↔votos) y RLS impone permisos en la base. Si el curso exigía Mongo, preguntar al profesor cómo se evalúa |
| JWT con 2 roles, permisos en el backend | **Sí.** JWT de Supabase Auth, claim `app_role`, 403 por ruta + RLS. Probado en `e2e/api-roles.spec.js` y 180+ tests de BD | Mostrar `curl` con un token de usuario a `/api/v1/admin/organizations` → 403 |
| Front + API en Vercel | Sí (`vercel.json`, `api/*`) | Tener abierta la URL desplegada; **probar la víspera** |
| Auditoría de seguridad | Sí: [AUDITORIA-SEGURIDAD-2026-11-10.md](AUDITORIA-SEGURIDAD-2026-11-10.md). Sin `dangerouslySetInnerHTML`/`eval`; **helmet** no aplica (no hay Express): las mismas cabeceras (HSTS, CSP, nosniff, frame-ancestors) van en `vercel.json`. **NoSQL injection** no aplica: SQL con RPC parametrizadas y RLS | Mostrar la tabla de 9 hallazgos corregidos |

## Preguntas probables y respuesta corta

- **¿Por qué el rol no se puede falsificar?** Vive en `profiles.role`; la columna no es escribible desde la API (privilegio de columna + trigger); el claim del JWT lo emite un hook de la base; registrarse con `role=admin` en metadatos no sirve (test).
- **¿Y si alguien quita el botón "Admin" del front?** Es solo UI. Las rutas de la API devuelven 403 y las políticas RLS lo vuelven a negar.
- **¿Qué es RLS?** Reglas por fila en Postgres: cada consulta viaja con el JWT de quien llama y la base decide qué filas ve o modifica.
- **¿Qué encontró la auditoría?** Billing abierto por privilegios por defecto, perfiles legibles sin sesión, open redirect, URLs maliciosas en planes, `$&` en metadatos OG. Todo con test que falla sin el arreglo.
- **¿Cómo evitan XSS?** React escapa; sin `dangerouslySetInnerHTML`; CSP con script solo propio y hash; enlaces externos `noopener noreferrer`; URLs validadas (solo https).
- **¿Qué falta?** Pasar la CSP-informe a enforcing tras observarla, rotar el token público de TMDB, CAPTCHA activo en Auth.
- **¿Uso de IA?** [USO-DE-IA.md](USO-DE-IA.md): la IA propone, el equipo prueba y decide.

## Lista de verificación final (revisar HOY)

- [ ] URL de Vercel abre y `/api/v1/health` responde 200
- [ ] Cuentas de prueba: usuario, invitado y admin (admin con `role='admin'` puesto desde la base)
- [ ] Migraciones aplicadas en el Supabase de producción (`supabase db push`)
- [ ] Historial de commits visible (30+ commits de 4 personas, no un solo commit)
- [ ] README: problema, solución, instalación, API ([API.md](API.md)), Figma, enlace desplegado
- [ ] Enlace de Figma abre sin pedir permisos
- [ ] [USO-DE-IA.md](USO-DE-IA.md) completado por cada integrante
- [ ] Plan B: video corto de la demo por si falla internet
