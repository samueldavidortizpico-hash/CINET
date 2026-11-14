-- =========================================================
-- Auditoría 2026-11-07 · N04: invitaciones a organizaciones con aceptación explícita.
--
-- Antes: add_org_member buscaba el correo en auth.users y sumaba a la persona sin preguntarle;
-- devolvía su UUID o CN404 (oráculo de cuentas) y lo podía usar una organización PENDIENTE.
-- Ahora:
--  - invite_org_member NO consulta auth.users: misma respuesta (vacía) exista o no la cuenta.
--  - Solo administradores de una organización VERIFICADA invitan.
--  - La invitación guarda el SHA-256 del correo normalizado (no el correo), vence a los 7 días,
--    se puede revocar y tiene cupos: 20 abiertas por organización y 50 creadas por día.
--  - La persona invitada la ve (list_my_org_invites) y solo es miembro si la ACEPTA.
--  - add_org_member se conserva por compatibilidad, pero solo invita (devuelve null).
-- Orden de locks: organizations → org_invites.
-- =========================================================

create table public.org_invites (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  email_hash bytea not null,
  role text not null default 'editor' check (role in ('admin', 'editor')),
  invited_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  revoked_at timestamptz,
  accepted_at timestamptz,
  accepted_by uuid references auth.users (id) on delete set null
);
create index org_invites_org_idx on public.org_invites (org_id, created_at desc);
create index org_invites_email_idx on public.org_invites (email_hash) where revoked_at is null and accepted_at is null;

alter table public.org_invites enable row level security;
create policy "Invitaciones de organización: las ven sus administradores"
  on public.org_invites for select to authenticated
  using (public.org_role(org_id) = 'admin');
revoke all on table public.org_invites from public, anon, authenticated;
grant select (id, org_id, role, created_at, expires_at, revoked_at, accepted_at) on table public.org_invites to authenticated;

create function public.org_email_hash(p_email text)
returns bytea
language sql
immutable
set search_path = ''
as $$
  select sha256(convert_to(lower(btrim(coalesce(p_email, ''))), 'UTF8'));
$$;

create function public.my_email_hash()
returns bytea
language sql
stable
security definer
set search_path = ''
as $$
  select public.org_email_hash(u.email)
  from auth.users u
  where u.id = (select auth.uid()) and u.email is not null and coalesce(u.is_anonymous, false) = false;
$$;

create function public.invite_org_member(p_org uuid, p_email text, p_role text default 'editor')
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_hash bytea;
begin
  if public.org_role(p_org) is distinct from 'admin' then perform public.cinet_fail('CN403', 'Solo un administrador de la organización invita personas.'); end if;
  if not public.org_is_verified(p_org) then
    perform public.cinet_fail('CN403', 'La organización debe estar verificada por CINET para sumar personas.');
  end if;
  if p_role is null or p_role not in ('admin', 'editor') then perform public.cinet_fail('CN422', 'Rol no válido.'); end if;
  -- Solo la forma: nunca se comprueba si la cuenta existe.
  if coalesce(btrim(p_email), '') !~ '^[^@\s]{1,64}@[^@\s]{1,255}\.[^@\s]{2,}$' or char_length(btrim(p_email)) > 254 then
    perform public.cinet_fail('CN422', 'Escribe un correo válido.');
  end if;
  perform pg_advisory_xact_lock(hashtextextended('cinet:org-invites:' || p_org::text, 0));
  if (select count(*) from public.org_invites where org_id = p_org and revoked_at is null and accepted_at is null and expires_at > now()) >= 20 then
    perform public.cinet_fail('CN429', 'Hay demasiadas invitaciones abiertas. Revoca alguna.');
  end if;
  if (select count(*) from public.org_invites where org_id = p_org and created_at > now() - interval '1 day') >= 50 then
    perform public.cinet_fail('CN429', 'Se alcanzó el máximo de invitaciones por hoy.');
  end if;
  v_hash := public.org_email_hash(p_email);
  update public.org_invites set revoked_at = now()
  where org_id = p_org and email_hash = v_hash and revoked_at is null and accepted_at is null;
  insert into public.org_invites (org_id, email_hash, role, invited_by, expires_at)
  values (p_org, v_hash, p_role, v_uid, now() + interval '7 days');
  insert into public.org_audit (org_id, actor, action, entity, entity_id, detail)
  values (p_org, v_uid, 'member_invited', 'org_invites', null, jsonb_build_object('role', p_role));
