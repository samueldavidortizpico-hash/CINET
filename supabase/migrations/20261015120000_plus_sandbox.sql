-- =========================================================
-- CINET Plus en SANDBOX: derechos comprobados en el servidor y ningún cobro real.
-- - billing_config.sandbox (fila única, apagada por defecto). La cambia un operador desde SQL:
--     update public.billing_config set sandbox = true, updated_at = now();
-- - entitlements: cada quien lee lo suyo; nadie lo escribe desde el cliente. Solo estas funciones
--   (sandbox) o el webhook de cobros con service role (apply_billing_event).
--   Cancelar conserva el acceso hasta current_period_end; vencido = sin acceso (lo calcula has_plus).
-- - billing_events: (proveedor, id de evento) único → el webhook es idempotente; los eventos más
--   viejos que el último aplicado se ignoran (llegan desordenados).
-- - Primera función Plus: «noche fija» (plans.repeat_every) y programar la siguiente en un clic.
--   Lo gratuito no cambia: Duo hasta 8, invitaciones, votación, modo familia y repetir a mano.
-- Errores: CN402 requiere Plus · resto como en 20261009120000_shared_plans.sql.
-- =========================================================

create table public.billing_config (
  id boolean primary key default true check (id),
  sandbox boolean not null default false,
  updated_at timestamptz not null default now()
);
insert into public.billing_config default values;

create table public.entitlements (
  user_id uuid primary key references auth.users (id) on delete cascade,
  plan text not null default 'plus' check (plan = 'plus'),
  status text not null check (status in ('active', 'canceled', 'expired')),
  source text not null check (source in ('sandbox', 'provider')),
  current_period_end timestamptz not null,
  canceled_at timestamptz,
  provider_ref text unique check (char_length(provider_ref) <= 100),
  last_event_at timestamptz,
  updated_at timestamptz not null default now()
);

create table public.billing_events (
  provider text not null check (char_length(provider) between 1 and 40),
  event_id text not null check (char_length(event_id) between 1 and 100),
  kind text not null check (kind in ('activated', 'renewed', 'canceled', 'expired')),
  user_id uuid references auth.users (id) on delete set null,
  occurred_at timestamptz not null,
  received_at timestamptz not null default now(),
  primary key (provider, event_id)
);

alter table public.plans add column repeat_every text check (repeat_every in ('week', '2weeks', 'month'));

alter table public.billing_config enable row level security;
alter table public.entitlements enable row level security;
alter table public.billing_events enable row level security; -- sin políticas: solo service role

create policy "Configuración de cobros: lectura pública" on public.billing_config for select to anon, authenticated using (true);
create policy "Derechos: cada quien ve los suyos" on public.entitlements for select to authenticated using (user_id = (select auth.uid()));

grant select on table public.billing_config to anon, authenticated;
grant select on table public.entitlements to authenticated;

create function public.has_plus()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.entitlements
    where user_id = (select auth.uid()) and status in ('active', 'canceled') and current_period_end > now()
  );
$$;

-- Sandbox: 30 días de Plus sin pasarela ni cobro. Solo si un operador encendió el sandbox.
create function public.activate_plus_sandbox()
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_end timestamptz;
begin
  if v_uid is null or public.is_guest() then perform public.cinet_fail('CN403', 'Crea una cuenta para probar Plus.'); end if;
  if not (select sandbox from public.billing_config) then perform public.cinet_fail('CN403', 'Plus aún no está disponible. No se ha cobrado nada.'); end if;
  if exists (select 1 from public.entitlements where user_id = v_uid and source = 'provider' and status <> 'expired' and current_period_end > now()) then
    perform public.cinet_fail('CN409', 'Ya tienes Plus.');
  end if;
  insert into public.entitlements (user_id, status, source, current_period_end)
  values (v_uid, 'active', 'sandbox', now() + interval '30 days')
  on conflict (user_id) do update
    set status = 'active', source = 'sandbox', current_period_end = excluded.current_period_end, canceled_at = null, updated_at = now()
  returning current_period_end into v_end;
  return v_end;
end;
$$;

-- Cancelar (solo sandbox; una suscripción real se cancela con su proveedor y llega por webhook).
create function public.cancel_plus()
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_end timestamptz;
begin
  update public.entitlements set status = 'canceled', canceled_at = now(), updated_at = now()
  where user_id = (select auth.uid()) and status = 'active' and source = 'sandbox'
  returning current_period_end into v_end;
  if v_end is null then perform public.cinet_fail('CN404', 'No tienes una suscripción de prueba activa.'); end if;
  return v_end;
