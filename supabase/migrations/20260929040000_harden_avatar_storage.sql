-- Avatares: reutiliza los cuatro nombres de 20260929030953_avatars_storage.sql.
-- Se puede ejecutar con esa migración ya aplicada, o con solo el bucket manual.
-- Ejecutar inspect_avatar_policies.sql primero. No modifica archivos, filas de
-- profiles, Auth, roles, otros buckets ni políticas ajenas.
-- Las guardas RESTRICTIVE son necesarias: las policies PERMISSIVE se unen con OR.
-- Referencias: https://supabase.com/docs/guides/storage/security/access-control
-- https://www.postgresql.org/docs/current/sql-createpolicy.html
begin;

do $avatar_policies$
declare
  rule record;
  existing record;
  own_folder text := $sql$(bucket_id = 'avatars' and (select auth.uid()) is not null
    and (storage.foldername(name))[1] = (select auth.uid()::text))$sql$;
  valid_file text;
  guard_using text;
  guard_check text;
  clauses text;
begin
  -- No cambia la configuración de un bucket que ya contiene datos.
  if not exists (
    select 1 from storage.buckets
    where id = 'avatars' and public is true and file_size_limit = 5242880
      and allowed_mime_types @> array['image/jpeg', 'image/png', 'image/webp']::text[]
      and allowed_mime_types <@ array['image/jpeg', 'image/png', 'image/webp']::text[]
  ) then
    raise exception 'Revisa avatars: publico, 5242880 bytes y solo image/jpeg, image/png, image/webp. No se cambio el bucket.';
  end if;
  if not exists (select 1 from pg_class where oid = 'storage.objects'::regclass and relrowsecurity) then
    raise exception 'storage.objects no tiene RLS activo. Revisar con el administrador; no se modificaron permisos.';
  end if;

  valid_file := own_folder || $sql$ and cardinality(storage.foldername(name)) = 1
    and lower(storage.extension(name)) in ('jpg', 'jpeg', 'png', 'webp')$sql$;
  guard_using := '(bucket_id <> ''avatars'' or ' || own_folder || ')';
  guard_check := '(bucket_id <> ''avatars'' or (' || valid_file || '))';

  for rule in
    select * from (values
      ('Avatares: leer mi carpeta', 'SELECT', 'PERMISSIVE', 'authenticated', own_folder, null),
      ('Avatares: subir a mi carpeta', 'INSERT', 'PERMISSIVE', 'authenticated', null, valid_file),
      ('Avatares: modificar mi carpeta', 'UPDATE', 'PERMISSIVE', 'authenticated', own_folder, valid_file),
      ('Avatares: borrar de mi carpeta', 'DELETE', 'PERMISSIVE', 'authenticated', own_folder, null),
      ('CINET avatars: limite insert', 'INSERT', 'RESTRICTIVE', 'anon, authenticated', null, guard_check),
      ('CINET avatars: limite update', 'UPDATE', 'RESTRICTIVE', 'anon, authenticated', guard_using, guard_check),
      ('CINET avatars: limite delete', 'DELETE', 'RESTRICTIVE', 'anon, authenticated', guard_using, null)
    ) as rules(policy_name, command, kind, target_roles, using_expr, check_expr)
  loop
    select cmd, permissive into existing from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = rule.policy_name;
    if found and (existing.cmd <> rule.command or existing.permissive <> rule.kind) then
      raise exception 'La policy % existe con un tipo inesperado. Revisarla manualmente antes de continuar.', rule.policy_name;
    end if;
    clauses := case when rule.using_expr is null then '' else ' using (' || rule.using_expr || ')' end
      || case when rule.check_expr is null then '' else ' with check (' || rule.check_expr || ')' end;
    if found then
      execute format('alter policy %I on storage.objects to %s%s', rule.policy_name, rule.target_roles, clauses);
    else
      execute format('create policy %I on storage.objects as %s for %s to %s%s',
        rule.policy_name, rule.kind, rule.command, rule.target_roles, clauses);
    end if;
  end loop;
end;
$avatar_policies$;

-- Un bucket público sirve las imágenes por URL sin una policy SELECT pública.
-- SELECT autenticado permite gestionar la carpeta propia, no listar las ajenas.
commit;
