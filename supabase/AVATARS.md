# Avatares de CINET

## Estado y alcance

Ya existían el cliente Supabase, Auth, `public.profiles`, roles y edición de username/nombre/bio.
También existía `20260929030953_avatars_storage.sql`, con cuatro políticas de Storage.
La implementación de avatares reutiliza ese trabajo. No cambia TMDB ni los flujos de login,
registro, logout o confirmación. No crea ratings, reviews, favoritos ni watchlist.

No se ejecutó SQL ni se subieron/borraron archivos en el proyecto Supabase remoto.
Las políticas desplegadas no se pudieron consultar desde esta sesión; su revisión remota
se hace con el SQL de solo lectura indicado abajo. `.env.local` está ignorado por Git.

## Archivos de la implementación

- `src/services/avatarService.js`: valida tamaño, MIME y firma básica; sube y guarda la URL.
- `src/services/avatarService.test.js`: validación, reemplazo, errores, limpieza y concurrencia.
- `src/components/auth/AvatarUpload.jsx`: Cambiar foto, preview, Guardar foto, cancelar y mensajes.
- `src/components/auth/UserAvatar.jsx`: imagen compartida y respaldo con inicial.
- `src/components/auth/ProfileForm.jsx`: elimina el campo de URL manual y conserva la foto al guardar otros datos.
- `src/components/auth/ProfileCard.jsx`: consume el avatar reactivo.
- `src/context/AuthContext.jsx`: añade `saveAvatar` para sincronizar el perfil; no cambia la sesión.
- `src/components/layout/Navbar.jsx`: integración inicial del avatar en navegación. La versión actual
  del repositorio usa `UserMenu.jsx`, incorporado desde otra sesión, que también consume `UserAvatar`.
- `src/styles/components/app.css`: estilos acotados al selector, preview y avatar.
- `supabase/inspect_avatar_policies.sql`: diagnóstico de solo lectura.
- `supabase/migrations/20260929040000_harden_avatar_storage.sql`: políticas idempotentes y límites RLS.
- `scripts/check-avatar-policies.mjs`: verificación SQL local, sin credenciales ni conexiones remotas.

## SQL manual en Supabase

1. Abrir **SQL Editor** del proyecto correcto y ejecutar completo `supabase/inspect_avatar_policies.sql`.
   Revisar todas las políticas de `storage.objects`, incluidas las generales que no nombran `avatars`.
2. Confirmar en Storage que `avatars` es público, con límite **5242880 bytes** y solo
   `image/jpeg`, `image/png`, `image/webp`.
3. Ejecutar completo **`supabase/migrations/20260929040000_harden_avatar_storage.sql`**.
   Funciona tanto si las cuatro políticas anteriores ya existen como si solo existe el bucket manual.
   No volver a ejecutar la migración de creación de `profiles` para esta tarea.
4. Volver a ejecutar el diagnóstico: deben estar las cuatro políticas `Avatares: …` y las tres
   `CINET avatars: limite …`. El bucket debe seguir público y RLS activo.

La migración no elimina objetos, perfiles, datos ni políticas ajenas. Reutiliza los cuatro nombres
anteriores mediante `ALTER POLICY` si ya existen; crea solo los que faltan. Si un nombre existe con
una operación/tipo inesperado, o el bucket no cumple la configuración, aborta la transacción para
que se revise manualmente. No ejecutar un reset ni un `db push` general para resolver ese mensaje.

## Cómo funciona

1. El usuario selecciona JPEG, PNG o WebP de hasta 5 MiB. La vista previa es un `blob:` local,
   aún no se transmite a Supabase. Las URLs temporales se liberan al cancelar, cambiar o salir.
2. Al pulsar **Guardar foto**, se genera `{UUID}/avatar-{UUID-aleatorio}.png` (o `.jpg`/`.webp`).
   El nombre del archivo local nunca se usa como ruta remota.
3. Se sube sin sobrescribir. La URL es distinta en cada cambio para evitar ver una versión en caché.
4. Se actualiza únicamente `profiles.avatar_url`, filtrando por el UUID y por la URL anterior.
   Si otra sesión ya cambió la foto, se rechaza el cambio para no pisarla.
