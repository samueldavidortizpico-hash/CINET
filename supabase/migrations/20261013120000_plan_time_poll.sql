-- =========================================================
-- Encuesta acotada de horarios de un plan.
--   plan_time_options · plan_time_votes
-- Quien organiza propone de 2 a 5 horarios; cada miembro marca con SU cuenta cuáles le sirven
-- (lo ve el plan, como en cualquier encuesta de fecha). Quien organiza elige uno: pasa a ser la hora
-- propuesta del plan y la encuesta se cierra. Elegir horario no confirma una función del cine.
-- =========================================================

create table public.plan_time_options (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.plans (id) on delete cascade,
  starts_at timestamptz not null,
  created_at timestamptz not null default now(),
  unique (plan_id, starts_at)
);

create table public.plan_time_votes (
  option_id uuid not null references public.plan_time_options (id) on delete cascade,
  plan_id uuid not null references public.plans (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (option_id, user_id)
);
create index plan_time_votes_plan_idx on public.plan_time_votes (plan_id);

alter table public.plan_time_options enable row level security;
alter table public.plan_time_votes enable row level security;
create policy "Horarios: los ve el plan" on public.plan_time_options for select to authenticated using (public.is_plan_member(plan_id));
create policy "Votos de horario: los ve el plan" on public.plan_time_votes for select to authenticated using (public.is_plan_member(plan_id));
revoke all on table public.plan_time_options, public.plan_time_votes from public, anon, authenticated;
grant select on table public.plan_time_options, public.plan_time_votes to authenticated;

-- Los cambios avisan por Realtime a través del plan (las tablas de la encuesta no se publican).
create trigger plan_time_options_touch after insert or delete on public.plan_time_options for each row execute function public.touch_plan();
create trigger plan_time_votes_touch after insert or delete on public.plan_time_votes for each row execute function public.touch_plan();

create function public.owned_active_plan(p_plan uuid)
returns public.plans
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_plan public.plans;
begin
  select * into v_plan from public.plans where id = p_plan for update;
  if not found or not public.is_plan_member(p_plan) then perform public.cinet_fail('CN404', 'El plan no existe o no tienes acceso.'); end if;
  if v_plan.owner_id <> (select auth.uid()) then perform public.cinet_fail('CN403', 'Solo quien organiza puede hacerlo.'); end if;
  if v_plan.status = 'cancelled' then perform public.cinet_fail('CN410', 'El plan fue cancelado.'); end if;
  return v_plan;
end;
$$;

-- p_slots: [{ "date": "2026-10-17", "time": "20:30" }, …]. Entre todos, de 2 a 5 opciones futuras.
create function public.propose_plan_times(p_plan uuid, p_slots jsonb, p_time_zone text default 'America/Bogota')
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_added integer;
begin
  perform public.owned_active_plan(p_plan);
  if not exists (select 1 from pg_catalog.pg_timezone_names where name = p_time_zone) then perform public.cinet_fail('CN422', 'Zona horaria no válida.'); end if;
  if jsonb_typeof(p_slots) <> 'array' or jsonb_array_length(p_slots) not between 1 and 5 or exists (
    select 1 from jsonb_array_elements(p_slots) as s (value)
    where coalesce(s.value ->> 'date', '') !~ '^\d{4}-\d{2}-\d{2}$' or coalesce(s.value ->> 'time', '') !~ '^\d{2}:\d{2}$'
  ) then
    perform public.cinet_fail('CN422', 'Cada horario necesita fecha y hora.');
  end if;
  if exists (
    select 1 from jsonb_array_elements(p_slots) as s (value)
    where ((s.value ->> 'date')::date + (s.value ->> 'time')::time) at time zone p_time_zone <= now()
  ) then
    perform public.cinet_fail('CN422', 'Los horarios deben ser futuros.');
  end if;
  insert into public.plan_time_options (plan_id, starts_at)
  select p_plan, ((s.value ->> 'date')::date + (s.value ->> 'time')::time) at time zone p_time_zone
  from jsonb_array_elements(p_slots) as s (value)
  on conflict (plan_id, starts_at) do nothing;
  get diagnostics v_added = row_count;
  if (select count(*) from public.plan_time_options where plan_id = p_plan) not between 2 and 5 then
    perform public.cinet_fail('CN422', 'Propón entre 2 y 5 horarios.');
  end if;
  return v_added;
end;
$$;

create function public.toggle_plan_time_vote(p_option uuid, p_available boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_plan uuid;
begin
  select plan_id into v_plan from public.plan_time_options where id = p_option;
  if v_plan is null or not public.is_plan_member(v_plan) then perform public.cinet_fail('CN404', 'No encontramos ese horario.'); end if;
  if (select status from public.plans where id = v_plan) = 'cancelled' then perform public.cinet_fail('CN410', 'El plan fue cancelado.'); end if;
  if p_available then
    insert into public.plan_time_votes (option_id, plan_id, user_id) values (p_option, v_plan, v_uid) on conflict do nothing;
  else
    delete from public.plan_time_votes where option_id = p_option and user_id = v_uid;
  end if;
end;
$$;

create function public.choose_plan_time(p_option uuid)
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_option public.plan_time_options;
begin
  select * into v_option from public.plan_time_options where id = p_option;
  if not found then perform public.cinet_fail('CN404', 'No encontramos ese horario.'); end if;
  perform public.owned_active_plan(v_option.plan_id);
  update public.plans
  set starts_at = v_option.starts_at, time_source = 'organizer', version = version + 1, updated_at = now()
  where id = v_option.plan_id;
  delete from public.plan_time_options where plan_id = v_option.plan_id; -- la encuesta se cierra
  return v_option.starts_at;
end;
$$;

create function public.clear_plan_times(p_plan uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.owned_active_plan(p_plan);
  delete from public.plan_time_options where plan_id = p_plan;
end;
$$;

revoke execute on function
  public.owned_active_plan(uuid), public.propose_plan_times(uuid, jsonb, text), public.toggle_plan_time_vote(uuid, boolean),
  public.choose_plan_time(uuid), public.clear_plan_times(uuid)
from public, anon, authenticated;
grant execute on function
  public.propose_plan_times(uuid, jsonb, text), public.toggle_plan_time_vote(uuid, boolean), public.choose_plan_time(uuid), public.clear_plan_times(uuid)
to authenticated;
