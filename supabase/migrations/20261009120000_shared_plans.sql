-- =========================================================
-- Planes compartidos: plans, plan_members, plan_invites.
--
-- Privados por defecto: solo los miembros leen un plan y su lista de miembros.
-- Toda escritura pasa por funciones RPC (security definer) con comprobaciones
-- explícitas; las tablas NO aceptan insert/update/delete directos desde la API.
-- La identidad es auth.uid(): el nombre visible es una copia y nunca autoriza nada.
--
-- Errores (SQLSTATE propio, los traduce el cliente):
--   CN403 sin permiso · CN404 no existe o no es visible · CN409 conflicto de versión
--   CN410 caducado, revocado o cancelado · CN422 dato inválido · CN429 cupo o límite lleno
-- =========================================================

create table public.plans (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  -- Idempotencia: el cliente manda un id propio; repetir la petición devuelve el mismo plan.
  client_ref text not null check (char_length(client_ref) between 8 and 80),
  name text not null check (char_length(name) between 1 and 60),
  message text not null default '' check (char_length(message) <= 300),
  mode text not null check (mode in ('cinema', 'home')),
  -- Título canónico de CINET (slug local o tmdb-movie-123) + resumen para mostrarlo sin red.
  title_id text not null check (char_length(title_id) between 1 and 64),
  title jsonb not null default '{}'::jsonb check (jsonb_typeof(title) = 'object' and octet_length(title::text) <= 2000),
  -- Plataforma o cine elegido: { name, location, url? }. Una sugerencia, no una reserva.
  place jsonb not null default '{}'::jsonb check (jsonb_typeof(place) = 'object' and octet_length(place::text) <= 1000),
  starts_at timestamptz,
  time_zone text not null default 'America/Bogota' check (char_length(time_zone) between 1 and 64),
  -- organizer = hora propuesta por quien organiza; showtime = función de una fuente autorizada (fase 4).
  time_source text not null default 'organizer' check (time_source in ('organizer', 'showtime')),
  details jsonb not null default '{}'::jsonb check (jsonb_typeof(details) = 'object' and octet_length(details::text) <= 4000),
  status text not null default 'active' check (status in ('active', 'cancelled')),
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, client_ref)
);

create table public.plan_members (
  plan_id uuid not null references public.plans (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member')),
  display_name text not null check (char_length(display_name) between 1 and 40),
  rsvp text check (rsvp in ('yes', 'maybe', 'no')),
  responded_at timestamptz,
  joined_at timestamptz not null default now(),
  primary key (plan_id, user_id)
);
create index plan_members_user_idx on public.plan_members (user_id);

create table public.plan_invites (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.plans (id) on delete cascade,
  -- Solo el SHA-256 del token: el token en claro solo existe en el enlace que comparte el dueño.
  token_hash bytea not null unique,
  created_by uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  revoked_at timestamptz,
  max_uses integer check (max_uses between 1 and 100),
  uses integer not null default 0
);
create index plan_invites_plan_idx on public.plan_invites (plan_id);

-- ---------- Ayudantes ----------

-- Miembro del plan (security definer: evita la recursión de RLS entre plans y plan_members).
create function public.is_plan_member(p_plan uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.plan_members m where m.plan_id = p_plan and m.user_id = (select auth.uid())
  );
$$;

-- Invitado sin cuenta permanente (Supabase Auth anónima): puede unirse y responder, no crear planes.
create function public.is_guest()
returns boolean
language sql
stable
set search_path = ''
as $$
  select coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false);
$$;

create function public.cinet_fail(p_code text, p_message text)
returns void
language plpgsql
set search_path = ''
as $$
begin
  raise exception '%', p_message using errcode = p_code;
end;
$$;

create function public.clean_display_name(p_name text)
returns text
language plpgsql
immutable
set search_path = ''
as $$
declare
  v text := btrim(regexp_replace(coalesce(p_name, ''), '[[:cntrl:]]', '', 'g'));
begin
  if char_length(v) < 1 or char_length(v) > 40 then
    perform public.cinet_fail('CN422', 'El nombre visible debe tener entre 1 y 40 caracteres.');
  end if;
  return v;
end;
$$;

create function public.hash_invite_token(p_token text)
returns bytea
language sql
immutable
set search_path = ''
as $$
  select sha256(convert_to(coalesce(p_token, ''), 'UTF8'));
$$;

-- ---------- RLS: solo lectura para miembros ----------

alter table public.plans enable row level security;
alter table public.plan_members enable row level security;
alter table public.plan_invites enable row level security;

create policy "Planes: los ven sus miembros"
  on public.plans for select to authenticated
  using (public.is_plan_member(id));

