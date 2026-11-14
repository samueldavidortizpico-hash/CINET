-- =========================================================
-- Auditoría 2026-11-07 · N01, N02, N03 y N13 (parte SQL).
--
-- N01  Contrato v1 de plans.title / place / details validado en la base (CHECK + RPC con CN422).
--      Los datos históricos que no cumplen se copian íntegros a plan_data_quarantine y la fila se
--      repara conservando todo campo válido: nada válido se borra y nada se pierde.
-- N02  Zonas horarias canónicas de CINET: las mismas que src/services/planContract.js
--      (SUPPORTED_TIME_ZONES). Solo nombres que PostgreSQL e Intl aceptan. Las filas con otra zona
--      pasan a UTC conservando el instante (starts_at no cambia) y quedan registradas.
-- N03  repeat_plan calcula la unión de miembros por UUID ANTES de insertar y rechaza con CN429 si
--      pasa de 30. Inserta exactamente el conjunto contado (sin releer el grupo) y sin copiar RSVP.
--      share_plan_with_group usa la misma regla. schedule_next_plan llama a repeat_plan.
-- N13  listings.time_zone usa el mismo contrato de zonas.
-- =========================================================

-- ---------- Zonas horarias canónicas (N02) ----------

create function public.is_supported_time_zone(p_zone text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  -- Mantener idéntica a SUPPORTED_TIME_ZONES (src/services/planContract.js). Hay una prueba que lo compara.
  select p_zone = any (array[
    'UTC', 'America/Bogota', 'America/Mexico_City', 'America/Lima', 'America/Guayaquil', 'America/Panama',
    'America/Caracas', 'America/Santiago', 'America/Argentina/Buenos_Aires', 'America/Sao_Paulo',
    'America/Montevideo', 'America/La_Paz', 'America/Asuncion', 'America/Costa_Rica', 'America/Guatemala',
    'America/El_Salvador', 'America/Tegucigalpa', 'America/Managua', 'America/Santo_Domingo',
    'America/Puerto_Rico', 'America/Havana', 'America/New_York', 'America/Chicago', 'America/Denver',
    'America/Los_Angeles', 'America/Toronto', 'Europe/Madrid', 'Europe/London', 'Europe/Paris',
    'Europe/Berlin', 'Europe/Rome', 'Europe/Lisbon'
  ]::text[]);
$$;

-- ---------- Contrato v1 de los JSON del plan (N01) ----------

create function public.cn_text_ok(p_value jsonb, p_max integer)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select case
    when p_value is null then true
    when jsonb_typeof(p_value) = 'null' then true
    when jsonb_typeof(p_value) = 'string' then char_length(p_value #>> '{}') <= p_max
    else false
  end;
$$;

-- Texto corto o número (año, duración, nota: el catálogo los manda de ambas formas).
create function public.cn_scalar_ok(p_value jsonb, p_max integer)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select case
    when p_value is null then true
    when jsonb_typeof(p_value) in ('null', 'number') then true
    when jsonb_typeof(p_value) = 'string' then char_length(p_value #>> '{}') <= p_max
    else false
  end;
$$;

create function public.cn_number_ok(p_value jsonb, p_min numeric, p_max numeric)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select case
    when p_value is null then true
    when jsonb_typeof(p_value) = 'null' then true
    when jsonb_typeof(p_value) = 'number' then (p_value #>> '{}')::numeric between p_min and p_max
    else false
  end;
$$;

-- URL que se pinta como enlace: solo http(s), nunca javascript: ni data:.
create function public.cn_url_ok(p_value jsonb)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select case
    when p_value is null then true
    when jsonb_typeof(p_value) = 'null' then true
    when jsonb_typeof(p_value) = 'string' then (p_value #>> '{}') ~ '^https?://[^\s]+$' and char_length(p_value #>> '{}') <= 300
    else false
  end;
$$;

-- null si el plan cumple el contrato v1; si no, un texto que dice qué campo falla (sin datos del usuario).
create function public.plan_contract_problem(p_title jsonb, p_place jsonb, p_details jsonb)
returns text
language plpgsql
immutable
set search_path = ''
as $$
declare
  v_key text;
  v_item jsonb;
begin
  -- title: resumen del título para pintarlo sin red.
  if p_title is null or jsonb_typeof(p_title) <> 'object' then return 'title debe ser un objeto.'; end if;
  for v_key in select jsonb_object_keys(p_title) loop
    if v_key not in ('title', 'year', 'duration', 'runtime', 'rating', 'genres', 'image') then return 'title tiene un campo no permitido.'; end if;
  end loop;
  if not public.cn_text_ok(p_title -> 'title', 200) then return 'title.title debe ser texto (hasta 200).'; end if;
  if not public.cn_scalar_ok(p_title -> 'year', 10) then return 'title.year no es válido.'; end if;
  if not public.cn_scalar_ok(p_title -> 'duration', 40) then return 'title.duration no es válido.'; end if;
  if not public.cn_number_ok(p_title -> 'runtime', 0, 2000) then return 'title.runtime debe ser un número de minutos.'; end if;
  if not public.cn_scalar_ok(p_title -> 'rating', 10) then return 'title.rating no es válido.'; end if;
  if not public.cn_text_ok(p_title -> 'image', 500) then return 'title.image debe ser texto.'; end if;
  if jsonb_typeof(p_title -> 'genres') = 'array' then
    if jsonb_array_length(p_title -> 'genres') > 10 then return 'title.genres admite hasta 10.'; end if;
    for v_item in select jsonb_array_elements(p_title -> 'genres') loop
      if jsonb_typeof(v_item) not in ('string', 'number') or char_length(v_item #>> '{}') > 40 then return 'title.genres solo admite textos.'; end if;
    end loop;
  elsif p_title ? 'genres' and jsonb_typeof(p_title -> 'genres') <> 'null' then
    return 'title.genres debe ser una lista.';
  end if;

  -- place: cine o plataforma sugeridos.
  if p_place is null or jsonb_typeof(p_place) <> 'object' then return 'place debe ser un objeto.'; end if;
  for v_key in select jsonb_object_keys(p_place) loop
    if v_key not in ('name', 'location', 'url') then return 'place tiene un campo no permitido.'; end if;
  end loop;
  if not public.cn_text_ok(p_place -> 'name', 120) then return 'place.name debe ser texto (hasta 120).'; end if;
  if not public.cn_text_ok(p_place -> 'location', 200) then return 'place.location debe ser texto (hasta 200).'; end if;
  if not public.cn_url_ok(p_place -> 'url') then return 'place.url debe ser una dirección http(s).'; end if;

  -- details: plan en casa, maratón y presupuesto.
  if p_details is null or jsonb_typeof(p_details) <> 'object' then return 'details debe ser un objeto.'; end if;
  for v_key in select jsonb_object_keys(p_details) loop
    if v_key not in ('ambience', 'food', 'duration', 'marathon', 'budget') then return 'details tiene un campo no permitido.'; end if;
  end loop;
  if not public.cn_text_ok(p_details -> 'ambience', 80) then return 'details.ambience debe ser texto.'; end if;
  if not public.cn_text_ok(p_details -> 'food', 200) then return 'details.food debe ser texto.'; end if;
  if not public.cn_scalar_ok(p_details -> 'duration', 40) then return 'details.duration no es válido.'; end if;
  if not public.cn_number_ok(p_details -> 'budget', 1, 2000000)
     or (jsonb_typeof(p_details -> 'budget') = 'number' and (p_details ->> 'budget')::numeric % 1 <> 0) then
    return 'details.budget debe ser un entero entre 1 y 2.000.000.';
  end if;
  if p_details ? 'marathon' and jsonb_typeof(p_details -> 'marathon') <> 'null' then
    if jsonb_typeof(p_details -> 'marathon') <> 'array' then return 'details.marathon debe ser una lista.'; end if;
    if jsonb_array_length(p_details -> 'marathon') > 12 then return 'details.marathon admite hasta 12 títulos.'; end if;
    for v_item in select jsonb_array_elements(p_details -> 'marathon') loop
      if jsonb_typeof(v_item) <> 'object' then return 'details.marathon solo admite objetos (sin null).'; end if;
      for v_key in select jsonb_object_keys(v_item) loop
        if v_key not in ('id', 'title', 'minutes', 'episodes') then return 'details.marathon tiene un campo no permitido.'; end if;
      end loop;
      if jsonb_typeof(v_item -> 'title') is distinct from 'string' or char_length(v_item ->> 'title') not between 1 and 200 then
        return 'Cada título de la maratón necesita un nombre.';
      end if;
      if not public.cn_scalar_ok(v_item -> 'id', 64) then return 'details.marathon.id no es válido.'; end if;
      if not public.cn_number_ok(v_item -> 'minutes', 0, 100000) then return 'details.marathon.minutes no es válido.'; end if;
      if not public.cn_number_ok(v_item -> 'episodes', 0, 10000) then return 'details.marathon.episodes no es válido.'; end if;
    end loop;
  end if;
  return null;
end;
$$;

-- Reparación de datos históricos: conserva cada campo válido y descarta solo lo que rompe el contrato.
create function public.plan_contract_repair(p_field text, p_value jsonb)
returns jsonb
language plpgsql
immutable
set search_path = ''
as $$
declare
  v jsonb := case when jsonb_typeof(p_value) = 'object' then p_value else '{}'::jsonb end;
  v_out jsonb := '{}'::jsonb;
  v_list jsonb := '[]'::jsonb;
  v_item jsonb;
begin
  if p_field = 'title' then
    if public.cn_text_ok(v -> 'title', 200) and v ? 'title' then v_out := v_out || jsonb_build_object('title', v -> 'title'); end if;
    if public.cn_scalar_ok(v -> 'year', 10) and v ? 'year' then v_out := v_out || jsonb_build_object('year', v -> 'year'); end if;
    if public.cn_scalar_ok(v -> 'duration', 40) and v ? 'duration' then v_out := v_out || jsonb_build_object('duration', v -> 'duration'); end if;
    if public.cn_number_ok(v -> 'runtime', 0, 2000) and v ? 'runtime' then v_out := v_out || jsonb_build_object('runtime', v -> 'runtime'); end if;
    if public.cn_scalar_ok(v -> 'rating', 10) and v ? 'rating' then v_out := v_out || jsonb_build_object('rating', v -> 'rating'); end if;
    if public.cn_text_ok(v -> 'image', 500) and v ? 'image' then v_out := v_out || jsonb_build_object('image', v -> 'image'); end if;
    if jsonb_typeof(v -> 'genres') = 'array' then
      for v_item in select jsonb_array_elements(v -> 'genres') loop
        if jsonb_typeof(v_item) in ('string', 'number') and char_length(v_item #>> '{}') <= 40 and jsonb_array_length(v_list) < 10 then
          v_list := v_list || jsonb_build_array(v_item);
        end if;
      end loop;
      v_out := v_out || jsonb_build_object('genres', v_list);
    end if;
  elsif p_field = 'place' then
    if public.cn_text_ok(v -> 'name', 120) and v ? 'name' then v_out := v_out || jsonb_build_object('name', v -> 'name'); end if;
    if public.cn_text_ok(v -> 'location', 200) and v ? 'location' then v_out := v_out || jsonb_build_object('location', v -> 'location'); end if;
    if public.cn_url_ok(v -> 'url') and v ? 'url' then v_out := v_out || jsonb_build_object('url', v -> 'url'); end if;
  else -- details
    if public.cn_text_ok(v -> 'ambience', 80) and v ? 'ambience' then v_out := v_out || jsonb_build_object('ambience', v -> 'ambience'); end if;
    if public.cn_text_ok(v -> 'food', 200) and v ? 'food' then v_out := v_out || jsonb_build_object('food', v -> 'food'); end if;
    if public.cn_scalar_ok(v -> 'duration', 40) and v ? 'duration' then v_out := v_out || jsonb_build_object('duration', v -> 'duration'); end if;
    if jsonb_typeof(v -> 'budget') = 'number' and public.cn_number_ok(v -> 'budget', 1, 2000000) and (v ->> 'budget')::numeric % 1 = 0 then
      v_out := v_out || jsonb_build_object('budget', v -> 'budget');
    end if;
    if jsonb_typeof(v -> 'marathon') = 'array' then
      for v_item in select jsonb_array_elements(v -> 'marathon') loop
        if jsonb_typeof(v_item) = 'object' and jsonb_typeof(v_item -> 'title') = 'string' and char_length(v_item ->> 'title') between 1 and 200
           and jsonb_array_length(v_list) < 12 then
          v_list := v_list || jsonb_build_array(jsonb_strip_nulls(jsonb_build_object(
            'id', case when public.cn_scalar_ok(v_item -> 'id', 64) then v_item -> 'id' end,
            'title', v_item -> 'title',
            'minutes', case when public.cn_number_ok(v_item -> 'minutes', 0, 100000) then v_item -> 'minutes' end,
            'episodes', case when public.cn_number_ok(v_item -> 'episodes', 0, 10000) then v_item -> 'episodes' end)));
        end if;
      end loop;
      if jsonb_array_length(v_list) > 0 then v_out := v_out || jsonb_build_object('marathon', v_list); end if;
    end if;
  end if;
  return v_out;
end;
$$;

-- Copia íntegra de lo reparado. Sin políticas: solo service_role/operadores la leen.
create table public.plan_data_quarantine (
  id bigint generated always as identity primary key,
  plan_id uuid not null references public.plans (id) on delete cascade,
  field text not null check (field in ('title', 'place', 'details', 'time_zone')),
  original jsonb not null,
  reason text not null,
  quarantined_at timestamptz not null default now()
);
create index plan_data_quarantine_plan_idx on public.plan_data_quarantine (plan_id);
alter table public.plan_data_quarantine enable row level security;
revoke all on table public.plan_data_quarantine from public, anon, authenticated;

-- Versión del contrato que cumple cada fila (v1 = esta migración). Un lector puede tratar
-- versiones futuras con cautela en vez de suponer la forma actual.
alter table public.plans add column data_version smallint not null default 1 check (data_version >= 1);

-- ---------- Reparación de históricos (N01/N02) ----------

insert into public.plan_data_quarantine (plan_id, field, original, reason)
select id, 'title', title, public.plan_contract_problem(title, '{}'::jsonb, '{}'::jsonb)
from public.plans where public.plan_contract_problem(title, '{}'::jsonb, '{}'::jsonb) is not null;
insert into public.plan_data_quarantine (plan_id, field, original, reason)
select id, 'place', place, public.plan_contract_problem('{}'::jsonb, place, '{}'::jsonb)
from public.plans where public.plan_contract_problem('{}'::jsonb, place, '{}'::jsonb) is not null;
insert into public.plan_data_quarantine (plan_id, field, original, reason)
select id, 'details', details, public.plan_contract_problem('{}'::jsonb, '{}'::jsonb, details)
from public.plans where public.plan_contract_problem('{}'::jsonb, '{}'::jsonb, details) is not null;
insert into public.plan_data_quarantine (plan_id, field, original, reason)
select id, 'time_zone', to_jsonb(time_zone), 'Zona horaria fuera del contrato: se muestra en UTC con el mismo instante.'
from public.plans where not public.is_supported_time_zone(time_zone);

update public.plans
set title = case when public.plan_contract_problem(title, '{}'::jsonb, '{}'::jsonb) is null then title else public.plan_contract_repair('title', title) end,
    place = case when public.plan_contract_problem('{}'::jsonb, place, '{}'::jsonb) is null then place else public.plan_contract_repair('place', place) end,
    details = case when public.plan_contract_problem('{}'::jsonb, '{}'::jsonb, details) is null then details else public.plan_contract_repair('details', details) end,
    time_zone = case when public.is_supported_time_zone(time_zone) then time_zone else 'UTC' end,
    version = version + 1,
    updated_at = now()
where public.plan_contract_problem(title, place, details) is not null or not public.is_supported_time_zone(time_zone);

alter table public.plans
  add constraint plans_contract_v1 check (public.plan_contract_problem(title, place, details) is null),
  add constraint plans_time_zone_supported check (public.is_supported_time_zone(time_zone));

-- N13: misma regla para la cartelera de aliados. El instante (starts_at) no cambia.
create table public.listing_data_quarantine (
  id bigint generated always as identity primary key,
  listing_id uuid not null references public.listings (id) on delete cascade,
  field text not null,
  original jsonb not null,
  quarantined_at timestamptz not null default now()
);
alter table public.listing_data_quarantine enable row level security;
revoke all on table public.listing_data_quarantine from public, anon, authenticated;

insert into public.listing_data_quarantine (listing_id, field, original)
select id, 'time_zone', to_jsonb(time_zone) from public.listings where not public.is_supported_time_zone(time_zone);
insert into public.listing_data_quarantine (listing_id, field, original)
select id, 'title', title from public.listings where not public.cn_text_ok(title -> 'title', 200);
update public.listings set time_zone = 'UTC' where not public.is_supported_time_zone(time_zone);
update public.listings set title = title - 'title' where not public.cn_text_ok(title -> 'title', 200);
alter table public.listings
  add constraint listings_time_zone_supported check (public.is_supported_time_zone(time_zone)),
  add constraint listings_title_text check (public.cn_text_ok(title -> 'title', 200));

-- ---------- RPC con el contrato (N01/N02) ----------

create or replace function public.create_plan(
  p_client_ref text,
  p_name text,
  p_message text,
  p_mode text,
  p_title_id text,
  p_title jsonb,
  p_place jsonb,
  p_date date,
  p_time time,
  p_time_zone text,
  p_details jsonb,
  p_display_name text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_id uuid;
  v_zone text := coalesce(nullif(btrim(p_time_zone), ''), 'America/Bogota');
  v_title jsonb := coalesce(p_title, '{}'::jsonb);
  v_place jsonb := coalesce(p_place, '{}'::jsonb);
  v_details jsonb := coalesce(p_details, '{}'::jsonb);
  v_problem text;
  v_starts timestamptz;
begin
  if v_uid is null then perform public.cinet_fail('CN403', 'Inicia sesión para crear un plan.'); end if;
  if public.is_guest() then perform public.cinet_fail('CN403', 'Crea una cuenta para organizar planes.'); end if;
  if not public.is_supported_time_zone(v_zone) then perform public.cinet_fail('CN422', 'Zona horaria no admitida por CINET.'); end if;
  v_problem := public.plan_contract_problem(v_title, v_place, v_details);
  if v_problem is not null then perform public.cinet_fail('CN422', v_problem); end if;
  if p_date is not null then
    v_starts := (p_date + coalesce(p_time, time '20:00')) at time zone v_zone;
  end if;

  begin
    insert into public.plans (owner_id, client_ref, name, message, mode, title_id, title, place, starts_at, time_zone, details)
    values (v_uid, p_client_ref, btrim(p_name), btrim(coalesce(p_message, '')), p_mode, p_title_id,
            v_title, v_place, v_starts, v_zone, v_details)
    on conflict (owner_id, client_ref) do nothing
    returning id into v_id;
  exception when check_violation or not_null_violation or invalid_text_representation then
    perform public.cinet_fail('CN422', 'Algún dato del plan no es válido.');
  end;

  if v_id is null then
    select id into v_id from public.plans where owner_id = v_uid and client_ref = p_client_ref;
    return v_id;
  end if;

  insert into public.plan_members (plan_id, user_id, role, display_name, rsvp, responded_at)
  values (v_id, v_uid, 'owner', public.clean_display_name(p_display_name), 'yes', now());
  return v_id;
end;
$$;

create or replace function public.propose_plan_times(p_plan uuid, p_slots jsonb, p_time_zone text default 'America/Bogota')
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_added integer;
begin
  perform public.owned_active_plan(p_plan);
  if not public.is_supported_time_zone(p_time_zone) then perform public.cinet_fail('CN422', 'Zona horaria no admitida por CINET.'); end if;
  if jsonb_typeof(p_slots) <> 'array' or jsonb_array_length(p_slots) not between 1 and 5 or exists (
    select 1 from jsonb_array_elements(p_slots) as s (value)
    where jsonb_typeof(s.value) <> 'object' or coalesce(s.value ->> 'date', '') !~ '^\d{4}-\d{2}-\d{2}$' or coalesce(s.value ->> 'time', '') !~ '^\d{2}:\d{2}$'
  ) then
    perform public.cinet_fail('CN422', 'Cada horario necesita fecha y hora.');
  end if;
  begin
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
  exception when invalid_datetime_format or datetime_field_overflow then
    perform public.cinet_fail('CN422', 'Alguna fecha u hora no existe.');
  end;
  get diagnostics v_added = row_count;
  if (select count(*) from public.plan_time_options where plan_id = p_plan) not between 2 and 5 then
    perform public.cinet_fail('CN422', 'Propón entre 2 y 5 horarios.');
  end if;
  return v_added;
end;
$$;

-- ---------- Cupo de 30 sobre la unión por UUID (N03) ----------

-- Repite un plan: misma película, lugar y detalles; personas = miembros del plan ∪ grupo actual, por UUID.
-- Se cuenta y se inserta el MISMO conjunto (arrays en memoria): una unión al grupo en paralelo no
-- puede colarse entre el conteo y la inserción. Sin RSVP copiadas: solo quien repite queda en «sí».
create or replace function public.repeat_plan(p_plan uuid, p_client_ref text, p_date date, p_time time, p_time_zone text default 'America/Bogota')
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_old public.plans;
  v_id uuid;
  v_name text;
  v_users uuid[];
  v_names text[];
begin
  if v_uid is null then perform public.cinet_fail('CN403', 'Inicia sesión.'); end if;
  if public.is_guest() then perform public.cinet_fail('CN403', 'Crea una cuenta para organizar planes.'); end if;
  select * into v_old from public.plans where id = p_plan;
  if not found or not public.is_plan_member(p_plan) then perform public.cinet_fail('CN404', 'El plan no existe o no tienes acceso.'); end if;
  select id into v_id from public.plans where owner_id = v_uid and client_ref = p_client_ref;
  if v_id is not null then return v_id; end if; -- idempotente con client_ref
  if p_date is null or p_time is null then perform public.cinet_fail('CN422', 'Elige la fecha y la hora del nuevo plan.'); end if;
  if not public.is_supported_time_zone(p_time_zone) then perform public.cinet_fail('CN422', 'Zona horaria no admitida por CINET.'); end if;

  -- Unión deduplicada (el nombre del plan tiene prioridad sobre el del grupo).
  select coalesce(array_agg(u.user_id order by u.user_id), '{}'), coalesce(array_agg(u.display_name order by u.user_id), '{}')
  into v_users, v_names
  from (
    select distinct on (c.user_id) c.user_id, c.display_name
    from (
      select m.user_id, m.display_name, 0 as source from public.plan_members m where m.plan_id = p_plan and m.user_id <> v_uid
      union all
      select g.user_id, g.display_name, 1 from public.group_members g
      where v_old.group_id is not null and g.group_id = v_old.group_id and g.user_id <> v_uid and public.is_group_member(v_old.group_id)
    ) c
    order by c.user_id, c.source
  ) u;
  if cardinality(v_users) + 1 > 30 then
    perform public.cinet_fail('CN429', format('El plan repetido tendría %s personas y el máximo es 30. Quita personas del plan o del grupo antes de repetirlo.', cardinality(v_users) + 1));
  end if;

  insert into public.plans (owner_id, client_ref, name, message, mode, title_id, title, place, starts_at, time_zone, time_source, details, group_id)
  values (v_uid, p_client_ref, v_old.name, v_old.message, v_old.mode, v_old.title_id, v_old.title, v_old.place,
          (p_date + p_time) at time zone p_time_zone, p_time_zone, 'organizer', v_old.details, v_old.group_id)
  on conflict (owner_id, client_ref) do nothing
  returning id into v_id;
  if v_id is null then -- otra petición con el mismo client_ref ganó la carrera
    select id into v_id from public.plans where owner_id = v_uid and client_ref = p_client_ref;
    return v_id;
  end if;
  select display_name into v_name from public.plan_members where plan_id = p_plan and user_id = v_uid;
  insert into public.plan_members (plan_id, user_id, role, display_name, rsvp, responded_at) values (v_id, v_uid, 'owner', v_name, 'yes', now());
  insert into public.plan_members (plan_id, user_id, role, display_name)
  select v_id, t.u, 'member', t.n from unnest(v_users, v_names) as t (u, n);
  return v_id;
end;
$$;

-- Comparte con el grupo: misma regla de unión por UUID. El plan está bloqueado (FOR UPDATE) y se
-- inserta exactamente el conjunto contado.
create or replace function public.share_plan_with_group(p_plan uuid, p_group uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_plan public.plans;
  v_current integer;
  v_users uuid[];
  v_names text[];
begin
  select * into v_plan from public.plans where id = p_plan for update;
  if not found or not public.is_plan_member(p_plan) then perform public.cinet_fail('CN404', 'El plan no existe o no tienes acceso.'); end if;
  if v_plan.owner_id <> v_uid then perform public.cinet_fail('CN403', 'Solo quien organiza puede compartir el plan con un grupo.'); end if;
  if v_plan.status = 'cancelled' then perform public.cinet_fail('CN410', 'El plan fue cancelado.'); end if;
  if not public.is_group_member(p_group) then perform public.cinet_fail('CN404', 'No encontramos el grupo.'); end if;
  select count(*) into v_current from public.plan_members where plan_id = p_plan;
  select coalesce(array_agg(g.user_id order by g.user_id), '{}'), coalesce(array_agg(g.display_name order by g.user_id), '{}')
  into v_users, v_names
  from public.group_members g
  where g.group_id = p_group and not exists (select 1 from public.plan_members m where m.plan_id = p_plan and m.user_id = g.user_id);
  if v_current + cardinality(v_users) > 30 then
    perform public.cinet_fail('CN429', 'Con ese grupo el plan pasaría de 30 personas.');
  end if;
  insert into public.plan_members (plan_id, user_id, role, display_name)
  select p_plan, t.u, 'member', t.n from unnest(v_users, v_names) as t (u, n)
  on conflict (plan_id, user_id) do nothing;
  update public.plans set group_id = p_group, updated_at = now() where id = p_plan;
  return cardinality(v_users);
end;
$$;

revoke execute on function
  public.is_supported_time_zone(text), public.cn_text_ok(jsonb, integer), public.cn_scalar_ok(jsonb, integer),
  public.cn_number_ok(jsonb, numeric, numeric), public.cn_url_ok(jsonb),
  public.plan_contract_problem(jsonb, jsonb, jsonb), public.plan_contract_repair(text, jsonb)
from public, anon, authenticated;
-- Las CHECK de listings se evalúan con los privilegios de quien escribe (editores autenticados).
grant execute on function public.is_supported_time_zone(text), public.cn_text_ok(jsonb, integer) to authenticated;
