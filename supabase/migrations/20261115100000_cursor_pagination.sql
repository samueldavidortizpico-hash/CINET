-- Dev2: páginas de transferencia de 50 filas con desempate por identidad.
-- No modifica permisos de tablas ni políticas RLS existentes. Todas las consultas
-- ordinarias son SECURITY INVOKER; nunca aceptan tabla, orden o límite del cliente.
-- Para filas históricas de listings esta fecha es de incorporación a la paginación,
-- no una fecha original de creación que el esquema anterior no conservaba.
alter table public.listings add column created_at timestamptz not null default now();
-- Reparar solo posiciones históricas imposibles para el contrato JS, conservando
-- la representación original en una tabla privada de operación. No se borra contenido.
create table public.pagination_timestamp_repairs (
  table_name text not null,
  row_id uuid not null,
  original_created_at text not null,
  repaired_at timestamptz not null default now(),
  primary key (table_name, row_id)
);
alter table public.pagination_timestamp_repairs enable row level security;
revoke all on table public.pagination_timestamp_repairs from public, anon, authenticated;
grant select on table public.pagination_timestamp_repairs to service_role;
insert into public.pagination_timestamp_repairs(table_name,row_id,original_created_at)
select 'venues', id, created_at::text from public.venues
where not isfinite(created_at) or created_at < '0001-01-01T00:00:00Z'::timestamptz or created_at >= '10000-01-01T00:00:00Z'::timestamptz;
update public.venues set created_at = now()
where not isfinite(created_at) or created_at < '0001-01-01T00:00:00Z'::timestamptz or created_at >= '10000-01-01T00:00:00Z'::timestamptz;
insert into public.pagination_timestamp_repairs(table_name,row_id,original_created_at)
select 'listings', id, created_at::text from public.listings
where not isfinite(created_at) or created_at < '0001-01-01T00:00:00Z'::timestamptz or created_at >= '10000-01-01T00:00:00Z'::timestamptz;
update public.listings set created_at = now()
where not isfinite(created_at) or created_at < '0001-01-01T00:00:00Z'::timestamptz or created_at >= '10000-01-01T00:00:00Z'::timestamptz;
insert into public.pagination_timestamp_repairs(table_name,row_id,original_created_at)
select 'offers', id, created_at::text from public.offers
where not isfinite(created_at) or created_at < '0001-01-01T00:00:00Z'::timestamptz or created_at >= '10000-01-01T00:00:00Z'::timestamptz;
update public.offers set created_at = now()
where not isfinite(created_at) or created_at < '0001-01-01T00:00:00Z'::timestamptz or created_at >= '10000-01-01T00:00:00Z'::timestamptz;

-- Estos tres recursos aceptan escritura directa con RLS. Su posición de página
-- pertenece al servidor: no se acepta una fecha inventada ni una identidad mutable.
create function public.seal_publisher_page_position() returns trigger
language plpgsql set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    new.created_at := now();
  else
    if new.id is distinct from old.id then
      raise exception using errcode = 'CN422', message = 'La identidad no puede cambiar.';
    end if;
    new.created_at := old.created_at;
  end if;
  return new;
end;
$$;
revoke all on function public.seal_publisher_page_position() from public, anon, authenticated;
create trigger venues_page_position before insert or update on public.venues
for each row execute function public.seal_publisher_page_position();
create trigger listings_page_position before insert or update on public.listings
for each row execute function public.seal_publisher_page_position();
create trigger offers_page_position before insert or update on public.offers
for each row execute function public.seal_publisher_page_position();

-- Utilidad pura: recibe solo las 51 filas ya autorizadas de una consulta concreta.
create function public.cinet_page_envelope(p_rows jsonb) returns jsonb
language plpgsql immutable set search_path = '' as $$
begin
  if p_rows is null or jsonb_typeof(p_rows) <> 'array' then
    raise exception using errcode = 'CN422', message = 'Se espera una página.';
  end if;
  if jsonb_array_length(p_rows) > 51 then
    raise exception using errcode = 'CN422', message = 'La página excede el máximo.';
  end if;
  return (select jsonb_build_object(
    'items', coalesce(jsonb_agg(value - '__cursor' order by ord) filter (where ord <= 50), '[]'::jsonb),
    'nextCursor', case when jsonb_array_length(p_rows) > 50 then p_rows -> 49 -> '__cursor' else null end
  ) from jsonb_array_elements(p_rows) with ordinality as e(value, ord));
