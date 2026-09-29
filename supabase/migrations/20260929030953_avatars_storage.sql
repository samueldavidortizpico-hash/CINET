-- =========================================================
-- Avatares en Supabase Storage (bucket "avatars").
-- Ruta obligatoria: avatars/{auth.uid()}/{archivo}.{jpg|jpeg|png|webp}
-- Lectura pública por URL (bucket público); escritura solo en la carpeta propia.
-- El servidor de Storage aplica el tamaño y los tipos: no depende del frontend.
-- =========================================================

-- Crea el bucket o, si ya existe, solo ajusta sus límites (no borra ni mueve archivos).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Listar/descargar por API: solo la carpeta propia (la URL pública no necesita esta política).
-- También la exige Storage para sobrescribir y borrar.
create policy "Avatares: leer mi carpeta"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

create policy "Avatares: subir a mi carpeta"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
    and array_length(storage.foldername(name), 1) = 1
    and lower(storage.extension(name)) in ('jpg', 'jpeg', 'png', 'webp')
  );

-- using: solo archivos propios; with check: no se pueden mover a otra carpeta ni cambiar de tipo.
create policy "Avatares: modificar mi carpeta"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  )
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
    and array_length(storage.foldername(name), 1) = 1
    and lower(storage.extension(name)) in ('jpg', 'jpeg', 'png', 'webp')
  );

create policy "Avatares: borrar de mi carpeta"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );
