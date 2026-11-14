# Operación y verificación en staging (auditoría 2026-11-07)

Nada de lo que sigue se ha ejecutado contra servicios remotos: no hay acceso a Supabase, Redis, Vercel, SMTP ni GitHub desde este entorno. Cada punto es el procedimiento exacto para cerrar la verificación, con cuentas y datos **sintéticos**. No se aplica nada en producción sin respaldo y aprobación.

Estados que usa el informe: (1) corregido en código local · (2) prueba local superada · (3) migración aplicada en staging · (4) prueba de integración real · (5) configuración remota verificada · (6) Android instalado y probado.

## 0. Orden de aplicación de migraciones (staging primero, con respaldo)

1. Respaldo del proyecto staging (Supabase → Database → Backups) y exportar `plans`, `listings`, `entitlements`, `billing_events`.
2. Aplicar en orden: `20261107100000_plan_data_contracts.sql`, `20261107110000_org_invitations.sql`, `20261107120000_billing_order_and_quotas.sql`.
3. Revisar `select field, count(*) from plan_data_quarantine group by 1` y `listing_data_quarantine`: son los datos históricos reparados (el original de cada uno quedó íntegro). Si hay filas, revisarlas antes de producción.
4. Comprobar que `billing_state`, `plan_data_quarantine` y `listing_data_quarantine` no tienen políticas (solo service_role) y que `org_invites` solo las tiene de lectura para administradores de la organización.
5. Restauración (V50): restaurar el respaldo del paso 1 en un proyecto aparte y repetir 3–4.

## N16 · Identidad por IP

El código usa por defecto la dirección del socket y **ignora** `X-Forwarded-For` salvo configuración. En staging:

1. Desplegar con `TRUSTED_IP_HEADER` y `TRUSTED_PROXY_HOPS` vacíos. Con una cuenta de prueba, pedir `/api/tmdb/movie/550` y registrar (sin guardarla) qué IP ve la función (`socket`). Si es siempre la misma para clientes distintos, el socket es el proxy y varias personas compartirían cuota.
2. Consultar la documentación vigente de Vercel sobre cabeceras de IP del cliente y confirmar, con una petición que lleve `X-Forwarded-For: 6.6.6.6` y otra `X-Real-IP: 7.7.7.7` falsas, que la cabecera elegida **la sobrescribe la plataforma** (el valor que llega a la función es el real, no el falso).
3. Solo entonces fijar `TRUSTED_IP_HEADER=<cabecera confirmada>`. Probar: acceso normal, cabecera falsa del cliente (no cambia la clave) y dos personas tras una NAT (V20, V21).
4. La clave en Redis es un HMAC con el token de Upstash: no hay IP en claro. No hay identidad autenticada en `/api/tmdb` (el catálogo es público); la cuota por IP solo reparte capacidad.

## N17 · Realtime y eventos DELETE

Estado: **no corregido en código**. `plans`, `duo_rooms` y `room_rounds` siguen publicadas; un DELETE de Postgres Changes no pasa por RLS y expone el `id` opaco (no la relación plan–usuario: `plan_members` y los votos están fuera de la publicación). Cambiar a Broadcast privado requiere `realtime.messages` con políticas y no se puede validar localmente, por lo que no se entrega sin probar.

Verificación en staging (V46): tres cuentas (A y B participantes, C ajena). C se suscribe a `postgres_changes` sobre `plans` sin filtro y A elimina un plan de prueba. Anotar por separado INSERT, UPDATE y DELETE recibidos por C. Si C recibe el DELETE: implementar canal privado `plan:<id>` (trigger `realtime.send` con payload mínimo + política en `realtime.messages` que exija `is_plan_member`) y retirar `plans` de la publicación. Mientras tanto, riesgo bajo (id opaco, sin contenido).

## N24 · Matriz de protección por operación

Los valores se miden en staging; no se inventan límites.

