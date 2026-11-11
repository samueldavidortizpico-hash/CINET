-- =========================================================
-- Grupos guardados («la familia», «los del colegio») y «repetir plan».
--   groups · group_members · group_invites · plans.group_id
--
-- - Un grupo es privado: solo sus miembros lo ven a él y a sus miembros (RLS).
-- - Entrar a un grupo NO da acceso a planes pasados: compartir un plan con el grupo añade a quienes
--   están en ese momento (sin respuesta). La membresía es revocable (salir / retirar).
-- - Repetir un plan crea uno nuevo con la misma película, lugar y personas, en otra fecha y SIN copiar
--   confirmaciones: cada persona vuelve a responder. Idempotente con client_ref.
-- Errores: los mismos CN4xx.
-- =========================================================

create table public.groups (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  created_at timestamptz not null default now()
);
create index groups_owner_idx on public.groups (owner_id);

create table public.group_members (
  group_id uuid not null references public.groups (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member')),
  display_name text not null check (char_length(display_name) between 1 and 40),
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);
create index group_members_user_idx on public.group_members (user_id);

create table public.group_invites (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups (id) on delete cascade,
  token_hash bytea not null unique,
  created_by uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  revoked_at timestamptz,
  uses integer not null default 0
);
create index group_invites_group_idx on public.group_invites (group_id);

alter table public.plans add column group_id uuid references public.groups (id) on delete set null;
create index plans_group_idx on public.plans (group_id);

create function public.is_group_member(p_group uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.group_members m where m.group_id = p_group and m.user_id = (select auth.uid()));
$$;

alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.group_invites enable row level security;

create policy "Grupos: los ven sus miembros" on public.groups for select to authenticated using (public.is_group_member(id));
create policy "Miembros de grupo: los ven los miembros" on public.group_members for select to authenticated using (public.is_group_member(group_id));
create policy "Invitaciones de grupo: las ve el dueño"
  on public.group_invites for select to authenticated
  using (exists (select 1 from public.groups g where g.id = group_id and g.owner_id = (select auth.uid())));

revoke all on table public.groups, public.group_members, public.group_invites from public, anon, authenticated;
grant select on table public.groups, public.group_members to authenticated;
grant select (id, group_id, created_at, expires_at, revoked_at, uses) on table public.group_invites to authenticated;

-- ---------- RPC ----------

create function public.create_group(p_name text, p_display_name text)
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
  if (select count(*) from public.groups where owner_id = v_uid) >= 20 then perform public.cinet_fail('CN429', 'Ya tienes 20 grupos.'); end if;
  insert into public.groups (owner_id, name) values (v_uid, v_name) returning id into v_id;
  insert into public.group_members (group_id, user_id, role, display_name) values (v_id, v_uid, 'owner', public.clean_display_name(p_display_name));
  return v_id;
end;
$$;

create function public.group_owned(p_group uuid)
returns public.groups
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_group public.groups;
begin
  select * into v_group from public.groups where id = p_group for update;
  if not found or not public.is_group_member(p_group) then perform public.cinet_fail('CN404', 'No encontramos el grupo.'); end if;
  if v_group.owner_id <> (select auth.uid()) then perform public.cinet_fail('CN403', 'Solo quien creó el grupo puede hacerlo.'); end if;
  return v_group;
end;
$$;

create function public.rename_group(p_group uuid, p_name text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.group_owned(p_group);
  if char_length(btrim(coalesce(p_name, ''))) not between 1 and 60 then perform public.cinet_fail('CN422', 'El nombre del grupo debe tener entre 1 y 60 caracteres.'); end if;
  update public.groups set name = btrim(p_name) where id = p_group;
end;
$$;

create function public.delete_group(p_group uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.group_owned(p_group);
  delete from public.groups where id = p_group; -- los planes conservan a sus miembros (group_id → null)
end;
$$;

create function public.leave_group(p_group uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_group_member(p_group) then perform public.cinet_fail('CN404', 'No encontramos el grupo.'); end if;
  if exists (select 1 from public.groups where id = p_group and owner_id = (select auth.uid())) then
    perform public.cinet_fail('CN403', 'Quien creó el grupo no puede salir: puede eliminarlo.');
  end if;
  delete from public.group_members where group_id = p_group and user_id = (select auth.uid());
end;
$$;

create function public.remove_group_member(p_group uuid, p_user uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_group public.groups;
begin
  v_group := public.group_owned(p_group);
  if p_user = v_group.owner_id then perform public.cinet_fail('CN422', 'No puedes retirarte a ti.'); end if;
  delete from public.group_members where group_id = p_group and user_id = p_user;
end;
$$;

create function public.create_group_invite(p_group uuid, p_days integer default 14)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_token text;
begin
  perform public.group_owned(p_group);
  if p_days not between 1 and 30 then perform public.cinet_fail('CN422', 'La invitación dura entre 1 y 30 días.'); end if;
  if (select count(*) from public.group_invites where group_id = p_group and revoked_at is null and expires_at > now()) >= 10 then
    perform public.cinet_fail('CN429', 'Demasiados enlaces activos. Revoca alguno.');
  end if;
  v_token := translate(encode(uuid_send(gen_random_uuid()) || uuid_send(gen_random_uuid()), 'base64'), '+/=', '-_');
  insert into public.group_invites (group_id, token_hash, created_by, expires_at)
  values (p_group, public.hash_invite_token(v_token), (select auth.uid()), now() + make_interval(days => p_days));
  return v_token;
end;
$$;

create function public.revoke_group_invite(p_invite uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_group uuid;
begin
  select group_id into v_group from public.group_invites where id = p_invite;
  if v_group is null then perform public.cinet_fail('CN404', 'No encontramos la invitación.'); end if;
  perform public.group_owned(v_group);
  update public.group_invites set revoked_at = coalesce(revoked_at, now()) where id = p_invite;
end;
$$;

create function public.valid_group_invite(p_token text, p_lock boolean default false)
returns public.group_invites
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_invite public.group_invites;
begin
  if p_lock then
    select * into v_invite from public.group_invites where token_hash = public.hash_invite_token(p_token) for update;
  else
    select * into v_invite from public.group_invites where token_hash = public.hash_invite_token(p_token);
  end if;
  if not found then perform public.cinet_fail('CN404', 'No encontramos la invitación.'); end if;
  if v_invite.revoked_at is not null then perform public.cinet_fail('CN410', 'Esta invitación fue revocada.'); end if;
  if v_invite.expires_at <= now() then perform public.cinet_fail('CN410', 'Esta invitación caducó.'); end if;
  return v_invite;
end;
$$;

create function public.preview_group_invite(p_token text)
returns table (group_id uuid, name text, owner_name text, member_count integer, already_member boolean)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_invite public.group_invites;
begin
  if (select auth.uid()) is null then perform public.cinet_fail('CN403', 'Inicia sesión para ver la invitación.'); end if;
  v_invite := public.valid_group_invite(p_token);
  return query
    select g.id, g.name,
      (select m.display_name from public.group_members m where m.group_id = g.id and m.role = 'owner'),
      (select count(*)::int from public.group_members m where m.group_id = g.id),
      exists (select 1 from public.group_members m where m.group_id = g.id and m.user_id = (select auth.uid()))
    from public.groups g where g.id = v_invite.group_id;
end;
$$;

create function public.accept_group_invite(p_token text, p_display_name text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_invite public.group_invites;
begin
  if v_uid is null then perform public.cinet_fail('CN403', 'Inicia sesión para unirte al grupo.'); end if;
  v_invite := public.valid_group_invite(p_token, true);
  perform 1 from public.groups where id = v_invite.group_id for update; -- cupo exacto
  if exists (select 1 from public.group_members where group_id = v_invite.group_id and user_id = v_uid) then return v_invite.group_id; end if;
  if (select count(*) from public.group_members where group_id = v_invite.group_id) >= 30 then
    perform public.cinet_fail('CN429', 'El grupo ya está lleno (30 personas).');
  end if;
  insert into public.group_members (group_id, user_id, display_name) values (v_invite.group_id, v_uid, public.clean_display_name(p_display_name));
  update public.group_invites set uses = uses + 1 where id = v_invite.id;
  return v_invite.group_id;
end;
$$;

-- Comparte un plan con un grupo: entra quien esté hoy en el grupo (sin respuesta). Idempotente.
create function public.share_plan_with_group(p_plan uuid, p_group uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_plan public.plans;
  v_added integer;
begin
  select * into v_plan from public.plans where id = p_plan for update;
  if not found or not public.is_plan_member(p_plan) then perform public.cinet_fail('CN404', 'El plan no existe o no tienes acceso.'); end if;
  if v_plan.owner_id <> v_uid then perform public.cinet_fail('CN403', 'Solo quien organiza puede compartir el plan con un grupo.'); end if;
  if v_plan.status = 'cancelled' then perform public.cinet_fail('CN410', 'El plan fue cancelado.'); end if;
  if not public.is_group_member(p_group) then perform public.cinet_fail('CN404', 'No encontramos el grupo.'); end if;
  if (select count(*) from public.plan_members where plan_id = p_plan)
     + (select count(*) from public.group_members g where g.group_id = p_group
          and not exists (select 1 from public.plan_members m where m.plan_id = p_plan and m.user_id = g.user_id)) > 30 then
    perform public.cinet_fail('CN429', 'Con ese grupo el plan pasaría de 30 personas.');
  end if;
  insert into public.plan_members (plan_id, user_id, role, display_name)
  select p_plan, g.user_id, 'member', g.display_name from public.group_members g
  where g.group_id = p_group
  on conflict (plan_id, user_id) do nothing;
  get diagnostics v_added = row_count;
  update public.plans set group_id = p_group, updated_at = now() where id = p_plan;
  return v_added;
end;
$$;

-- Repite un plan en otra fecha: misma película, lugar, detalles y personas (y quien se haya sumado al
-- grupo), sin confirmaciones. Quien repite organiza el nuevo. Idempotente con client_ref.
create function public.repeat_plan(p_plan uuid, p_client_ref text, p_date date, p_time time, p_time_zone text default 'America/Bogota')
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
begin
  if v_uid is null then perform public.cinet_fail('CN403', 'Inicia sesión.'); end if;
  if public.is_guest() then perform public.cinet_fail('CN403', 'Crea una cuenta para organizar planes.'); end if;
  select * into v_old from public.plans where id = p_plan;
  if not found or not public.is_plan_member(p_plan) then perform public.cinet_fail('CN404', 'El plan no existe o no tienes acceso.'); end if;
  select id into v_id from public.plans where owner_id = v_uid and client_ref = p_client_ref;
  if v_id is not null then return v_id; end if;
  if p_date is null or p_time is null then perform public.cinet_fail('CN422', 'Elige la fecha y la hora del nuevo plan.'); end if;
  if not exists (select 1 from pg_catalog.pg_timezone_names where name = p_time_zone) then perform public.cinet_fail('CN422', 'Zona horaria no válida.'); end if;
  insert into public.plans (owner_id, client_ref, name, message, mode, title_id, title, place, starts_at, time_zone, time_source, details, group_id)
  values (v_uid, p_client_ref, v_old.name, v_old.message, v_old.mode, v_old.title_id, v_old.title, v_old.place,
          (p_date + p_time) at time zone p_time_zone, p_time_zone, 'organizer', v_old.details, v_old.group_id)
  returning id into v_id;
  select display_name into v_name from public.plan_members where plan_id = p_plan and user_id = v_uid;
  insert into public.plan_members (plan_id, user_id, role, display_name, rsvp, responded_at) values (v_id, v_uid, 'owner', v_name, 'yes', now());
  insert into public.plan_members (plan_id, user_id, role, display_name)
  select v_id, m.user_id, 'member', m.display_name from public.plan_members m where m.plan_id = p_plan and m.user_id <> v_uid
  on conflict (plan_id, user_id) do nothing;
  if v_old.group_id is not null and public.is_group_member(v_old.group_id) then
    insert into public.plan_members (plan_id, user_id, role, display_name)
    select v_id, g.user_id, 'member', g.display_name from public.group_members g where g.group_id = v_old.group_id
    on conflict (plan_id, user_id) do nothing;
  end if;
  return v_id;
end;
$$;

revoke execute on function
  public.is_group_member(uuid), public.create_group(text, text), public.group_owned(uuid), public.rename_group(uuid, text),
  public.delete_group(uuid), public.leave_group(uuid), public.remove_group_member(uuid, uuid),
  public.create_group_invite(uuid, integer), public.revoke_group_invite(uuid), public.valid_group_invite(text, boolean),
  public.preview_group_invite(text), public.accept_group_invite(text, text), public.share_plan_with_group(uuid, uuid),
  public.repeat_plan(uuid, text, date, time, text)
from public, anon, authenticated;

grant execute on function
  public.is_group_member(uuid), public.create_group(text, text), public.rename_group(uuid, text), public.delete_group(uuid),
  public.leave_group(uuid), public.remove_group_member(uuid, uuid), public.create_group_invite(uuid, integer),
  public.revoke_group_invite(uuid), public.preview_group_invite(text), public.accept_group_invite(text, text),
  public.share_plan_with_group(uuid, uuid), public.repeat_plan(uuid, text, date, time, text)
to authenticated;
