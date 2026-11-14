-- =========================================================
-- Auditoría 2026-11-07 · N05, N14 y N15.
--
-- N05  Facturación Plus: el orden de eventos vive en una fila de control POR USUARIO (billing_state),
--      creada ANTES de ordenar, así que incluso el primer evento (p. ej. «expired» sin derecho previo)
--      deja barrera. Dos registros monótonos —último grant (activated/renewed) y último stop
--      (canceled/expired)— ordenados por (occurred_at, event_id): fechas iguales se desempatan por
--      event_id. El estado del derecho se DERIVA de ambos registros, por lo que cualquier permutación
--      de los mismos eventos converge al mismo estado final. event_id sigue siendo único (idempotencia).
--      Resultado: 'applied' si cambia el derecho, 'stale' si no (evento anterior), 'duplicate'.
-- N14  accept_group_invite bloquea grupo → invitación (como revoke y delete), revalidando bajo lock.
--      Orden global documentado: groups → group_invites → group_members.
-- N15  Cuotas de creación (salas, grupos, solicitudes de organización): se serializan por propietario
--      con un advisory lock transaccional y se cuenta/inserta dentro de la misma sección protegida.
-- =========================================================

-- ---------- N05 ----------

create table public.billing_state (
  user_id uuid primary key references auth.users (id) on delete cascade,
  grant_at timestamptz,
  grant_id text,
  period_end timestamptz,
  provider_ref text,
  stop_at timestamptz,
  stop_id text,
  stop_kind text check (stop_kind in ('canceled', 'expired')),
  updated_at timestamptz not null default now()
);
alter table public.billing_state enable row level security; -- sin políticas: solo service_role
revoke all on table public.billing_state from public, anon, authenticated;

-- Derechos de proveedor anteriores a esta migración: se siembra el estado desde sus eventos.
insert into public.billing_state (user_id, grant_at, grant_id, period_end, provider_ref, stop_at, stop_id, stop_kind)
select e.user_id,
       (select max(b.occurred_at) from public.billing_events b where b.user_id = e.user_id and b.kind in ('activated', 'renewed')),
       (select b.event_id from public.billing_events b where b.user_id = e.user_id and b.kind in ('activated', 'renewed') order by b.occurred_at desc, b.event_id desc limit 1),
       e.current_period_end, e.provider_ref,
       (select max(b.occurred_at) from public.billing_events b where b.user_id = e.user_id and b.kind in ('canceled', 'expired')),
       (select b.event_id from public.billing_events b where b.user_id = e.user_id and b.kind in ('canceled', 'expired') order by b.occurred_at desc, b.event_id desc limit 1),
       (select b.kind from public.billing_events b where b.user_id = e.user_id and b.kind in ('canceled', 'expired') order by b.occurred_at desc, b.event_id desc limit 1)
from public.entitlements e where e.source = 'provider'
on conflict do nothing;