end;
$$;
revoke all on function public.cinet_page_envelope(jsonb) from public, anon, authenticated;
grant execute on function public.cinet_page_envelope(jsonb) to anon, authenticated, service_role;
create function public.list_plans_page(p_group uuid default null, p_cursor_at timestamptz default null, p_cursor_id uuid default null) returns jsonb
language plpgsql stable security invoker set search_path = '' as $$
begin
  if (p_cursor_at is null) <> (p_cursor_id is null) then
    raise exception using errcode = 'CN422', message = 'El cursor necesita fecha e identificador.';
  end if;
  if p_cursor_at is not null and (not isfinite(p_cursor_at) or p_cursor_at < '0001-01-01T00:00:00Z'::timestamptz or p_cursor_at >= '10000-01-01T00:00:00Z'::timestamptz) then
    raise exception using errcode = 'CN422', message = 'Fecha del cursor no válida.';
  end if;
  return (
    select public.cinet_page_envelope(coalesce(jsonb_agg(q.item order by q.key_at asc, q.key_id asc), '[]'::jsonb))
    from (
      select to_jsonb(t) || jsonb_build_object('plan_members', (select coalesce(jsonb_agg(jsonb_build_object('user_id', m.user_id, 'role', m.role, 'display_name', m.display_name, 'rsvp', m.rsvp, 'responded_at', m.responded_at) order by m.user_id), '[]'::jsonb) from public.plan_members m where m.plan_id = t.id)) || jsonb_build_object('__cursor', jsonb_build_object('createdAt', t.created_at, 'id', t.id::text)) as item,
             t.created_at as key_at, t.id as key_id
      from public.plans t
      where (p_group is null or t.group_id = p_group)
        and (p_cursor_at is null or (t.created_at, t.id) > (p_cursor_at, p_cursor_id))
      order by t.created_at asc, t.id asc limit 51
    ) q
  );
end;
$$;
revoke all on function public.list_plans_page(uuid, timestamptz, uuid) from public, anon, authenticated;
grant execute on function public.list_plans_page(uuid, timestamptz, uuid) to authenticated, service_role;

create function public.list_groups_page(p_cursor_at timestamptz default null, p_cursor_id uuid default null) returns jsonb
language plpgsql stable security invoker set search_path = '' as $$
begin
  if (p_cursor_at is null) <> (p_cursor_id is null) then
    raise exception using errcode = 'CN422', message = 'El cursor necesita fecha e identificador.';
  end if;
  if p_cursor_at is not null and (not isfinite(p_cursor_at) or p_cursor_at < '0001-01-01T00:00:00Z'::timestamptz or p_cursor_at >= '10000-01-01T00:00:00Z'::timestamptz) then
    raise exception using errcode = 'CN422', message = 'Fecha del cursor no válida.';
  end if;
  return (
    select public.cinet_page_envelope(coalesce(jsonb_agg(q.item order by q.key_at asc, q.key_id asc), '[]'::jsonb))
    from (
      select to_jsonb(t) || jsonb_build_object('group_members', (select coalesce(jsonb_agg(jsonb_build_object('user_id', m.user_id, 'role', m.role, 'display_name', m.display_name, 'joined_at', m.joined_at) order by m.user_id), '[]'::jsonb) from public.group_members m where m.group_id = t.id)) || jsonb_build_object('__cursor', jsonb_build_object('createdAt', t.created_at, 'id', t.id::text)) as item,
             t.created_at as key_at, t.id as key_id
      from public.groups t
      where true
        and (p_cursor_at is null or (t.created_at, t.id) > (p_cursor_at, p_cursor_id))
      order by t.created_at asc, t.id asc limit 51
    ) q
  );
