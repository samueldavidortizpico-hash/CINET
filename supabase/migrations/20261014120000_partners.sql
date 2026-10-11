-- =========================================================
-- Aliados (cines y organizadores) y su cartelera.
--   organizations · org_members · venues · listings · offers · org_audit · attribution_events
--
-- - Una organización se SOLICITA (pending). Un operador de CINET (profiles.role = 'admin') la verifica.
--   Verificar no es un convenio: solo habilita publicar.
-- - El aislamiento entre aliados es por organización (RLS con org_members), no por un rol global.
-- - Público: solo funciones/eventos de organizaciones verificadas, programados, futuros y vigentes.
--   Sin fuente no se afirma nada: cada función guarda fuente, responsable y última actualización.
-- - Ofertas: siempre «patrocinado» y fuera del ranking de recomendaciones.
-- - Ventas/comisiones: solo eventos que confirma el aliado por webhook firmado (servidor, service_role).
-- - Toda escritura en sedes, funciones y ofertas queda en org_audit (quién, qué y cuándo).
-- =========================================================

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 80),
  kind text not null check (kind in ('cinema', 'organizer')),
  official_url text not null check (official_url ~ '^https://[^\s/$.?#].[^\s]*$' and char_length(official_url) <= 300),
  status text not null default 'pending' check (status in ('pending', 'verified', 'suspended')),
  verified_at timestamptz,
  verified_by uuid references auth.users (id) on delete set null,
  created_by uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.org_members (
  org_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null default 'editor' check (role in ('admin', 'editor')),
  added_at timestamptz not null default now(),
  primary key (org_id, user_id)
);
create index org_members_user_idx on public.org_members (user_id);

create table public.venues (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  city text not null check (char_length(city) between 1 and 60),
  official_url text check (official_url is null or (official_url ~ '^https://' and char_length(official_url) <= 300)),
  created_at timestamptz not null default now()
);
create index venues_org_idx on public.venues (org_id);

create table public.listings (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  venue_id uuid not null references public.venues (id) on delete cascade,
  kind text not null default 'showtime' check (kind in ('showtime', 'event')),
  title_id text not null check (char_length(title_id) between 1 and 64),
  title jsonb not null check (jsonb_typeof(title) = 'object' and octet_length(title::text) <= 1000),
  starts_at timestamptz not null,
  time_zone text not null default 'America/Bogota',
  format text check (format is null or char_length(format) <= 20),
  language text check (language is null or char_length(language) <= 20),
  price_cop integer check (price_cop is null or price_cop between 0 and 1000000),
  official_url text not null check (official_url ~ '^https://' and char_length(official_url) <= 300),
  source text not null default 'manual' check (source in ('manual', 'partner_api')),
  status text not null default 'scheduled' check (status in ('scheduled', 'cancelled')),
  valid_until timestamptz not null,
  created_by uuid references auth.users (id) on delete set null,
  updated_at timestamptz not null default now(),
  check (valid_until <= starts_at + interval '1 day')
);
create index listings_title_idx on public.listings (title_id, starts_at);
create index listings_org_idx on public.listings (org_id);

create table public.offers (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  title_id text check (title_id is null or char_length(title_id) <= 64),
  headline text not null check (char_length(headline) between 3 and 80),
  body text not null default '' check (char_length(body) <= 200),
  url text not null check (url ~ '^https://' and char_length(url) <= 300),
  valid_until timestamptz not null,
  created_at timestamptz not null default now()
);
create index offers_org_idx on public.offers (org_id);

create table public.org_audit (
  id bigint generated always as identity primary key,
  org_id uuid not null references public.organizations (id) on delete cascade,
  actor uuid,
  action text not null,
  entity text not null,
  entity_id uuid,
  detail jsonb,
  at timestamptz not null default now()
);
create index org_audit_org_idx on public.org_audit (org_id, at desc);

create table public.attribution_events (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  external_id text not null check (char_length(external_id) between 1 and 100),
  kind text not null check (kind in ('sale_confirmed', 'sale_refunded')),
  refund_of text check (refund_of is null or char_length(refund_of) <= 100),
  plan_ref text check (plan_ref is null or char_length(plan_ref) <= 100),
  amount_cop integer not null check (amount_cop between 0 and 100000000),
  occurred_at timestamptz not null,
  received_at timestamptz not null default now(),
  unique (org_id, external_id) -- idempotencia: el mismo evento dos veces no cuenta dos veces
);

