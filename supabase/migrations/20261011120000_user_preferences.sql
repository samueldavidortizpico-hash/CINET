-- =========================================================
-- Gustos privados por cuenta: región, plataformas, géneros, «evitar» y duración.
-- Solo la propia persona los lee (RLS). Se escriben y borran por RPC con validación;
-- se guardan únicamente las claves conocidas. Exportar = leer la propia fila.
-- =========================================================

create table public.user_preferences (
  user_id uuid primary key references auth.users (id) on delete cascade,
  prefs jsonb not null check (jsonb_typeof(prefs) = 'object' and octet_length(prefs::text) <= 4000),
  updated_at timestamptz not null default now()
);

alter table public.user_preferences enable row level security;

create policy "Gustos de cuenta: solo los propios"
  on public.user_preferences for select to authenticated
  using (user_id = (select auth.uid()));

revoke all on table public.user_preferences from public, anon, authenticated;
grant select on table public.user_preferences to authenticated;

-- Lista de claves cortas en minúscula (géneros y plataformas del catálogo de CINET).
create function public.valid_key_list(p_list jsonb, p_max integer)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select jsonb_typeof(p_list) = 'array'
    and jsonb_array_length(p_list) <= p_max
    and not exists (
      select 1 from jsonb_array_elements(p_list) as e (value)
      where jsonb_typeof(e.value) <> 'string' or (e.value #>> '{}') !~ '^[a-z0-9][a-z0-9-]{0,29}$'
    );
$$;

create function public.save_my_preferences(p_prefs jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_clean jsonb;
  v_runtime jsonb := coalesce(p_prefs -> 'maxRuntime', '0'::jsonb);
begin
  if v_uid is null then perform public.cinet_fail('CN403', 'Inicia sesión para guardar tus gustos.'); end if;
  if jsonb_typeof(p_prefs) <> 'object'
    or coalesce(p_prefs ->> 'region', 'CO') !~ '^[A-Z]{2}$'
    or not public.valid_key_list(coalesce(p_prefs -> 'providers', '[]'::jsonb), 20)
    or not public.valid_key_list(coalesce(p_prefs -> 'genres', '[]'::jsonb), 20)
    or not public.valid_key_list(coalesce(p_prefs -> 'rejectedGenres', '[]'::jsonb), 20)
    or jsonb_typeof(v_runtime) <> 'number'
    or (v_runtime #>> '{}')::numeric not between 0 and 400
    or (v_runtime #>> '{}')::numeric <> trunc((v_runtime #>> '{}')::numeric)
  then
    perform public.cinet_fail('CN422', 'Algún gusto no es válido.');
  end if;
  v_clean := jsonb_build_object(
    'region', coalesce(p_prefs ->> 'region', 'CO'),
    'providers', coalesce(p_prefs -> 'providers', '[]'::jsonb),
    'genres', coalesce(p_prefs -> 'genres', '[]'::jsonb),
    'rejectedGenres', coalesce(p_prefs -> 'rejectedGenres', '[]'::jsonb),
    'maxRuntime', v_runtime
  );
  insert into public.user_preferences (user_id, prefs) values (v_uid, v_clean)
  on conflict (user_id) do update set prefs = excluded.prefs, updated_at = now();
  return v_clean;
end;
$$;

create function public.delete_my_preferences()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then perform public.cinet_fail('CN403', 'Inicia sesión.'); end if;
  delete from public.user_preferences where user_id = (select auth.uid());
end;
$$;

revoke execute on function public.valid_key_list(jsonb, integer), public.save_my_preferences(jsonb), public.delete_my_preferences()
  from public, anon, authenticated;
grant execute on function public.save_my_preferences(jsonb), public.delete_my_preferences() to authenticated;