end;
$$;
revoke all on function public.list_groups_page(timestamptz, uuid) from public, anon, authenticated;
grant execute on function public.list_groups_page(timestamptz, uuid) to authenticated, service_role;

create function public.list_plan_invites_page(p_plan uuid, p_cursor_at timestamptz default null, p_cursor_id uuid default null) returns jsonb
language plpgsql stable security invoker set search_path = '' as $$
begin
  if (p_cursor_at is null) <> (p_cursor_id is null) then
    raise exception using errcode = 'CN422', message = 'El cursor necesita fecha e identificador.';
  end if;
  if p_cursor_at is not null and (not isfinite(p_cursor_at) or p_cursor_at < '0001-01-01T00:00:00Z'::timestamptz or p_cursor_at >= '10000-01-01T00:00:00Z'::timestamptz) then
    raise exception using errcode = 'CN422', message = 'Fecha del cursor no válida.';
  end if;
  return (
    select public.cinet_page_envelope(coalesce(jsonb_agg(q.item order by q.key_at desc, q.key_id desc), '[]'::jsonb))
    from (
      select jsonb_build_object('id', t.id, 'created_at', t.created_at, 'expires_at', t.expires_at, 'revoked_at', t.revoked_at, 'uses', t.uses) || jsonb_build_object('__cursor', jsonb_build_object('createdAt', t.created_at, 'id', t.id::text)) as item,
             t.created_at as key_at, t.id as key_id
      from public.plan_invites t
      where t.plan_id = p_plan and t.revoked_at is null and t.expires_at > now()
        and (p_cursor_at is null or (t.created_at, t.id) < (p_cursor_at, p_cursor_id))
      order by t.created_at desc, t.id desc limit 51
    ) q
  );
end;
$$;
revoke all on function public.list_plan_invites_page(uuid, timestamptz, uuid) from public, anon, authenticated;
grant execute on function public.list_plan_invites_page(uuid, timestamptz, uuid) to authenticated, service_role;

create function public.list_group_invites_page(p_group uuid, p_cursor_at timestamptz default null, p_cursor_id uuid default null) returns jsonb
language plpgsql stable security invoker set search_path = '' as $$
begin
  if (p_cursor_at is null) <> (p_cursor_id is null) then
    raise exception using errcode = 'CN422', message = 'El cursor necesita fecha e identificador.';
  end if;
  if p_cursor_at is not null and (not isfinite(p_cursor_at) or p_cursor_at < '0001-01-01T00:00:00Z'::timestamptz or p_cursor_at >= '10000-01-01T00:00:00Z'::timestamptz) then
    raise exception using errcode = 'CN422', message = 'Fecha del cursor no válida.';
  end if;
  return (
    select public.cinet_page_envelope(coalesce(jsonb_agg(q.item order by q.key_at desc, q.key_id desc), '[]'::jsonb))
    from (
      select jsonb_build_object('id', t.id, 'created_at', t.created_at, 'expires_at', t.expires_at, 'revoked_at', t.revoked_at, 'uses', t.uses) || jsonb_build_object('__cursor', jsonb_build_object('createdAt', t.created_at, 'id', t.id::text)) as item,
             t.created_at as key_at, t.id as key_id
      from public.group_invites t
      where t.group_id = p_group and t.revoked_at is null and t.expires_at > now()
        and (p_cursor_at is null or (t.created_at, t.id) < (p_cursor_at, p_cursor_id))
      order by t.created_at desc, t.id desc limit 51
    ) q
  );
end;
$$;
revoke all on function public.list_group_invites_page(uuid, timestamptz, uuid) from public, anon, authenticated;
grant execute on function public.list_group_invites_page(uuid, timestamptz, uuid) to authenticated, service_role;

