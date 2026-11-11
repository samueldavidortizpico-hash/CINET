-- Un solo orden de bloqueo para operaciones que compiten por un plan:
-- plans -> plan_invites -> plan_members. No cambia tablas ni permisos.

create or replace function public.cancel_plan(p_plan uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare v_plan public.plans;
begin
  select * into v_plan from public.plans where id = p_plan for update;
  if v_plan.id is null or not public.is_plan_member(p_plan) then perform public.cinet_fail('CN404', 'El plan no existe o no tienes acceso.'); end if;
  if v_plan.owner_id <> (select auth.uid()) then perform public.cinet_fail('CN403', 'Solo quien organiza puede cancelar el plan.'); end if;
  if v_plan.status = 'cancelled' then return; end if;
  update public.plans set status = 'cancelled', version = version + 1, updated_at = now() where id = p_plan;
  update public.plan_invites set revoked_at = now() where plan_id = p_plan and revoked_at is null;
end;
$$;

create or replace function public.set_plan_rsvp(p_plan uuid, p_rsvp text)
returns void language plpgsql security definer set search_path = '' as $$
declare v_plan public.plans;
begin
  if p_rsvp is null or p_rsvp not in ('yes', 'maybe', 'no') then perform public.cinet_fail('CN422', 'Respuesta no válida.'); end if;
  select * into v_plan from public.plans where id = p_plan for update;
  if v_plan.id is null or not public.is_plan_member(p_plan) then perform public.cinet_fail('CN404', 'El plan no existe o no tienes acceso.'); end if;
  if v_plan.status = 'cancelled' then perform public.cinet_fail('CN410', 'El plan está cancelado.'); end if;
  update public.plan_members set rsvp = p_rsvp, responded_at = now()
  where plan_id = p_plan and user_id = (select auth.uid());
end;
$$;

create or replace function public.create_plan_invite(p_plan uuid, p_days integer default 14, p_max_uses integer default null)
returns text language plpgsql security definer set search_path = '' as $$
declare v_plan public.plans; v_token text;
begin
  select * into v_plan from public.plans where id = p_plan for update;
  if v_plan.id is null or not public.is_plan_member(p_plan) then perform public.cinet_fail('CN404', 'El plan no existe o no tienes acceso.'); end if;
  if v_plan.owner_id <> (select auth.uid()) then perform public.cinet_fail('CN403', 'Solo quien organiza puede invitar.'); end if;
  if v_plan.status = 'cancelled' then perform public.cinet_fail('CN410', 'El plan está cancelado.'); end if;
  if p_days is null or p_days not between 1 and 60 then perform public.cinet_fail('CN422', 'La invitación debe durar entre 1 y 60 días.'); end if;
  if (select count(*) from public.plan_invites where plan_id = p_plan and revoked_at is null and expires_at > now()) >= 20 then
    perform public.cinet_fail('CN429', 'Este plan ya tiene demasiadas invitaciones activas. Revoca alguna.');
  end if;
  v_token := translate(encode(uuid_send(gen_random_uuid()) || uuid_send(gen_random_uuid()), 'base64'), '+/=', '-_');
  insert into public.plan_invites (plan_id, token_hash, created_by, expires_at, max_uses)
  values (p_plan, public.hash_invite_token(v_token), (select auth.uid()), now() + make_interval(days => p_days), p_max_uses);
  return v_token;
end;
$$;

create or replace function public.accept_plan_invite(p_token text, p_display_name text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := (select auth.uid());
  v_invite public.plan_invites;
  v_plan public.plans;
  v_plan_id uuid;
begin
  if v_uid is null then perform public.cinet_fail('CN403', 'Inicia sesión para unirte al plan.'); end if;

  -- La lectura inicial identifica el plan sin tomar el lock de invitación.
  select plan_id into v_plan_id from public.plan_invites
  where token_hash = public.hash_invite_token(p_token);
  if v_plan_id is null then perform public.cinet_fail('CN404', 'La invitación no existe.'); end if;

  -- El plan siempre se bloquea antes que invitación. Un reintento del miembro
  -- ya insertado devuelve éxito aunque la última unidad se haya consumido.
  select * into v_plan from public.plans where id = v_plan_id for update;
  if v_plan.id is null then perform public.cinet_fail('CN404', 'El plan no existe.'); end if;
  select * into v_invite from public.plan_invites
  where token_hash = public.hash_invite_token(p_token) for update;
  if v_invite.id is null or v_invite.plan_id <> v_plan_id then perform public.cinet_fail('CN404', 'La invitación no existe.'); end if;

  if exists (select 1 from public.plan_members where plan_id = v_plan_id and user_id = v_uid) then
    return v_plan_id;
  end if;
  if v_invite.revoked_at is not null or v_invite.expires_at <= now()
     or (v_invite.max_uses is not null and v_invite.uses >= v_invite.max_uses) then
    perform public.cinet_fail('CN410', 'Esta invitación ya no está disponible.');
  end if;
  if v_plan.status = 'cancelled' then perform public.cinet_fail('CN410', 'El plan fue cancelado.'); end if;
  if (select count(*) from public.plan_members where plan_id = v_plan_id) >= 30 then
    perform public.cinet_fail('CN429', 'El plan ya está lleno (30 personas).');
  end if;

  insert into public.plan_members (plan_id, user_id, role, display_name)
  values (v_plan_id, v_uid, 'member', public.clean_display_name(p_display_name));
  update public.plan_invites set uses = uses + 1 where id = v_invite.id;
  return v_plan_id;
end;
$$;

-- AD08: la validación de create_plan ya contrasta time_zone con
-- pg_timezone_names y las columnas JSON exigen objetos y límites de tamaño.
-- Se documenta aquí que clientes JS deben validar zonas contra Intl también.