end;
$$;

-- Webhook de cobros (solo service role). 'applied' | 'duplicate' | 'stale'.
create function public.apply_billing_event(
  p_provider text, p_event_id text, p_kind text, p_user uuid, p_occurred_at timestamptz,
  p_period_end timestamptz default null, p_provider_ref text default null
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_last timestamptz;
begin
  insert into public.billing_events (provider, event_id, kind, user_id, occurred_at)
  values (p_provider, p_event_id, p_kind, p_user, p_occurred_at)
  on conflict do nothing;
  if not found then return 'duplicate'; end if;

  select last_event_at into v_last from public.entitlements where user_id = p_user for update;
  if v_last is not null and p_occurred_at < v_last then return 'stale'; end if;

  if p_kind in ('activated', 'renewed') then
    if p_period_end is null or p_period_end <= p_occurred_at then perform public.cinet_fail('CN422', 'Falta el fin del periodo.'); end if;
    insert into public.entitlements (user_id, status, source, current_period_end, provider_ref, last_event_at)
    values (p_user, 'active', 'provider', p_period_end, p_provider_ref, p_occurred_at)
    on conflict (user_id) do update
      set status = 'active', source = 'provider', current_period_end = excluded.current_period_end, canceled_at = null,
          provider_ref = coalesce(excluded.provider_ref, public.entitlements.provider_ref), last_event_at = excluded.last_event_at, updated_at = now();
  elsif p_kind = 'canceled' then
    update public.entitlements set status = 'canceled', canceled_at = p_occurred_at, last_event_at = p_occurred_at, updated_at = now()
    where user_id = p_user and status = 'active';
  else -- expired
    update public.entitlements set status = 'expired', current_period_end = least(current_period_end, p_occurred_at), last_event_at = p_occurred_at, updated_at = now()
    where user_id = p_user;
  end if;
  return 'applied';
end;
$$;

-- Plus: noche fija. Apagarla siempre se puede; encenderla requiere Plus vigente.
create function public.set_plan_repeat(p_plan uuid, p_every text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.owned_active_plan(p_plan);
  if p_every is not null and p_every not in ('week', '2weeks', 'month') then perform public.cinet_fail('CN422', 'Frecuencia no válida.'); end if;
  if p_every is not null and not public.has_plus() then perform public.cinet_fail('CN402', 'La noche fija es parte de CINET Plus.'); end if;
  update public.plans set repeat_every = p_every, version = version + 1, updated_at = now() where id = p_plan;
end;
$$;

-- Programa la siguiente cita (misma hora local, siguiente fecha futura) con las mismas personas.
create function public.schedule_next_plan(p_plan uuid, p_client_ref text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_plan public.plans := public.owned_active_plan(p_plan);
  v_step interval;
  v_next timestamp;
  v_id uuid;
begin
  if not public.has_plus() then perform public.cinet_fail('CN402', 'La noche fija es parte de CINET Plus.'); end if;
  if v_plan.repeat_every is null then perform public.cinet_fail('CN422', 'Este plan no tiene noche fija.'); end if;
  if v_plan.starts_at is null then perform public.cinet_fail('CN422', 'Ponle fecha al plan primero.'); end if;
  v_step := case v_plan.repeat_every when 'week' then interval '7 days' when '2weeks' then interval '14 days' else interval '1 month' end;
  v_next := (v_plan.starts_at at time zone v_plan.time_zone) + v_step;
  while (v_next at time zone v_plan.time_zone) <= now() loop
    v_next := v_next + v_step;
  end loop;
  v_id := public.repeat_plan(p_plan, p_client_ref, v_next::date, v_next::time, v_plan.time_zone);
  update public.plans set repeat_every = v_plan.repeat_every where id = v_id and repeat_every is null;
  return v_id;
end;
$$;

revoke execute on function
  public.has_plus(), public.activate_plus_sandbox(), public.cancel_plus(),
  public.apply_billing_event(text, text, text, uuid, timestamptz, timestamptz, text),
  public.set_plan_repeat(uuid, text), public.schedule_next_plan(uuid, text)
from public, anon, authenticated;
grant execute on function
  public.has_plus(), public.activate_plus_sandbox(), public.cancel_plus(),
  public.set_plan_repeat(uuid, text), public.schedule_next_plan(uuid, text)
to authenticated;
grant execute on function public.apply_billing_event(text, text, text, uuid, timestamptz, timestamptz, text) to service_role;