create function public.list_my_organizations_page(p_cursor_at timestamptz default null, p_cursor_id uuid default null) returns jsonb
language plpgsql stable security invoker set search_path = '' as $$
begin
  if (p_cursor_at is null) <> (p_cursor_id is null) then
    raise exception using errcode = 'CN422', message = 'El cursor necesita fecha e identificador.';
  end if;
  if p_cursor_at is not null and (not isfinite(p_cursor_at) or p_cursor_at < '0001-01-01T00:00:00Z'::timestamptz or p_cursor_at >= '10000-01-01T00:00:00Z'::timestamptz) then
    raise exception using errcode = 'CN422', message = 'Fecha del cursor no válida.';
  end if;
  return (
    select public.cinet_page_envelope(coalesce(jsonb_agg(q.item order by q.key_at asc, q.key_id asc), '[]'::jsonb))
    from (
      select to_jsonb(t) || jsonb_build_object('role', m.role) || jsonb_build_object('__cursor', jsonb_build_object('createdAt', t.created_at, 'id', t.id::text)) as item,
             t.created_at as key_at, t.id as key_id
      from public.organizations t join public.org_members m on m.org_id = t.id and m.user_id = (select auth.uid())
      where true
        and (p_cursor_at is null or (t.created_at, t.id) > (p_cursor_at, p_cursor_id))
      order by t.created_at asc, t.id asc limit 51
    ) q
  );
end;
$$;
revoke all on function public.list_my_organizations_page(timestamptz, uuid) from public, anon, authenticated;
grant execute on function public.list_my_organizations_page(timestamptz, uuid) to authenticated, service_role;

create function public.list_pending_organizations_page(p_cursor_at timestamptz default null, p_cursor_id uuid default null) returns jsonb
language plpgsql stable security invoker set search_path = '' as $$
begin
  if (p_cursor_at is null) <> (p_cursor_id is null) then
    raise exception using errcode = 'CN422', message = 'El cursor necesita fecha e identificador.';
  end if;
  if p_cursor_at is not null and (not isfinite(p_cursor_at) or p_cursor_at < '0001-01-01T00:00:00Z'::timestamptz or p_cursor_at >= '10000-01-01T00:00:00Z'::timestamptz) then
    raise exception using errcode = 'CN422', message = 'Fecha del cursor no válida.';
  end if;
  return (
    select public.cinet_page_envelope(coalesce(jsonb_agg(q.item order by q.key_at asc, q.key_id asc), '[]'::jsonb))
    from (
      select to_jsonb(t) || jsonb_build_object('__cursor', jsonb_build_object('createdAt', t.created_at, 'id', t.id::text)) as item,
             t.created_at as key_at, t.id as key_id
      from public.organizations t
      where t.status = 'pending' and public.is_platform_admin()
        and (p_cursor_at is null or (t.created_at, t.id) > (p_cursor_at, p_cursor_id))
      order by t.created_at asc, t.id asc limit 51
    ) q
  );
end;
$$;
revoke all on function public.list_pending_organizations_page(timestamptz, uuid) from public, anon, authenticated;
grant execute on function public.list_pending_organizations_page(timestamptz, uuid) to authenticated, service_role;

create function public.list_org_venues_page(p_org uuid, p_cursor_at timestamptz default null, p_cursor_id uuid default null) returns jsonb
language plpgsql stable security invoker set search_path = '' as $$
begin
  if (p_cursor_at is null) <> (p_cursor_id is null) then
    raise exception using errcode = 'CN422', message = 'El cursor necesita fecha e identificador.';
  end if;
  if p_cursor_at is not null and (not isfinite(p_cursor_at) or p_cursor_at < '0001-01-01T00:00:00Z'::timestamptz or p_cursor_at >= '10000-01-01T00:00:00Z'::timestamptz) then
    raise exception using errcode = 'CN422', message = 'Fecha del cursor no válida.';
  end if;
  return (
    select public.cinet_page_envelope(coalesce(jsonb_agg(q.item order by q.key_at asc, q.key_id asc), '[]'::jsonb))
    from (
      select to_jsonb(t) || jsonb_build_object('__cursor', jsonb_build_object('createdAt', t.created_at, 'id', t.id::text)) as item,
             t.created_at as key_at, t.id as key_id
      from public.venues t
      where t.org_id = p_org
        and (p_cursor_at is null or (t.created_at, t.id) > (p_cursor_at, p_cursor_id))
      order by t.created_at asc, t.id asc limit 51
    ) q
  );