-- ---------- Ayudantes ----------

create function public.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin');
$$;

create function public.org_role(p_org uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select m.role from public.org_members m where m.org_id = p_org and m.user_id = (select auth.uid());
$$;

-- Puede publicar: miembro de una organización VERIFICADA.
create function public.can_publish(p_org uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.org_role(p_org) is not null
    and exists (select 1 from public.organizations o where o.id = p_org and o.status = 'verified');
$$;

create function public.org_is_verified(p_org uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.organizations o where o.id = p_org and o.status = 'verified');
$$;

-- ---------- RLS ----------

alter table public.organizations enable row level security;
alter table public.org_members enable row level security;
alter table public.venues enable row level security;
alter table public.listings enable row level security;
alter table public.offers enable row level security;
alter table public.org_audit enable row level security;
alter table public.attribution_events enable row level security;

create policy "Organizaciones: verificadas para todos; el resto para sus miembros y operadores"
  on public.organizations for select to anon, authenticated
  using (status = 'verified' or public.org_role(id) is not null or public.is_platform_admin());

create policy "Miembros de organización: la propia organización y operadores"
  on public.org_members for select to authenticated
  using (public.org_role(org_id) is not null or public.is_platform_admin());

create policy "Sedes: públicas si la organización está verificada"
  on public.venues for select to anon, authenticated
  using (public.org_is_verified(org_id) or public.org_role(org_id) is not null);
create policy "Sedes: las crea su organización verificada" on public.venues for insert to authenticated with check (public.can_publish(org_id));
create policy "Sedes: las edita su organización" on public.venues for update to authenticated using (public.can_publish(org_id)) with check (public.can_publish(org_id));
create policy "Sedes: las borra su organización" on public.venues for delete to authenticated using (public.can_publish(org_id));

-- Público: programadas, futuras y vigentes. La organización ve todo lo suyo (también vencido o cancelado).
create policy "Funciones: públicas solo si están vigentes"
  on public.listings for select to anon, authenticated
  using (
    (public.org_is_verified(org_id) and status = 'scheduled' and starts_at > now() and valid_until > now())
    or public.org_role(org_id) is not null
  );
create policy "Funciones: las crea su organización verificada"
  on public.listings for insert to authenticated
  with check (public.can_publish(org_id) and exists (select 1 from public.venues v where v.id = venue_id and v.org_id = listings.org_id));
create policy "Funciones: las edita su organización"
  on public.listings for update to authenticated
  using (public.can_publish(org_id))
  with check (public.can_publish(org_id) and exists (select 1 from public.venues v where v.id = venue_id and v.org_id = listings.org_id));
create policy "Funciones: las borra su organización" on public.listings for delete to authenticated using (public.can_publish(org_id));

create policy "Ofertas: públicas mientras estén vigentes"
  on public.offers for select to anon, authenticated
  using ((public.org_is_verified(org_id) and valid_until > now()) or public.org_role(org_id) is not null);
create policy "Ofertas: las crea su organización verificada" on public.offers for insert to authenticated with check (public.can_publish(org_id));
create policy "Ofertas: las borra su organización" on public.offers for delete to authenticated using (public.can_publish(org_id));

create policy "Auditoría: administradores de la organización y operadores"
  on public.org_audit for select to authenticated
  using (public.org_role(org_id) = 'admin' or public.is_platform_admin());

create policy "Atribución: administradores de la organización y operadores"
  on public.attribution_events for select to authenticated
  using (public.org_role(org_id) = 'admin' or public.is_platform_admin());

revoke all on table public.organizations, public.org_members, public.venues, public.listings, public.offers,
  public.org_audit, public.attribution_events from public, anon, authenticated;
grant select on table public.organizations, public.venues, public.listings, public.offers to anon, authenticated;
grant select on table public.org_members, public.org_audit, public.attribution_events to authenticated;
grant insert, update, delete on table public.venues, public.listings to authenticated;
grant insert, delete on table public.offers to authenticated;
-- Las ventas solo entran por el webhook del servidor (service_role); nadie las escribe desde la app.

-- ---------- Auditoría ----------

create function public.audit_org_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row jsonb := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
begin
  insert into public.org_audit (org_id, actor, action, entity, entity_id, detail)
  values ((v_row ->> 'org_id')::uuid, (select auth.uid()), lower(tg_op), tg_table_name, (v_row ->> 'id')::uuid,
          v_row - 'created_at' - 'updated_at');
  return null;
end;
$$;

-- Lo que cambia la organización se sella con quién y cuándo (no se puede falsear desde el cliente).
create function public.stamp_listing()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  new.source := 'manual';
  if tg_op = 'INSERT' then new.created_by := (select auth.uid()); else new.created_by := old.created_by; new.org_id := old.org_id; end if;
  return new;
end;
$$;

create trigger listings_stamp before insert or update on public.listings for each row execute function public.stamp_listing();
create trigger venues_audit after insert or update or delete on public.venues for each row execute function public.audit_org_change();
create trigger listings_audit after insert or update or delete on public.listings for each row execute function public.audit_org_change();
create trigger offers_audit after insert or update or delete on public.offers for each row execute function public.audit_org_change();

-- ---------- RPC ----------

create function public.request_organization(p_name text, p_kind text, p_official_url text)
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

create function public.verify_organization(p_org uuid, p_status text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_platform_admin() then perform public.cinet_fail('CN403', 'Solo un operador de CINET verifica aliados.'); end if;
  if p_status not in ('verified', 'suspended', 'pending') then perform public.cinet_fail('CN422', 'Estado no válido.'); end if;
  update public.organizations
  set status = p_status,
      verified_at = case when p_status = 'verified' then now() else verified_at end,
      verified_by = case when p_status = 'verified' then (select auth.uid()) else verified_by end
  where id = p_org;
  if not found then perform public.cinet_fail('CN404', 'No encontramos la organización.'); end if;
  insert into public.org_audit (org_id, actor, action, entity, entity_id, detail)
  values (p_org, (select auth.uid()), p_status, 'organizations', p_org, null);
end;
$$;

create function public.add_org_member(p_org uuid, p_email text, p_role text default 'editor')
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid;
begin
  if public.org_role(p_org) is distinct from 'admin' then perform public.cinet_fail('CN403', 'Solo un administrador de la organización suma personas.'); end if;
  if p_role not in ('admin', 'editor') then perform public.cinet_fail('CN422', 'Rol no válido.'); end if;
  select id into v_user from auth.users where lower(email) = lower(btrim(p_email)) and coalesce(is_anonymous, false) = false;
  if v_user is null then perform public.cinet_fail('CN404', 'No hay ninguna cuenta con ese correo.'); end if;
  insert into public.org_members (org_id, user_id, role) values (p_org, v_user, p_role)
  on conflict (org_id, user_id) do update set role = excluded.role;
  insert into public.org_audit (org_id, actor, action, entity, entity_id, detail)
  values (p_org, (select auth.uid()), 'member_added', 'org_members', null, jsonb_build_object('role', p_role));
  return v_user;
end;
$$;

create function public.remove_org_member(p_org uuid, p_user uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if public.org_role(p_org) is distinct from 'admin' then perform public.cinet_fail('CN403', 'Solo un administrador de la organización retira personas.'); end if;
  if p_user = (select auth.uid()) then perform public.cinet_fail('CN422', 'No puedes retirarte a ti.'); end if;
  delete from public.org_members where org_id = p_org and user_id = p_user;
  insert into public.org_audit (org_id, actor, action, entity, entity_id, detail)
  values (p_org, (select auth.uid()), 'member_removed', 'org_members', null, null);
end;
$$;

revoke execute on function
  public.is_platform_admin(), public.org_role(uuid), public.can_publish(uuid), public.org_is_verified(uuid),
  public.audit_org_change(), public.stamp_listing(),
  public.request_organization(text, text, text), public.verify_organization(uuid, text),
  public.add_org_member(uuid, text, text), public.remove_org_member(uuid, uuid)
from public, anon, authenticated;
grant execute on function public.org_role(uuid), public.can_publish(uuid), public.org_is_verified(uuid), public.is_platform_admin() to anon, authenticated;
grant execute on function
  public.request_organization(text, text, text), public.verify_organization(uuid, text),
  public.add_org_member(uuid, text, text), public.remove_org_member(uuid, uuid)
to authenticated;