end;
$$;

create or replace function public.add_org_member(p_org uuid, p_email text, p_role text default 'editor')
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.invite_org_member(p_org, p_email, p_role);
  return null;
end;
$$;

create function public.list_my_org_invites()
returns table (id uuid, org_id uuid, org_name text, role text, expires_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select i.id, i.org_id, o.name, i.role, i.expires_at
  from public.org_invites i
  join public.organizations o on o.id = i.org_id
  where i.email_hash = public.my_email_hash()
    and i.revoked_at is null and i.accepted_at is null and i.expires_at > now()
    and o.status = 'verified'
  order by i.created_at desc
  limit 20;
$$;

create function public.accept_org_invite(p_invite uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_org uuid;
  v_invite public.org_invites;
begin
  if v_uid is null or public.is_guest() then perform public.cinet_fail('CN403', 'Inicia sesión con tu cuenta para aceptar.'); end if;
  select org_id into v_org from public.org_invites where id = p_invite;
  if v_org is null then perform public.cinet_fail('CN404', 'La invitación no existe o no es para ti.'); end if;
  perform 1 from public.organizations where id = v_org for share;
  select * into v_invite from public.org_invites where id = p_invite for update;
  if v_invite.email_hash is distinct from public.my_email_hash() then perform public.cinet_fail('CN404', 'La invitación no existe o no es para ti.'); end if;
  if v_invite.accepted_by = v_uid then return v_invite.org_id; end if;
  if v_invite.revoked_at is not null or v_invite.accepted_at is not null or v_invite.expires_at <= now() then
    perform public.cinet_fail('CN410', 'La invitación ya no está disponible.');
  end if;
  if not public.org_is_verified(v_invite.org_id) then perform public.cinet_fail('CN410', 'La organización no está activa.'); end if;
  insert into public.org_members (org_id, user_id, role) values (v_invite.org_id, v_uid, v_invite.role)
  on conflict (org_id, user_id) do nothing;
  update public.org_invites set accepted_at = now(), accepted_by = v_uid where id = p_invite;
  insert into public.org_audit (org_id, actor, action, entity, entity_id, detail)
  values (v_invite.org_id, v_uid, 'member_joined', 'org_members', null, jsonb_build_object('role', v_invite.role));
  return v_invite.org_id;
end;
$$;

create function public.decline_org_invite(p_invite uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.org_invites set revoked_at = now()
  where id = p_invite and email_hash = public.my_email_hash() and revoked_at is null and accepted_at is null;
end;
$$;

create function public.revoke_org_invite(p_invite uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org uuid;
begin
  select org_id into v_org from public.org_invites where id = p_invite;
  if v_org is null or public.org_role(v_org) is distinct from 'admin' then perform public.cinet_fail('CN404', 'No encontramos la invitación.'); end if;
  perform 1 from public.organizations where id = v_org for share;
  update public.org_invites set revoked_at = coalesce(revoked_at, now()) where id = p_invite and accepted_at is null;
end;
$$;

revoke execute on function
  public.org_email_hash(text), public.my_email_hash(), public.invite_org_member(uuid, text, text),
  public.list_my_org_invites(), public.accept_org_invite(uuid), public.decline_org_invite(uuid), public.revoke_org_invite(uuid)
from public, anon, authenticated;
grant execute on function
  public.invite_org_member(uuid, text, text), public.list_my_org_invites(), public.accept_org_invite(uuid),
  public.decline_org_invite(uuid), public.revoke_org_invite(uuid)
to authenticated;