end;
$$;
revoke all on function public.list_org_venues_page(uuid, timestamptz, uuid) from public, anon, authenticated;
grant execute on function public.list_org_venues_page(uuid, timestamptz, uuid) to authenticated, service_role;

create function public.list_org_listings_page(p_org uuid, p_cursor_at timestamptz default null, p_cursor_id uuid default null) returns jsonb
language plpgsql stable security invoker set search_path = '' as $$
begin
  if (p_cursor_at is null) <> (p_cursor_id is null) then
    raise exception using errcode = 'CN422', message = 'El cursor necesita fecha e identificador.';
  end if;
  if p_cursor_at is not null and (not isfinite(p_cursor_at) or p_cursor_at < '0001-01-01T00:00:00Z'::timestamptz or p_cursor_at >= '10000-01-01T00:00:00Z'::timestamptz) then
    raise exception using errcode = 'CN422', message = 'Fecha del cursor no válida.';
  end if;
  return (
    select public.cinet_page_envelope(coalesce(jsonb_agg(q.item order by q.key_at asc, q.key_id asc), '[]'::jsonb))
    from (
      select to_jsonb(t) || jsonb_build_object('__cursor', jsonb_build_object('createdAt', t.created_at, 'id', t.id::text)) as item,
             t.created_at as key_at, t.id as key_id
      from public.listings t
      where t.org_id = p_org
        and (p_cursor_at is null or (t.created_at, t.id) > (p_cursor_at, p_cursor_id))
      order by t.created_at asc, t.id asc limit 51
    ) q
  );
end;
$$;
revoke all on function public.list_org_listings_page(uuid, timestamptz, uuid) from public, anon, authenticated;
grant execute on function public.list_org_listings_page(uuid, timestamptz, uuid) to authenticated, service_role;

create function public.list_org_offers_page(p_org uuid, p_cursor_at timestamptz default null, p_cursor_id uuid default null) returns jsonb
language plpgsql stable security invoker set search_path = '' as $$
begin
  if (p_cursor_at is null) <> (p_cursor_id is null) then
    raise exception using errcode = 'CN422', message = 'El cursor necesita fecha e identificador.';
  end if;
  if p_cursor_at is not null and (not isfinite(p_cursor_at) or p_cursor_at < '0001-01-01T00:00:00Z'::timestamptz or p_cursor_at >= '10000-01-01T00:00:00Z'::timestamptz) then
    raise exception using errcode = 'CN422', message = 'Fecha del cursor no válida.';
  end if;
  return (
    select public.cinet_page_envelope(coalesce(jsonb_agg(q.item order by q.key_at asc, q.key_id asc), '[]'::jsonb))
    from (
      select to_jsonb(t) || jsonb_build_object('__cursor', jsonb_build_object('createdAt', t.created_at, 'id', t.id::text)) as item,
             t.created_at as key_at, t.id as key_id
      from public.offers t
      where t.org_id = p_org
        and (p_cursor_at is null or (t.created_at, t.id) > (p_cursor_at, p_cursor_id))
      order by t.created_at asc, t.id asc limit 51
    ) q
  );
end;
$$;
revoke all on function public.list_org_offers_page(uuid, timestamptz, uuid) from public, anon, authenticated;
grant execute on function public.list_org_offers_page(uuid, timestamptz, uuid) to authenticated, service_role;