5. El contexto publica el perfil devuelto y actualiza Profile y el menú de usuario.
6. Solo entonces se intenta eliminar el avatar anterior, si pertenece al mismo origen, bucket,
   UUID y patrón de nombre de avatar. No se borran URLs externas ni carpetas completas.

Si PostgreSQL rechaza el guardado, se intenta retirar el archivo recién subido y conservar el
anterior. Si la respuesta es ambigua por una caída de red, se conserva el archivo para no borrar
una foto que quizá sí quedó guardada: el mensaje pide recargar y revisar. Un fallo de limpieza
se muestra como éxito parcial. Estas interrupciones pueden dejar un objeto huérfano; no existe
una transacción única entre Storage y PostgreSQL. Para limpiarlo manualmente, comprobar primero
`profiles.avatar_url` y no eliminar el objeto al que apunte el perfil.

## Seguridad

- RLS limita INSERT/UPDATE/DELETE a la carpeta cuyo primer segmento coincide con `auth.uid()`.
  UPDATE comprueba tanto el objeto antiguo como la ruta nueva.
- Las políticas permisivas se combinan con OR: otra política amplia podría invalidar el aislamiento
  de la migración anterior. Las nuevas guardas **RESTRICTIVE** añaden un límite obligatorio incluso
  ante ese caso, sin restringir operaciones de otros buckets.
- El bucket público sirve las imágenes por su URL; esto no concede permiso de escritura ni requiere
  abrir el listado del bucket. Cualquier persona con la URL puede ver la foto.
- MIME y tamaño se restringen en el bucket, además de validarse en el frontend. Las comprobaciones
  de cabecera/preview son ayudas de validación, no un escáner de contenido ni autorización.
- Solo se usa el cliente existente con clave publicable y sesión del usuario. No se utiliza ninguna
  Secret Key o `service_role` en el navegador. El rol de aplicación `admin` no evita estas políticas.
- No se modifican permisos de `profiles.role` ni la implementación de Auth.

Referencias: [Storage RLS](https://supabase.com/docs/guides/storage/security/access-control),
[políticas restrictivas de PostgreSQL](https://www.postgresql.org/docs/current/sql-createpolicy.html).

## Probar en localhost

La base actual de Vite es `/`. Arrancar con `npm.cmd run dev` y abrir la URL que indique Vite,
por ejemplo `http://localhost:5173/profile`.

1. Iniciar sesión, seleccionar una foto y comprobar la preview. Cancelar: no debe cambiar el perfil.
2. Guardar un JPEG/PNG/WebP válido: comprobar éxito, foto del perfil y menú de usuario.
3. Recargar y verificar que la foto persiste. Editar username o bio y guardar: no debe borrarse la foto.
4. Cambiar por otra foto y otro formato. Verificar nueva URL en `profiles.avatar_url` y eliminación
   del archivo anterior dentro de la carpeta del usuario en Storage.
5. Probar un GIF/SVG, un archivo vacío y uno mayor de 5 MiB: se deben rechazar.
6. Simular desconexión al guardar y comprobar que el error no se presenta como éxito.
7. Con dos cuentas de prueba y sus sesiones normales, comprobar que B no puede subir, sobrescribir,
   mover o borrar una ruta de A. No usar la clave de servicio para esta prueba: evita RLS por diseño.

La subida real, persistencia remota y prueba visual con una sesión autenticada quedan pendientes
de esta comprobación manual; las pruebas locales no afirman que las policies estén desplegadas.

## Pruebas locales reproducibles

```powershell
npm.cmd test
npm.cmd run lint
npm.cmd run build
```

Para ejecutar RLS en PostgreSQL en memoria, sin instalar dependencias en CINET:

```powershell
$cinetSqlTools = Join-Path $env:TEMP 'cinet-avatar-rls-20260929'
npm.cmd install --prefix $cinetSqlTools --no-save --package-lock=false --ignore-scripts @electric-sql/pglite@0.5.8
node scripts/check-avatar-policies.mjs $cinetSqlTools
```

Resultado: 50 pruebas de aplicación y 14 comprobaciones SQL. El test SQL simula los helpers de
Storage/Auth y ejecuta la migración y RLS en PostgreSQL; no sustituye la prueba del servicio
Supabase remoto. La compilación mantiene el aviso de paquete JavaScript mayor de 500 kB.