create or replace function public.apply_billing_event(
  p_provider text, p_event_id text, p_kind text, p_user uuid, p_occurred_at timestamptz,
  p_period_end timestamptz default null, p_provider_ref text default null
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_state public.billing_state;
  v_before_status text;
  v_before_end timestamptz;
  v_status text;
  v_end timestamptz;
  v_grants boolean := p_kind in ('activated', 'renewed');
  v_stop_wins boolean;
  v_after_status text;
  v_after_end timestamptz;
begin
  if p_kind not in ('activated', 'renewed', 'canceled', 'expired') then perform public.cinet_fail('CN422', 'Tipo de evento no válido.'); end if;
  if v_grants and (p_period_end is null or p_period_end <= p_occurred_at) then perform public.cinet_fail('CN422', 'Falta el fin del periodo.'); end if;

  insert into public.billing_events (provider, event_id, kind, user_id, occurred_at)
  values (p_provider, p_event_id, p_kind, p_user, p_occurred_at)
  on conflict do nothing;
  if not found then return 'duplicate'; end if;

  -- La fila de control existe SIEMPRE antes de ordenar; el lock la serializa también para el primer evento.
  insert into public.billing_state (user_id) values (p_user) on conflict do nothing;
  select * into v_state from public.billing_state where user_id = p_user for update;
  select status, current_period_end into v_before_status, v_before_end from public.entitlements where user_id = p_user;

  if v_grants and (v_state.grant_at is null or (p_occurred_at, p_event_id) > (v_state.grant_at, v_state.grant_id)) then
    v_state.grant_at := p_occurred_at; v_state.grant_id := p_event_id; v_state.period_end := p_period_end;
    v_state.provider_ref := coalesce(p_provider_ref, v_state.provider_ref);
  elsif not v_grants and (v_state.stop_at is null or (p_occurred_at, p_event_id) > (v_state.stop_at, v_state.stop_id)) then
    v_state.stop_at := p_occurred_at; v_state.stop_id := p_event_id; v_state.stop_kind := p_kind;
  end if;
  update public.billing_state
  set grant_at = v_state.grant_at, grant_id = v_state.grant_id, period_end = v_state.period_end, provider_ref = v_state.provider_ref,
      stop_at = v_state.stop_at, stop_id = v_state.stop_id, stop_kind = v_state.stop_kind, updated_at = now()
  where user_id = p_user;

  -- Estado derivado: gana el más reciente entre el último grant y el último stop.
  if v_state.grant_at is not null then
    v_stop_wins := v_state.stop_at is not null and (v_state.stop_at, v_state.stop_id) > (v_state.grant_at, v_state.grant_id);
    v_status := case when not v_stop_wins then 'active' else v_state.stop_kind end;
    v_end := case when v_stop_wins and v_state.stop_kind = 'expired' then least(v_state.period_end, v_state.stop_at) else v_state.period_end end;
    insert into public.entitlements (user_id, status, source, current_period_end, canceled_at, provider_ref, last_event_at)
    values (p_user, v_status, 'provider', v_end, case when v_stop_wins and v_state.stop_kind = 'canceled' then v_state.stop_at end,
            v_state.provider_ref, greatest(v_state.grant_at, v_state.stop_at))
    on conflict (user_id) do update
      set status = excluded.status, source = 'provider', current_period_end = excluded.current_period_end,
          canceled_at = excluded.canceled_at, provider_ref = coalesce(excluded.provider_ref, public.entitlements.provider_ref),
          last_event_at = excluded.last_event_at, updated_at = now();
  end if;

  select status, current_period_end into v_after_status, v_after_end from public.entitlements where user_id = p_user;
  return case when v_after_status is distinct from v_before_status or v_after_end is distinct from v_before_end then 'applied' else 'stale' end;
end;
$$;

-- ---------- N14: grupo antes que invitación ----------

create or replace function public.accept_group_invite(p_token text, p_display_name text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_group_id uuid;
  v_invite public.group_invites;
begin
  if v_uid is null then perform public.cinet_fail('CN403', 'Inicia sesión para unirte al grupo.'); end if;
  -- Lectura sin bloqueo solo para saber qué grupo; los locks van grupo → invitación.
  select group_id into v_group_id from public.group_invites where token_hash = public.hash_invite_token(p_token);
  if v_group_id is null then perform public.cinet_fail('CN404', 'No encontramos la invitación.'); end if;
  perform 1 from public.groups where id = v_group_id for update;
  if not found then perform public.cinet_fail('CN404', 'No encontramos la invitación.'); end if;
  -- Revalidación bajo lock: pudo revocarse o borrarse mientras esperábamos el grupo.
  select * into v_invite from public.group_invites where token_hash = public.hash_invite_token(p_token) for update;
  if not found or v_invite.group_id <> v_group_id then perform public.cinet_fail('CN404', 'No encontramos la invitación.'); end if;
  if exists (select 1 from public.group_members where group_id = v_group_id and user_id = v_uid) then return v_group_id; end if;
  if v_invite.revoked_at is not null then perform public.cinet_fail('CN410', 'Esta invitación fue revocada.'); end if;
  if v_invite.expires_at <= now() then perform public.cinet_fail('CN410', 'Esta invitación caducó.'); end if;
  if (select count(*) from public.group_members where group_id = v_group_id) >= 30 then
    perform public.cinet_fail('CN429', 'El grupo ya está lleno (30 personas).');
  end if;
  insert into public.group_members (group_id, user_id, display_name) values (v_group_id, v_uid, public.clean_display_name(p_display_name));
  update public.group_invites set uses = uses + 1 where id = v_invite.id;
  return v_group_id;
end;
$$;

-- ---------- N15: cuotas serializadas por propietario ----------

create or replace function public.create_duo_room(p_display_name text, p_mode text default 'movie', p_region text default 'CO')
returns table (id uuid, code text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_id uuid;
  v_code text;
begin
  if v_uid is null then perform public.cinet_fail('CN403', 'Inicia sesión para abrir una sala.'); end if;
  if public.is_guest() then perform public.cinet_fail('CN403', 'Crea una cuenta para abrir una sala; como invitado puedes unirte a una.'); end if;
  if p_mode not in ('movie', 'tv') or coalesce(p_region, '') !~ '^[A-Z]{2}$' then
    perform public.cinet_fail('CN422', 'Tipo de sala o región no válidos.');
  end if;
  perform pg_advisory_xact_lock(hashtextextended('cinet:quota:rooms:' || v_uid::text, 0));
  if (select count(*) from public.duo_rooms r where r.host_id = v_uid and r.status <> 'closed' and r.expires_at > now()) >= 5 then
    perform public.cinet_fail('CN429', 'Ya tienes 5 salas abiertas. Cierra alguna para abrir otra.');
  end if;
  for attempt in 1..5 loop
    begin
      v_code := public.new_room_code();
      insert into public.duo_rooms (code, host_id, mode, region) values (v_code, v_uid, p_mode, p_region) returning duo_rooms.id into v_id;
      exit;
    exception when unique_violation then
      v_id := null;
    end;
  end loop;
  if v_id is null then perform public.cinet_fail('CN429', 'No pudimos generar un código. Inténtalo de nuevo.'); end if;
  insert into public.room_members (room_id, user_id, role, seat, display_name)
  values (v_id, v_uid, 'host', 1, public.clean_display_name(p_display_name));
  return query select v_id, v_code;
end;
$$;

create or replace function public.create_group(p_name text, p_display_name text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_id uuid;
  v_name text := btrim(coalesce(p_name, ''));
begin
  if v_uid is null then perform public.cinet_fail('CN403', 'Inicia sesión para crear un grupo.'); end if;
  if public.is_guest() then perform public.cinet_fail('CN403', 'Crea una cuenta para guardar grupos.'); end if;
  if char_length(v_name) not between 1 and 60 then perform public.cinet_fail('CN422', 'El nombre del grupo debe tener entre 1 y 60 caracteres.'); end if;
  perform pg_advisory_xact_lock(hashtextextended('cinet:quota:groups:' || v_uid::text, 0));
  if (select count(*) from public.groups where owner_id = v_uid) >= 20 then perform public.cinet_fail('CN429', 'Ya tienes 20 grupos.'); end if;
  insert into public.groups (owner_id, name) values (v_uid, v_name) returning id into v_id;
  insert into public.group_members (group_id, user_id, role, display_name) values (v_id, v_uid, 'owner', public.clean_display_name(p_display_name));
  return v_id;
end;
$$;

create or replace function public.request_organization(p_name text, p_kind text, p_official_url text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_id uuid;
begin
  if v_uid is null then perform public.cinet_fail('CN403', 'Inicia sesión para solicitar una cuenta de aliado.'); end if;
  if public.is_guest() then perform public.cinet_fail('CN403', 'Crea una cuenta para solicitar una cuenta de aliado.'); end if;
  perform pg_advisory_xact_lock(hashtextextended('cinet:quota:orgs:' || v_uid::text, 0));
  if (select count(*) from public.organizations where created_by = v_uid and status = 'pending') >= 3 then
    perform public.cinet_fail('CN429', 'Ya tienes 3 solicitudes pendientes.');
  end if;
  begin
    insert into public.organizations (name, kind, official_url, created_by) values (btrim(p_name), p_kind, btrim(p_official_url), v_uid) returning id into v_id;
  exception when check_violation then
    perform public.cinet_fail('CN422', 'Revisa el nombre, el tipo y que el sitio oficial empiece por https://.');
  end;
  insert into public.org_members (org_id, user_id, role) values (v_id, v_uid, 'admin');
  return v_id;
end;
$$;