create function public.list_org_members_page(p_org uuid, p_cursor_at timestamptz default null, p_cursor_id uuid default null) returns jsonb
language plpgsql stable security invoker set search_path = '' as $$
begin
  if (p_cursor_at is null) <> (p_cursor_id is null) then
    raise exception using errcode = 'CN422', message = 'El cursor necesita fecha e identificador.';
  end if;
  if p_cursor_at is not null and (not isfinite(p_cursor_at) or p_cursor_at < '0001-01-01T00:00:00Z'::timestamptz or p_cursor_at >= '10000-01-01T00:00:00Z'::timestamptz) then
    raise exception using errcode = 'CN422', message = 'Fecha del cursor no válida.';
  end if;
  return (
    select public.cinet_page_envelope(coalesce(jsonb_agg(q.item order by q.key_at asc, q.key_id asc), '[]'::jsonb))
    from (
      select to_jsonb(t) || jsonb_build_object('__cursor', jsonb_build_object('createdAt', t.added_at, 'id', t.user_id::text)) as item,
             t.added_at as key_at, t.user_id as key_id
      from public.org_members t
      where t.org_id = p_org
        and (p_cursor_at is null or (t.added_at, t.user_id) > (p_cursor_at, p_cursor_id))
      order by t.added_at asc, t.user_id asc limit 51
    ) q
  );
end;
$$;
revoke all on function public.list_org_members_page(uuid, timestamptz, uuid) from public, anon, authenticated;
grant execute on function public.list_org_members_page(uuid, timestamptz, uuid) to authenticated, service_role;

create function public.list_org_audit_page(p_org uuid, p_cursor_at timestamptz default null, p_cursor_id bigint default null) returns jsonb
language plpgsql stable security invoker set search_path = '' as $$
begin
  if (p_cursor_at is null) <> (p_cursor_id is null) then
    raise exception using errcode = 'CN422', message = 'El cursor necesita fecha e identificador.';
  end if;
  if p_cursor_at is not null and (not isfinite(p_cursor_at) or p_cursor_at < '0001-01-01T00:00:00Z'::timestamptz or p_cursor_at >= '10000-01-01T00:00:00Z'::timestamptz) then
    raise exception using errcode = 'CN422', message = 'Fecha del cursor no válida.';
  end if;
  return (
    select public.cinet_page_envelope(coalesce(jsonb_agg(q.item order by q.key_at desc, q.key_id desc), '[]'::jsonb))
    from (
      select to_jsonb(t) || jsonb_build_object('id', t.id::text) || jsonb_build_object('__cursor', jsonb_build_object('createdAt', t.at, 'id', t.id::text)) as item,
             t.at as key_at, t.id as key_id
      from public.org_audit t
      where t.org_id = p_org
        and (p_cursor_at is null or (t.at, t.id) < (p_cursor_at, p_cursor_id))
      order by t.at desc, t.id desc limit 51
    ) q
  );
end;
$$;
revoke all on function public.list_org_audit_page(uuid, timestamptz, bigint) from public, anon, authenticated;
grant execute on function public.list_org_audit_page(uuid, timestamptz, bigint) to authenticated, service_role;

create function public.list_my_org_invites_page(p_cursor_at timestamptz default null, p_cursor_id uuid default null) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  if (p_cursor_at is null) <> (p_cursor_id is null) then
    raise exception using errcode = 'CN422', message = 'El cursor necesita fecha e identificador.';
  end if;
  if p_cursor_at is not null and (not isfinite(p_cursor_at) or p_cursor_at < '0001-01-01T00:00:00Z'::timestamptz or p_cursor_at >= '10000-01-01T00:00:00Z'::timestamptz) then
    raise exception using errcode = 'CN422', message = 'Fecha del cursor no válida.';
  end if;
  return (
    select public.cinet_page_envelope(coalesce(jsonb_agg(q.item order by q.key_at desc, q.key_id desc), '[]'::jsonb))
    from (
      select jsonb_build_object('id', t.id, 'org_id', t.org_id, 'org_name', o.name, 'role', t.role, 'expires_at', t.expires_at) || jsonb_build_object('__cursor', jsonb_build_object('createdAt', t.created_at, 'id', t.id::text)) as item,
             t.created_at as key_at, t.id as key_id
      from public.org_invites t join public.organizations o on o.id = t.org_id
      where t.email_hash = public.my_email_hash() and t.revoked_at is null and t.accepted_at is null and t.expires_at > now() and o.status = 'verified'
        and (p_cursor_at is null or (t.created_at, t.id) < (p_cursor_at, p_cursor_id))
      order by t.created_at desc, t.id desc limit 51
    ) q
  );