create policy "Miembros: los ven los miembros del plan"
  on public.plan_members for select to authenticated
  using (public.is_plan_member(plan_id));

create policy "Invitaciones: las ve el dueño del plan"
  on public.plan_invites for select to authenticated
  using (exists (select 1 from public.plans p where p.id = plan_id and p.owner_id = (select auth.uid())));

revoke all on table public.plans, public.plan_members, public.plan_invites from public, anon, authenticated;
grant select on table public.plans, public.plan_members to authenticated;
-- Nunca el hash del token: solo lo necesario para listar y revocar.
grant select (id, plan_id, created_at, expires_at, revoked_at, max_uses, uses) on table public.plan_invites to authenticated;

-- ---------- RPC ----------

create function public.create_plan(
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
  v_starts timestamptz;
begin
  if v_uid is null then perform public.cinet_fail('CN403', 'Inicia sesión para crear un plan.'); end if;
  if public.is_guest() then perform public.cinet_fail('CN403', 'Crea una cuenta para organizar planes.'); end if;
  if not exists (select 1 from pg_catalog.pg_timezone_names where name = v_zone) then
    perform public.cinet_fail('CN422', 'Zona horaria no válida.');
  end if;
  if p_date is not null then
    v_starts := (p_date + coalesce(p_time, time '20:00')) at time zone v_zone;
  end if;

  begin
    insert into public.plans (owner_id, client_ref, name, message, mode, title_id, title, place, starts_at, time_zone, details)
    values (v_uid, p_client_ref, btrim(p_name), btrim(coalesce(p_message, '')), p_mode, p_title_id,
            coalesce(p_title, '{}'::jsonb), coalesce(p_place, '{}'::jsonb), v_starts, v_zone, coalesce(p_details, '{}'::jsonb))
    on conflict (owner_id, client_ref) do nothing
    returning id into v_id;
  exception when check_violation or not_null_violation or invalid_text_representation then
    perform public.cinet_fail('CN422', 'Algún dato del plan no es válido.');
  end;

  if v_id is null then
    -- Reintento de la misma petición: el plan ya existe.
    select id into v_id from public.plans where owner_id = v_uid and client_ref = p_client_ref;
    return v_id;
  end if;

  insert into public.plan_members (plan_id, user_id, role, display_name, rsvp, responded_at)
  values (v_id, v_uid, 'owner', public.clean_display_name(p_display_name), 'yes', now());
  return v_id;
end;
$$;

create function public.update_plan(p_plan uuid, p_version integer, p_name text, p_message text)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_plan public.plans;
begin
  select * into v_plan from public.plans where id = p_plan for update;
  if v_plan.id is null or not public.is_plan_member(p_plan) then perform public.cinet_fail('CN404', 'El plan no existe o no tienes acceso.'); end if;
  if v_plan.owner_id <> (select auth.uid()) then perform public.cinet_fail('CN403', 'Solo quien organiza puede editar el plan.'); end if;
  if v_plan.status = 'cancelled' then perform public.cinet_fail('CN410', 'El plan está cancelado.'); end if;
  if v_plan.version <> p_version then perform public.cinet_fail('CN409', 'Alguien cambió el plan mientras lo editabas. Recarga para ver la versión actual.'); end if;
  begin
    update public.plans
    set name = btrim(p_name), message = btrim(coalesce(p_message, '')), version = version + 1, updated_at = now()
    where id = p_plan;
  exception when check_violation then
    perform public.cinet_fail('CN422', 'El nombre o el mensaje no son válidos.');
  end;
  return v_plan.version + 1;
end;
$$;

create function public.cancel_plan(p_plan uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_plan public.plans;
begin
  select * into v_plan from public.plans where id = p_plan for update;
  if v_plan.id is null or not public.is_plan_member(p_plan) then perform public.cinet_fail('CN404', 'El plan no existe o no tienes acceso.'); end if;
  if v_plan.owner_id <> (select auth.uid()) then perform public.cinet_fail('CN403', 'Solo quien organiza puede cancelar el plan.'); end if;
  if v_plan.status = 'cancelled' then return; end if; -- idempotente
  update public.plans set status = 'cancelled', version = version + 1, updated_at = now() where id = p_plan;
  update public.plan_invites set revoked_at = now() where plan_id = p_plan and revoked_at is null;
end;
$$;

create function public.delete_plan(p_plan uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner uuid;
begin
  select owner_id into v_owner from public.plans where id = p_plan;
  if v_owner is null or not public.is_plan_member(p_plan) then perform public.cinet_fail('CN404', 'El plan no existe o no tienes acceso.'); end if;
  if v_owner <> (select auth.uid()) then perform public.cinet_fail('CN403', 'Solo quien organiza puede eliminar el plan.'); end if;
  delete from public.plans where id = p_plan;
end;
$$;

create function public.set_plan_rsvp(p_plan uuid, p_rsvp text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_status text;
begin
  if p_rsvp is null or p_rsvp not in ('yes', 'maybe', 'no') then perform public.cinet_fail('CN422', 'Respuesta no válida.'); end if;
  select status into v_status from public.plans where id = p_plan;
  if v_status is null or not public.is_plan_member(p_plan) then perform public.cinet_fail('CN404', 'El plan no existe o no tienes acceso.'); end if;
  if v_status = 'cancelled' then perform public.cinet_fail('CN410', 'El plan está cancelado.'); end if;
  -- Solo la fila propia: el usuario sale de auth.uid(), nunca de un parámetro.
  update public.plan_members set rsvp = p_rsvp, responded_at = now()
  where plan_id = p_plan and user_id = (select auth.uid());
end;
$$;

create function public.leave_plan(p_plan uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role text;
begin
  select role into v_role from public.plan_members where plan_id = p_plan and user_id = (select auth.uid());
  if v_role is null then perform public.cinet_fail('CN404', 'No eres miembro de este plan.'); end if;
  if v_role = 'owner' then perform public.cinet_fail('CN403', 'Quien organiza no puede salirse: cancela o elimina el plan.'); end if;
  delete from public.plan_members where plan_id = p_plan and user_id = (select auth.uid());
end;
$$;

create function public.remove_plan_member(p_plan uuid, p_user uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner uuid;
begin
  select owner_id into v_owner from public.plans where id = p_plan;
  if v_owner is null or not public.is_plan_member(p_plan) then perform public.cinet_fail('CN404', 'El plan no existe o no tienes acceso.'); end if;
  if v_owner <> (select auth.uid()) then perform public.cinet_fail('CN403', 'Solo quien organiza puede quitar personas.'); end if;
  if p_user = v_owner then perform public.cinet_fail('CN422', 'Quien organiza no puede quitarse a sí mismo.'); end if;
  delete from public.plan_members where plan_id = p_plan and user_id = p_user;
end;
$$;

create function public.create_plan_invite(p_plan uuid, p_days integer default 14, p_max_uses integer default null)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_plan public.plans;
  v_token text;
begin
  select * into v_plan from public.plans where id = p_plan;
  if v_plan.id is null or not public.is_plan_member(p_plan) then perform public.cinet_fail('CN404', 'El plan no existe o no tienes acceso.'); end if;
  if v_plan.owner_id <> (select auth.uid()) then perform public.cinet_fail('CN403', 'Solo quien organiza puede invitar.'); end if;
  if v_plan.status = 'cancelled' then perform public.cinet_fail('CN410', 'El plan está cancelado.'); end if;
  if p_days is null or p_days not between 1 and 60 then perform public.cinet_fail('CN422', 'La invitación debe durar entre 1 y 60 días.'); end if;
  if (select count(*) from public.plan_invites where plan_id = p_plan and revoked_at is null and expires_at > now()) >= 20 then
    perform public.cinet_fail('CN429', 'Este plan ya tiene demasiadas invitaciones activas. Revoca alguna.');
  end if;
  -- 2 × gen_random_uuid() = 244 bits aleatorios (generador fuerte de PostgreSQL), en base64url.
  v_token := translate(encode(uuid_send(gen_random_uuid()) || uuid_send(gen_random_uuid()), 'base64'), '+/=', '-_');
  insert into public.plan_invites (plan_id, token_hash, created_by, expires_at, max_uses)
  values (p_plan, public.hash_invite_token(v_token), (select auth.uid()), now() + make_interval(days => p_days), p_max_uses);
  return v_token;
end;
$$;

create function public.revoke_plan_invite(p_invite uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner uuid;
begin
  select p.owner_id into v_owner from public.plan_invites i join public.plans p on p.id = i.plan_id where i.id = p_invite;
  if v_owner is null or v_owner <> (select auth.uid()) then perform public.cinet_fail('CN404', 'La invitación no existe o no es tuya.'); end if;
  update public.plan_invites set revoked_at = coalesce(revoked_at, now()) where id = p_invite;
end;
$$;

-- Invitación válida o error. Para preview y canje.
create function public.valid_plan_invite(p_token text, p_lock boolean default false)
returns public.plan_invites
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_invite public.plan_invites;
begin
  if p_lock then
    select * into v_invite from public.plan_invites where token_hash = public.hash_invite_token(p_token) for update;
  else
    select * into v_invite from public.plan_invites where token_hash = public.hash_invite_token(p_token);
  end if;
  if v_invite.id is null then perform public.cinet_fail('CN404', 'La invitación no existe.'); end if;
  if v_invite.revoked_at is not null then perform public.cinet_fail('CN410', 'Esta invitación fue revocada.'); end if;
  if v_invite.expires_at <= now() then perform public.cinet_fail('CN410', 'Esta invitación caducó. Pide un enlace nuevo.'); end if;
  if v_invite.max_uses is not null and v_invite.uses >= v_invite.max_uses then
    perform public.cinet_fail('CN410', 'Esta invitación ya se usó todas las veces permitidas.');
  end if;
  return v_invite;
end;
$$;

-- Lo mínimo para decidir si unirse: sin nombres de miembros ni mensaje privado.
create function public.preview_plan_invite(p_token text)
returns table (
  plan_id uuid, name text, mode text, title jsonb, starts_at timestamptz, time_zone text,
  owner_name text, member_count integer, already_member boolean
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_invite public.plan_invites := public.valid_plan_invite(p_token);
begin
  if (select status from public.plans where id = v_invite.plan_id) = 'cancelled' then
    perform public.cinet_fail('CN410', 'El plan fue cancelado.');
  end if;
  return query
    select p.id, p.name, p.mode, jsonb_build_object('title', p.title ->> 'title', 'year', p.title ->> 'year', 'image', p.title ->> 'image'),
           p.starts_at, p.time_zone,
           (select m.display_name from public.plan_members m where m.plan_id = p.id and m.role = 'owner'),
           (select count(*)::integer from public.plan_members m where m.plan_id = p.id),
           exists (select 1 from public.plan_members m where m.plan_id = p.id and m.user_id = (select auth.uid()))
    from public.plans p where p.id = v_invite.plan_id;
end;
$$;

create function public.accept_plan_invite(p_token text, p_display_name text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_invite public.plan_invites;
  v_status text;
begin
  if v_uid is null then perform public.cinet_fail('CN403', 'Inicia sesión para unirte al plan.'); end if;
  v_invite := public.valid_plan_invite(p_token, true); -- bloquea la invitación: usos exactos
  select status into v_status from public.plans where id = v_invite.plan_id for update; -- bloquea el plan: cupo exacto
  if v_status = 'cancelled' then perform public.cinet_fail('CN410', 'El plan fue cancelado.'); end if;
  if exists (select 1 from public.plan_members where plan_id = v_invite.plan_id and user_id = v_uid) then
    return v_invite.plan_id; -- idempotente: no gasta otro uso
  end if;
  if (select count(*) from public.plan_members where plan_id = v_invite.plan_id) >= 30 then
    perform public.cinet_fail('CN429', 'El plan ya está lleno (30 personas).');
  end if;
  insert into public.plan_members (plan_id, user_id, role, display_name)
  values (v_invite.plan_id, v_uid, 'member', public.clean_display_name(p_display_name));
  update public.plan_invites set uses = uses + 1 where id = v_invite.id;
  return v_invite.plan_id;
end;
$$;

-- ---------- Permisos de ejecución ----------
-- Por defecto PostgreSQL concede EXECUTE a PUBLIC: se retira y se da solo lo necesario.
revoke execute on function
  public.is_plan_member(uuid), public.is_guest(), public.cinet_fail(text, text), public.clean_display_name(text),
  public.hash_invite_token(text), public.valid_plan_invite(text, boolean),
  public.create_plan(text, text, text, text, text, jsonb, jsonb, date, time, text, jsonb, text),
  public.update_plan(uuid, integer, text, text), public.cancel_plan(uuid), public.delete_plan(uuid),
  public.set_plan_rsvp(uuid, text), public.leave_plan(uuid), public.remove_plan_member(uuid, uuid),
  public.create_plan_invite(uuid, integer, integer), public.revoke_plan_invite(uuid),
  public.preview_plan_invite(text), public.accept_plan_invite(text, text)
from public, anon, authenticated;

-- Las políticas RLS llaman a is_plan_member como el usuario: necesita EXECUTE.
grant execute on function public.is_plan_member(uuid) to authenticated;
grant execute on function
  public.create_plan(text, text, text, text, text, jsonb, jsonb, date, time, text, jsonb, text),
  public.update_plan(uuid, integer, text, text), public.cancel_plan(uuid), public.delete_plan(uuid),
  public.set_plan_rsvp(uuid, text), public.leave_plan(uuid), public.remove_plan_member(uuid, uuid),
  public.create_plan_invite(uuid, integer, integer), public.revoke_plan_invite(uuid),
  public.preview_plan_invite(text), public.accept_plan_invite(text, text)
to authenticated;

-- ---------- Tiempo real ----------
-- Postgres Changes respeta RLS: cada suscriptor solo recibe filas que puede leer.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.plans, public.plan_members;
  end if;
end;
$$;