| Operación | Control en el repositorio | Verificar en staging |
|---|---|---|
| Registro / inicio de sesión / recuperación / correos | Auth gestionada por Supabase; `config.toml` local | CAPTCHA activo, límites de Auth (Auth → Rate Limits), confirmación de correo, contraseñas filtradas (si el plan lo ofrece), SMTP propio y su cuota |
| Códigos de sala | 10 fallos/10 min por usuario (`room_join_failures`) | Probar con 11 códigos erróneos desde una cuenta de prueba |
| Creación de salas / grupos / solicitudes de organización | 5 / 20 / 3, **serializadas por propietario** (advisory lock) | Probado con 2 conexiones reales en PostgreSQL 17.5 local; repetir contra el staging real |
| Invitaciones de plan / grupo / organización | 20 / 10 / 20 abiertas y 50 diarias (organización) | Crear hasta el máximo con cuentas de prueba |
| Almacenamiento (avatares) | Políticas y tipos de `storage.objects` (migraciones de avatares) | Subir un archivo permitido y uno no permitido; revisar el tamaño máximo del bucket |
| TMDB | Redis compartido, identidad primero, global de trabajo admitido | V15–V19 con Redis real (abajo) |
| Webhooks | HMAC, ventana de 5 min, 32 KB, plazos 5 s / 4 s | Enviar un evento firmado y uno lento |

Además: limpieza de expirados (salas, invitaciones, `room_join_failures`), copias de seguridad y una restauración probada (V50). No existe aún un trabajo programado de limpieza: pendiente decidir la retención.

## N06/N07 · Redis real (V15–V19)

1. Crear una base Upstash **de prueba** y fijar `UPSTASH_REDIS_REST_URL/TOKEN` solo en el entorno de staging.
2. Con límites bajos (`perIpMax`/`globalMax` en `createUpstashRateLimiter`), repetir la secuencia de `audit/2026-11-07/V15-V19-lua-rate-script.txt` con dos instancias y comparar (identidad agotada: 429 sin consumir el global; otras identidades: 200; recuperación en la frontera de ventana con `Retry-After`).
3. Redis lento o con respuesta corrupta: el limitador responde 503 acotado (timeout 1,5 s). Medir con un Redis detenido.
4. Sin las variables, `/api/tmdb` **y** `/api/og` responden sin consultar a TMDB.
5. Bots de vista previa: presupuesto propio de 120 consultas por ventana (`PREVIEW_BUDGET`) dentro del global; ajustar con datos reales.

## N20 · Android (V49)

- La configuración versionada ya no tiene `server.url`: la APK carga los archivos de `dist`. El build **debe** definir `VITE_TMDB_API_URL`, `VITE_APP_ORIGIN` y las variables de Supabase en el entorno de EAS (no en el repositorio).
- Desarrollo con recarga en vivo: `npx cap run android --live-reload --host <ip-local>` (no se versiona).
- Auth: `VITE_APP_ORIGIN` hace que los correos de confirmación y recuperación apunten al sitio web público. En Supabase (Auth → URL Configuration) añadir ese dominio a *Redirect URLs*. Contrato actual: la recuperación de contraseña se completa **en el navegador web**, no vuelve a la app (no hay App Links configurados).
- Instalar la APK de depuración en un dispositivo o emulador y recorrer: versión y origen (`https://localhost`), inicio sin conexión (catálogo local), registro, inicio de sesión, recuperación de contraseña, cerrar y reanudar. No se ha hecho.
- Firma de producción y keystore: fuera de este repositorio.

## N21 · GitHub Actions

1. Empujar `fix/audit-2026-11-07` y abrir un PR hacia `main`; confirmar que corren `quality` y `dependencies` sobre ese SHA (queda en el artefacto `ci-evidence-<sha>`).
2. Settings → Branches → regla para `main`: exigir `quality` y `dependencies`.
3. Prueba negativa: un commit con un `assert.equal(1, 2)` debe bloquear la integración.

## N19 · Dependencias

Quedan 2 avisos de herramientas de desarrollo: `tar` (crítico) y `@capacitor/cli` (alto), que exigen `@capacitor/cli@8` (y, por compatibilidad, `@capacitor/core` y `@capacitor/android` 8, con JDK 21). Forzar `tar@7` rompe `cap sync` con la CLI 6 (comprobado), por eso no se aplicó. Plan: rama dedicada de migración a Capacitor 8, `cap sync`, `assembleDebug` y prueba en dispositivo. Producción: 0 avisos.

## Cobros reales (N05)

No habilitar una pasarela hasta: aplicar la migración `…120000` en staging, repetir `supabase/tests/billing-order.test.js` y el ensayo de concurrencia (`audit/2026-11-07/probes/concurrency.mjs`) contra staging y definir la conciliación. El sandbox sigue apagado por defecto (`billing_config.sandbox = false`) y no es una integración de pagos.