end;
$$;
revoke all on function public.list_my_org_invites_page(timestamptz, uuid) from public, anon, authenticated;
grant execute on function public.list_my_org_invites_page(timestamptz, uuid) to authenticated, service_role;

create function public.list_title_listings_page(p_title text, p_cursor_at timestamptz default null, p_cursor_id uuid default null) returns jsonb
language plpgsql stable security invoker set search_path = '' as $$
begin
  if p_title is null or char_length(p_title) not between 1 and 64 then
    raise exception using errcode = 'CN422', message = 'Título no válido.';
  end if;
  if (p_cursor_at is null) <> (p_cursor_id is null) then
    raise exception using errcode = 'CN422', message = 'El cursor necesita fecha e identificador.';
  end if;
  if p_cursor_at is not null and (not isfinite(p_cursor_at) or p_cursor_at < '0001-01-01T00:00:00Z'::timestamptz or p_cursor_at >= '10000-01-01T00:00:00Z'::timestamptz) then
    raise exception using errcode = 'CN422', message = 'Fecha del cursor no válida.';
  end if;
  return (
    select public.cinet_page_envelope(coalesce(jsonb_agg(q.item order by q.key_at asc, q.key_id asc), '[]'::jsonb))
    from (
      select to_jsonb(t) || jsonb_build_object('__cursor', jsonb_build_object('createdAt', t.created_at, 'id', t.id::text)) as item,
             t.created_at as key_at, t.id as key_id
      from public.listings t
      where t.title_id = p_title
        and (p_cursor_at is null or (t.created_at, t.id) > (p_cursor_at, p_cursor_id))
      order by t.created_at asc, t.id asc limit 51
    ) q
  );
end;
$$;
revoke all on function public.list_title_listings_page(text, timestamptz, uuid) from public, anon, authenticated;
grant execute on function public.list_title_listings_page(text, timestamptz, uuid) to anon, authenticated, service_role;

create function public.list_title_offers_page(p_title text, p_cursor_at timestamptz default null, p_cursor_id uuid default null) returns jsonb
language plpgsql stable security invoker set search_path = '' as $$
begin
  if p_title is null or char_length(p_title) not between 1 and 64 then
    raise exception using errcode = 'CN422', message = 'Título no válido.';
  end if;
  if (p_cursor_at is null) <> (p_cursor_id is null) then
    raise exception using errcode = 'CN422', message = 'El cursor necesita fecha e identificador.';
  end if;
  if p_cursor_at is not null and (not isfinite(p_cursor_at) or p_cursor_at < '0001-01-01T00:00:00Z'::timestamptz or p_cursor_at >= '10000-01-01T00:00:00Z'::timestamptz) then
    raise exception using errcode = 'CN422', message = 'Fecha del cursor no válida.';
  end if;
  return (
    select public.cinet_page_envelope(coalesce(jsonb_agg(q.item order by q.key_at asc, q.key_id asc), '[]'::jsonb))
    from (
      select to_jsonb(t) || jsonb_build_object('__cursor', jsonb_build_object('createdAt', t.created_at, 'id', t.id::text)) as item,
             t.created_at as key_at, t.id as key_id
      from public.offers t
      where t.title_id = p_title
        and (p_cursor_at is null or (t.created_at, t.id) > (p_cursor_at, p_cursor_id))
      order by t.created_at asc, t.id asc limit 51
    ) q
  );
end;
$$;
revoke all on function public.list_title_offers_page(text, timestamptz, uuid) from public, anon, authenticated;
grant execute on function public.list_title_offers_page(text, timestamptz, uuid) to anon, authenticated, service_role;
