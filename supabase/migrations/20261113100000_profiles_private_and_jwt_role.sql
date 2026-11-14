-- =========================================================
-- Auditoría 2026-11-13 (H-01, H-02): perfiles privados + rol de la app en el JWT.
-- Aditiva: no borra columnas ni datos.
--
-- 1. profiles deja de ser legible por anon y por cuentas ajenas. Ninguna pantalla lee el perfil
--    de otra persona (los nombres de planes, grupos y salas viven en sus propias tablas de miembros).
--    Si algún día hace falta un perfil público, se expone una vista con columnas mínimas (sin role).
-- 2. custom_access_token_hook añade el claim app_role ('user' | 'admin') al JWT que emite Supabase
--    Auth. Lo calcula la base desde profiles.role: el cliente no puede escribirlo (user_metadata sí
--    lo controla el usuario, por eso no se usa). El claim `role` de Postgres sigue siendo 'authenticated'.
--    moderator se trata como 'user' (la app solo reconoce dos roles).
--    Activar en Supabase: Authentication > Hooks > Custom Access Token → public.custom_access_token_hook
--    (en local lo hace supabase/config.toml [auth.hook.custom_access_token]).
--    El claim se refresca al renovar el token (≤ jwt_expiry). Las políticas RLS siguen leyendo
--    profiles.role (is_platform_admin), así que bajar a alguien de admin surte efecto inmediato en datos.
-- =========================================================

drop policy if exists "Perfiles visibles para todos" on public.profiles;

create policy "Cada usuario ve solo su perfil"
  on public.profiles for select
  to authenticated
  using ((select auth.uid()) = id);

revoke select on table public.profiles from anon;

-- ---------- Rol en el JWT ----------
create function public.custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql
stable
set search_path = ''
as $$
declare
  claims jsonb := coalesce(event -> 'claims', '{}'::jsonb);
  is_admin boolean;
begin
  select exists (
    select 1 from public.profiles p
    where p.id = (event ->> 'user_id')::uuid and p.role = 'admin'
  ) into is_admin;
  claims := jsonb_set(claims, '{app_role}', to_jsonb(case when is_admin then 'admin' else 'user' end));
  return jsonb_set(event, '{claims}', claims);
end;
$$;

-- Solo Supabase Auth lo ejecuta (rol supabase_auth_admin); nunca la API pública.
revoke execute on function public.custom_access_token_hook(jsonb) from public, anon, authenticated;
grant usage on schema public to supabase_auth_admin;
grant execute on function public.custom_access_token_hook(jsonb) to supabase_auth_admin;
grant select (id, role) on table public.profiles to supabase_auth_admin;

create policy "Auth lee el rol para el JWT"
  on public.profiles for select
  to supabase_auth_admin
  using (true);
