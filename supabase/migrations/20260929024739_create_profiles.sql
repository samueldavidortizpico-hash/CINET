-- =========================================================
-- profiles: un perfil por cuenta de auth.users (1:1 por UUID).
-- El rol lo decide la base de datos, nunca el cliente:
--   1. RLS: cada usuario solo puede actualizar su propia fila.
--   2. Privilegios por columna: anon/authenticated no pueden escribir role, id ni fechas.
--   3. Trigger: aunque alguien otorgue esos privilegios por error, role sigue bloqueado.
-- =========================================================

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text unique check (username ~ '^[a-z0-9_]{3,30}$'),
  display_name text check (char_length(display_name) <= 60),
  avatar_url text check (avatar_url ~* '^https://' and char_length(avatar_url) <= 500),
  bio text check (char_length(bio) <= 280),
  role text not null default 'user' check (role in ('user', 'moderator', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on column public.profiles.role is 'Solo modificable desde SQL Editor / service_role. Nunca desde la API pública.';

-- ---------- RLS ----------
alter table public.profiles enable row level security;

-- ponytail: perfiles públicos (los necesitarán reviews y social); restringir a authenticated si deja de ser así.
create policy "Perfiles visibles para todos"
  on public.profiles for select
  to anon, authenticated
  using (true);

create policy "Cada usuario actualiza solo su perfil"
  on public.profiles for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- Sin políticas de insert/delete: el perfil lo crea el trigger y se borra en cascada con la cuenta.

-- ---------- Privilegios por columna ----------
-- Supabase concede ALL a anon/authenticated en tablas nuevas de public; se retira y se da lo mínimo.
revoke all on table public.profiles from anon, authenticated;
grant select on table public.profiles to anon, authenticated;
grant update (username, display_name, avatar_url, bio) on table public.profiles to authenticated;

-- ---------- Triggers ----------
create function public.profiles_before_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  -- Solo roles de servidor (postgres, service_role, funciones security definer) cambian el rol.
  if new.role is distinct from old.role and current_user in ('anon', 'authenticated') then
    raise exception 'No tienes permiso para cambiar el rol' using errcode = '42501';
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create trigger profiles_before_update
  before update on public.profiles
  for each row execute function public.profiles_before_update();

-- Crea el perfil al registrarse. role se queda en su default 'user':
-- nunca se lee de raw_user_meta_data porque ese JSON lo controla el propio usuario.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, left(nullif(trim(new.raw_user_meta_data ->> 'name'), ''), 60));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.profiles_before_update() from public, anon, authenticated;

-- ---------- Cuentas que ya existían ----------
insert into public.profiles (id, display_name)
select id, left(nullif(trim(raw_user_meta_data ->> 'name'), ''), 60)
from auth.users
on conflict (id) do nothing;
