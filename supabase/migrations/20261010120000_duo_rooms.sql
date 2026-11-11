-- =========================================================
-- Salas de Duo: cada persona vota desde su teléfono.
--   duo_rooms · room_members · room_preferences · room_rounds · round_votes
--
-- Fases de la sala:
--   lobby     cada persona guarda sus gustos (la baraja aún no existe)
--   voting    ronda abierta: baraja y participantes CONGELADOS; quien entra tarde vota en la siguiente
--   revealed  el servidor cerró la ronda y guardó el resultado (conteos, ganador o "sin coincidencia")
--   chosen    el anfitrión eligió un título (de ahí se crea un plan)
--   closed    cerrada por el anfitrión; también se trata como cerrada al pasar expires_at
--
-- Privacidad:
--   - Cada persona lee SOLO sus votos y sus gustos (RLS). El resultado lo calcula el servidor al cerrar.
--   - El anfitrión recibe los gustos de la sala SIN nombres ni ids y en orden aleatorio, para calcular la
--     baraja con el motor de Duo (en una sala de 2 personas se deduce el de la otra: se avisa en la interfaz).
--   - Realtime solo publica duo_rooms y room_rounds: los cambios de miembros "tocan" la sala. Los votos y
--     los gustos no se publican nunca. (Los DELETE de Realtime no pasan por RLS: por eso tampoco se publica
--     plan_members, ver al final.)
--
-- Escrituras solo por RPC (security definer) con comprobaciones explícitas. Errores: los mismos CN4xx.
-- =========================================================

create table public.duo_rooms (
  id uuid primary key default gen_random_uuid(),
  -- 6 caracteres sin 0/O/1/I: ~1.070 millones de códigos; los intentos fallidos están limitados por persona.
  code text not null unique check (code ~ '^[A-HJ-NP-Z2-9]{6}$'),
  host_id uuid not null references auth.users (id) on delete cascade,
  mode text not null default 'movie' check (mode in ('movie', 'tv')),
  region text not null default 'CO' check (region ~ '^[A-Z]{2}$'),
  status text not null default 'lobby' check (status in ('lobby', 'voting', 'revealed', 'chosen', 'closed')),
  chosen jsonb check (chosen is null or (jsonb_typeof(chosen) = 'object' and octet_length(chosen::text) <= 1000)),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '1 day',
  updated_at timestamptz not null default now()
);
create index duo_rooms_host_idx on public.duo_rooms (host_id);

create table public.room_members (
  room_id uuid not null references public.duo_rooms (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null default 'member' check (role in ('host', 'member')),
  -- Butaca 1..8: el máximo de Duo. La asigna el servidor con la sala bloqueada.
  seat smallint not null check (seat between 1 and 8),
  display_name text not null check (char_length(display_name) between 1 and 40),
  ready boolean not null default false, -- ya guardó sus gustos (sin revelar cuáles)
  votes_cast smallint not null default 0, -- progreso en la ronda abierta (cuántos, nunca qué)
  joined_at timestamptz not null default now(),
  primary key (room_id, user_id),
  unique (room_id, seat)
);
create index room_members_user_idx on public.room_members (user_id);

create table public.room_preferences (
  room_id uuid not null,
  user_id uuid not null,
  -- { genres, mustGenres, rejectedGenres, maxRuntime }: solo lo necesario para la sesión, nunca historial.
  prefs jsonb not null check (jsonb_typeof(prefs) = 'object' and octet_length(prefs::text) <= 2000),
  updated_at timestamptz not null default now(),
  primary key (room_id, user_id),
  foreign key (room_id, user_id) references public.room_members (room_id, user_id) on delete cascade
);

create table public.room_rounds (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.duo_rooms (id) on delete cascade,
  number integer not null check (number >= 1),
  status text not null default 'open' check (status in ('open', 'closed')),
  -- Baraja congelada: [{ id, title, year, image, type }] en el orden del motor (desempata el resultado).
  candidates jsonb not null check (
    jsonb_typeof(candidates) = 'array' and jsonb_array_length(candidates) between 2 and 12 and octet_length(candidates::text) <= 8000
  ),
  participants uuid[] not null, -- congelados al abrir; quien sale o es retirado deja de contar
  result jsonb,
  created_at timestamptz not null default now(),
  closed_at timestamptz,
  unique (room_id, number)
);

create table public.round_votes (
  round_id uuid not null references public.room_rounds (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  candidate_id text not null,
  -- veto: «esta no, de ninguna manera». Uno por persona y ronda; un título vetado no puede ganar.
  vote text not null check (vote in ('yes', 'maybe', 'no', 'veto')),
  voted_at timestamptz not null default now(),
  primary key (round_id, user_id, candidate_id) -- un voto por persona/título/ronda; reintentar lo reemplaza
);
create unique index round_votes_one_veto on public.round_votes (round_id, user_id) where vote = 'veto';

-- Intentos de unirse con un código inexistente: frena la enumeración de salas.
create table public.room_join_failures (
  user_id uuid not null references auth.users (id) on delete cascade,
  failed_at timestamptz not null default now()
);
create index room_join_failures_idx on public.room_join_failures (user_id, failed_at);

-- ---------- Ayudantes ----------

create function public.is_room_member(p_room uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.room_members m where m.room_id = p_room and m.user_id = (select auth.uid())
  );
$$;

-- Código aleatorio fuerte (bytes de gen_random_uuid; 256 es múltiplo de 32: sin sesgo).
create function public.new_room_code()
returns text
language sql
volatile
set search_path = ''
as $$
  select string_agg(substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 1 + get_byte(r.b, i) % 32, 1), '' order by i)
  from (select uuid_send(gen_random_uuid()) as b) r, generate_series(0, 5) as i;
$$;

-- Bloquea la sala y comprueba miembro, vigencia y (si se pide) anfitrión.
create function public.room_locked(p_room uuid, p_host boolean default false)
returns public.duo_rooms
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_room public.duo_rooms;
begin
  if v_uid is null then perform public.cinet_fail('CN403', 'Inicia sesión para usar la sala.'); end if;
  select * into v_room from public.duo_rooms where id = p_room for update;
  if not found or not exists (select 1 from public.room_members where room_id = p_room and user_id = v_uid) then
    perform public.cinet_fail('CN404', 'No encontramos la sala.');
  end if;
  if v_room.status = 'closed' or v_room.expires_at <= now() then
    perform public.cinet_fail('CN410', 'La sala ya cerró.');
  end if;
  if p_host and v_room.host_id <> v_uid then
    perform public.cinet_fail('CN403', 'Solo quien abrió la sala puede hacerlo.');
  end if;
  return v_room;
end;
$$;

-- Cierra la ronda y guarda el resultado canónico. Idempotente: si ya cerró devuelve el mismo resultado.
--   match = todas las personas participantes dijeron «Sí» (si hay varias, gana la primera de la baraja)
--   top   = no hubo coincidencia total: la de más puntos (Sí = 2, Quizá = 1), luego menos «No», luego baraja
--   none  = nadie dio puntos a ninguna. «Más votada» no es unanimidad: el resultado lo dice tal cual.
--   Un título vetado nunca gana (se marca vetoed, sin decir quién). Si todos quedan vetados: none + all_vetoed;
--   no se recupera un vetado para rellenar.
create function public.finish_room_round(p_round uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_round public.room_rounds;
  v_n integer;
  v_tallies jsonb;
  v_best record;
  v_outcome text;
  v_result jsonb;
begin
  select * into v_round from public.room_rounds where id = p_round for update;
  if v_round.status = 'closed' then return v_round.result; end if;
  v_n := coalesce(cardinality(v_round.participants), 0);

  select jsonb_agg(jsonb_build_object('id', t.id, 'yes', t.yes_count, 'maybe', t.maybe_count, 'no', t.no_count, 'vetoed', t.veto_count > 0) order by t.pos)
  into v_tallies
  from (
    select c.value ->> 'id' as id, c.pos,
      count(v.vote) filter (where v.vote = 'yes') as yes_count,
      count(v.vote) filter (where v.vote = 'maybe') as maybe_count,
      count(v.vote) filter (where v.vote = 'no') as no_count,
      count(v.vote) filter (where v.vote = 'veto') as veto_count
    from jsonb_array_elements(v_round.candidates) with ordinality as c (value, pos)
    left join public.round_votes v
      on v.round_id = p_round and v.candidate_id = c.value ->> 'id' and v.user_id = any (v_round.participants)
    group by c.value ->> 'id', c.pos
  ) t;

  select x.t ->> 'id' as id, (x.t ->> 'yes')::int as yes_count, (x.t ->> 'maybe')::int as maybe_count
  into v_best
  from jsonb_array_elements(v_tallies) with ordinality as x (t, pos)
  where not (x.t ->> 'vetoed')::boolean
  order by (v_n > 0 and (x.t ->> 'yes')::int = v_n) desc,
    2 * (x.t ->> 'yes')::int + (x.t ->> 'maybe')::int desc,
    (x.t ->> 'no')::int asc,
    x.pos asc
  limit 1;

  if v_best.id is null then v_outcome := 'none'; -- todos vetados
  elsif v_n > 0 and v_best.yes_count = v_n then v_outcome := 'match';
  elsif 2 * v_best.yes_count + v_best.maybe_count > 0 then v_outcome := 'top';
  else v_outcome := 'none';
  end if;

  v_result := jsonb_build_object(
    'outcome', v_outcome,
    'winner', case when v_outcome = 'none' then null else v_best.id end,
    'participants', v_n,
    'all_vetoed', v_best.id is null,
    'tallies', coalesce(v_tallies, '[]'::jsonb)
  );
  update public.room_rounds set status = 'closed', result = v_result, closed_at = now() where id = p_round;
  update public.duo_rooms set status = 'revealed', updated_at = now() where id = v_round.room_id and status = 'voting';
  return v_result;
end;
$$;

-- Quien sale o es retirado: se borran sus votos de la ronda abierta y deja de contar como participante.
create function public.drop_room_member(p_room uuid, p_user uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_round uuid;
begin
  select id into v_round from public.room_rounds where room_id = p_room and status = 'open' for update;
  if v_round is not null then
    delete from public.round_votes where round_id = v_round and user_id = p_user;
    update public.room_rounds set participants = array_remove(participants, p_user) where id = v_round;
  end if;
  delete from public.room_members where room_id = p_room and user_id = p_user;
  if v_round is not null then perform public.finish_round_if_complete(v_round); end if;
end;
$$;

create function public.finish_round_if_complete(p_round uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_round public.room_rounds;
begin
  select * into v_round from public.room_rounds where id = p_round;
  if v_round.status <> 'open' or cardinality(v_round.participants) = 0 then return false; end if;
  if exists (
    select 1 from unnest(v_round.participants) as p (uid)
    where (select count(*) from public.round_votes rv where rv.round_id = p_round and rv.user_id = p.uid)
      < jsonb_array_length(v_round.candidates)
  ) then
    return false;
  end if;
  perform public.finish_room_round(p_round);
  return true;
end;
$$;

-- Cambios de miembros, gustos listos y progreso "tocan" la sala: Realtime avisa sin publicar filas privadas.
create function public.touch_room()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.duo_rooms set updated_at = now()
  where id = case when tg_op = 'DELETE' then old.room_id else new.room_id end;
  return null;
end;
$$;

create trigger room_members_touch
  after insert or update or delete on public.room_members
  for each row execute function public.touch_room();

-- ---------- RLS: solo lectura; votos y gustos, solo los propios ----------

alter table public.duo_rooms enable row level security;
alter table public.room_members enable row level security;
alter table public.room_preferences enable row level security;
alter table public.room_rounds enable row level security;
alter table public.round_votes enable row level security;
alter table public.room_join_failures enable row level security;

create policy "Salas: las ven sus miembros"
  on public.duo_rooms for select to authenticated
  using (public.is_room_member(id));

create policy "Miembros de sala: los ven los miembros"
  on public.room_members for select to authenticated
  using (public.is_room_member(room_id));

create policy "Gustos de sala: solo los propios"
  on public.room_preferences for select to authenticated
  using (user_id = (select auth.uid()));

create policy "Rondas: las ven los miembros"
  on public.room_rounds for select to authenticated
  using (public.is_room_member(room_id));

create policy "Votos: solo los propios"
  on public.round_votes for select to authenticated
  using (user_id = (select auth.uid()));

revoke all on table public.duo_rooms, public.room_members, public.room_preferences, public.room_rounds,
  public.round_votes, public.room_join_failures from public, anon, authenticated;
grant select on table public.duo_rooms, public.room_members, public.room_preferences, public.room_rounds,
  public.round_votes to authenticated;

-- ---------- RPC ----------

-- Abre una sala. Solo cuentas permanentes (un invitado anónimo puede unirse y votar, no abrir salas).
create function public.create_duo_room(p_display_name text, p_mode text default 'movie', p_region text default 'CO')
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
  if (select count(*) from public.duo_rooms r where r.host_id = v_uid and r.status <> 'closed' and r.expires_at > now()) >= 5 then
    perform public.cinet_fail('CN429', 'Ya tienes 5 salas abiertas. Cierra alguna para abrir otra.');
  end if;
  for attempt in 1..5 loop
    begin
      v_code := public.new_room_code();
      insert into public.duo_rooms (code, host_id, mode, region) values (v_code, v_uid, p_mode, p_region) returning duo_rooms.id into v_id;
      exit;
    exception when unique_violation then
      v_id := null; -- código repetido: se intenta con otro
    end;
  end loop;
  if v_id is null then perform public.cinet_fail('CN429', 'No pudimos generar un código. Inténtalo de nuevo.'); end if;
  insert into public.room_members (room_id, user_id, role, seat, display_name)
  values (v_id, v_uid, 'host', 1, public.clean_display_name(p_display_name));
  return query select v_id, v_code;
end;
$$;

-- Unirse con el código. Devuelve null si el código no existe (y cuenta el intento: más de 10 fallos en
-- 10 minutos bloquean). Idempotente para quien ya es miembro. Plaza y butaca se deciden con la sala bloqueada.
create function public.join_duo_room(p_code text, p_display_name text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_code text := upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g'));
  v_room public.duo_rooms;
  v_seat smallint;
begin
  if v_uid is null then perform public.cinet_fail('CN403', 'Inicia sesión o entra como invitado para unirte.'); end if;
  if (select count(*) from public.room_join_failures f where f.user_id = v_uid and f.failed_at > now() - interval '10 minutes') >= 10 then
    perform public.cinet_fail('CN429', 'Demasiados códigos incorrectos. Espera unos minutos.');
  end if;
  select * into v_room from public.duo_rooms where code = v_code for update;
  if not found then
    insert into public.room_join_failures (user_id) values (v_uid);
    return null;
  end if;
  if exists (select 1 from public.room_members where room_id = v_room.id and user_id = v_uid) then
    return v_room.id;
  end if;
  if v_room.status = 'closed' or v_room.expires_at <= now() then
    perform public.cinet_fail('CN410', 'Esa sala ya cerró.');
  end if;
  select min(s)::smallint into v_seat from generate_series(1, 8) as s
  where s not in (select seat from public.room_members where room_id = v_room.id);
  if v_seat is null then perform public.cinet_fail('CN429', 'La sala está llena (8 personas).'); end if;
  insert into public.room_members (room_id, user_id, role, seat, display_name)
  values (v_room.id, v_uid, 'member', v_seat, public.clean_display_name(p_display_name));
  return v_room.id;
end;
$$;

-- Gustos de esta sesión: se validan y se guardan solo las claves conocidas.
create function public.set_room_preferences(p_room uuid, p_prefs jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_clean jsonb := '{}'::jsonb;
  v_list jsonb;
  v_key text;
  v_runtime jsonb;
begin
  perform public.room_locked(p_room);
  if jsonb_typeof(p_prefs) <> 'object' then perform public.cinet_fail('CN422', 'Gustos no válidos.'); end if;
  foreach v_key in array array['genres', 'mustGenres', 'rejectedGenres'] loop
    v_list := coalesce(p_prefs -> v_key, '[]'::jsonb);
    if jsonb_typeof(v_list) <> 'array' or jsonb_array_length(v_list) > 20 or exists (
      select 1 from jsonb_array_elements(v_list) as e (value)
      where jsonb_typeof(e.value) <> 'string' or (e.value #>> '{}') !~ '^[a-z][a-z-]{0,29}$'
    ) then
      perform public.cinet_fail('CN422', 'Gustos no válidos.');
    end if;
    v_clean := v_clean || jsonb_build_object(v_key, v_list);
  end loop;
  v_runtime := coalesce(p_prefs -> 'maxRuntime', '0'::jsonb);
  if jsonb_typeof(v_runtime) <> 'number' or (v_runtime #>> '{}')::numeric not between 0 and 400
     or (v_runtime #>> '{}')::numeric <> trunc((v_runtime #>> '{}')::numeric) then
    perform public.cinet_fail('CN422', 'Duración máxima no válida.');
  end if;
  v_clean := v_clean || jsonb_build_object('maxRuntime', v_runtime);
  insert into public.room_preferences (room_id, user_id, prefs) values (p_room, v_uid, v_clean)
  on conflict (room_id, user_id) do update set prefs = excluded.prefs, updated_at = now();
  update public.room_members set ready = true where room_id = p_room and user_id = v_uid and not ready;
end;
$$;

-- Para el anfitrión: gustos de quienes están listos, sin nombres ni ids y en orden aleatorio.
create function public.room_deck_preferences(p_room uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.room_locked(p_room, true);
  return coalesce((
    select jsonb_agg(p.prefs order by random())
    from public.room_preferences p
    join public.room_members m on m.room_id = p.room_id and m.user_id = p.user_id
    where p.room_id = p_room
  ), '[]'::jsonb);
end;
$$;

-- Fija la baraja y abre la votación. Participan los miembros de ese momento.
create function public.start_room_round(p_room uuid, p_candidates jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_room public.duo_rooms;
  v_clean jsonb;
  v_id uuid;
begin
  v_room := public.room_locked(p_room, true);
  if v_room.status = 'voting' then perform public.cinet_fail('CN409', 'Ya hay una ronda abierta.'); end if;
  if jsonb_typeof(p_candidates) <> 'array' or jsonb_array_length(p_candidates) not between 2 and 12 then
    perform public.cinet_fail('CN422', 'La baraja debe tener entre 2 y 12 títulos.');
  end if;
  if exists (
    select 1 from jsonb_array_elements(p_candidates) as c (value)
    where jsonb_typeof(c.value) <> 'object'
      or coalesce(c.value ->> 'id', '') !~ '^[A-Za-z0-9_.:-]{1,64}$'
      or char_length(coalesce(c.value ->> 'title', '')) not between 1 and 200
      or coalesce(c.value ->> 'type', 'movie') not in ('movie', 'tv')
      or char_length(coalesce(c.value ->> 'image', '')) > 300
      or coalesce(c.value ->> 'image', '') !~ '^(|/[^/].*|https://.*)$'
  ) or (select count(distinct c.value ->> 'id') from jsonb_array_elements(p_candidates) as c (value)) <> jsonb_array_length(p_candidates) then
    perform public.cinet_fail('CN422', 'Baraja no válida.');
  end if;
  select jsonb_agg(jsonb_build_object(
      'id', c.value ->> 'id',
      'title', c.value ->> 'title',
      'year', left(coalesce(c.value ->> 'year', ''), 4),
      'image', coalesce(c.value ->> 'image', ''),
      'type', coalesce(c.value ->> 'type', 'movie')
    ) order by c.pos)
  into v_clean
  from jsonb_array_elements(p_candidates) with ordinality as c (value, pos);

  insert into public.room_rounds (room_id, number, candidates, participants)
  values (
    p_room,
    coalesce((select max(number) from public.room_rounds where room_id = p_room), 0) + 1,
    v_clean,
    array(select user_id from public.room_members where room_id = p_room order by seat)
  )
  returning id into v_id;
  update public.room_members set votes_cast = 0 where room_id = p_room and votes_cast <> 0;
  update public.duo_rooms set status = 'voting', updated_at = now() where id = p_room;
  return v_id;
end;
$$;

-- Votar (o cambiar el voto) en la ronda abierta. Cuando todas las personas votaron todo, el servidor cierra.
create function public.cast_room_vote(p_round uuid, p_candidate text, p_vote text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_round public.room_rounds;
begin
  select * into v_round from public.room_rounds where id = p_round;
  if not found then perform public.cinet_fail('CN404', 'No encontramos la ronda.'); end if;
  perform public.room_locked(v_round.room_id); -- bloquea la sala: votos y cierre en serie
  select * into v_round from public.room_rounds where id = p_round;
  if v_round.status <> 'open' then perform public.cinet_fail('CN410', 'La ronda ya cerró.'); end if;
  if not (v_uid = any (v_round.participants)) then
    perform public.cinet_fail('CN403', 'Entraste con la ronda empezada: votas en la siguiente.');
  end if;
  if p_vote not in ('yes', 'maybe', 'no', 'veto') or not exists (
    select 1 from jsonb_array_elements(v_round.candidates) as c (value) where c.value ->> 'id' = p_candidate
  ) then
    perform public.cinet_fail('CN422', 'Voto no válido.');
  end if;
  if p_vote = 'veto' and exists (
    select 1 from public.round_votes where round_id = p_round and user_id = v_uid and vote = 'veto' and candidate_id <> p_candidate
  ) then
    perform public.cinet_fail('CN409', 'Ya usaste tu veto en esta ronda. Cambia ese voto para vetar otro título.');
  end if;
  insert into public.round_votes (round_id, user_id, candidate_id, vote) values (p_round, v_uid, p_candidate, p_vote)
  on conflict (round_id, user_id, candidate_id) do update set vote = excluded.vote, voted_at = now();
  update public.room_members
  set votes_cast = (select count(*) from public.round_votes where round_id = p_round and user_id = v_uid)
  where room_id = v_round.room_id and user_id = v_uid;
  return case when public.finish_round_if_complete(p_round) then 'closed' else 'open' end;
end;
$$;

-- El anfitrión cierra con los votos que haya (abandono o plazo). Cerrar dos veces da el mismo resultado.
create function public.close_room_round(p_round uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_room uuid;
begin
  select room_id into v_room from public.room_rounds where id = p_round;
  if v_room is null then perform public.cinet_fail('CN404', 'No encontramos la ronda.'); end if;
  perform public.room_locked(v_room, true);
  return public.finish_room_round(p_round);
end;
$$;

-- El anfitrión elige uno de los títulos de la última ronda cerrada.
create function public.choose_room_title(p_room uuid, p_candidate text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_room public.duo_rooms;
  v_title jsonb;
begin
  v_room := public.room_locked(p_room, true);
  if v_room.status not in ('revealed', 'chosen') then perform public.cinet_fail('CN409', 'Primero cierren la ronda.'); end if;
  select c.value into v_title
  from public.room_rounds r, jsonb_array_elements(r.candidates) as c (value)
  where r.room_id = p_room and r.status = 'closed' and c.value ->> 'id' = p_candidate
    and r.number = (select max(number) from public.room_rounds where room_id = p_room and status = 'closed');
  if v_title is null then perform public.cinet_fail('CN422', 'Ese título no estaba en la ronda.'); end if;
  if exists (
    select 1 from public.room_rounds r, jsonb_array_elements(r.result -> 'tallies') as t (value)
    where r.room_id = p_room and r.status = 'closed' and t.value ->> 'id' = p_candidate and (t.value ->> 'vetoed')::boolean
      and r.number = (select max(number) from public.room_rounds where room_id = p_room and status = 'closed')
  ) then
    perform public.cinet_fail('CN422', 'Ese título fue vetado en la ronda: no se puede elegir.');
  end if;
  update public.duo_rooms set status = 'chosen', chosen = v_title, updated_at = now() where id = p_room;
  return v_title;
end;
$$;

create function public.leave_duo_room(p_room uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_room public.duo_rooms;
begin
  v_room := public.room_locked(p_room);
  if v_room.host_id = (select auth.uid()) then
    perform public.cinet_fail('CN422', 'Quien abrió la sala no puede salir: puede cerrarla.');
  end if;
  perform public.drop_room_member(p_room, (select auth.uid()));
end;
$$;

create function public.remove_room_member(p_room uuid, p_user uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_room public.duo_rooms;
begin
  v_room := public.room_locked(p_room, true);
  if p_user = v_room.host_id then perform public.cinet_fail('CN422', 'No puedes retirarte a ti.'); end if;
  if not exists (select 1 from public.room_members where room_id = p_room and user_id = p_user) then return; end if;
  perform public.drop_room_member(p_room, p_user);
end;
$$;

create function public.close_duo_room(p_room uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_round uuid;
begin
  perform public.room_locked(p_room, true);
  select id into v_round from public.room_rounds where room_id = p_room and status = 'open';
  if v_round is not null then perform public.finish_room_round(v_round); end if;
  update public.duo_rooms set status = 'closed', updated_at = now() where id = p_room;
end;
$$;

revoke execute on function
  public.is_room_member(uuid), public.new_room_code(), public.room_locked(uuid, boolean),
  public.finish_room_round(uuid), public.drop_room_member(uuid, uuid), public.finish_round_if_complete(uuid),
  public.touch_room(),
  public.create_duo_room(text, text, text), public.join_duo_room(text, text), public.set_room_preferences(uuid, jsonb),
  public.room_deck_preferences(uuid), public.start_room_round(uuid, jsonb), public.cast_room_vote(uuid, text, text),
  public.close_room_round(uuid), public.choose_room_title(uuid, text), public.leave_duo_room(uuid),
  public.remove_room_member(uuid, uuid), public.close_duo_room(uuid)
from public, anon, authenticated;

grant execute on function public.is_room_member(uuid) to authenticated;
grant execute on function
  public.create_duo_room(text, text, text), public.join_duo_room(text, text), public.set_room_preferences(uuid, jsonb),
  public.room_deck_preferences(uuid), public.start_room_round(uuid, jsonb), public.cast_room_vote(uuid, text, text),
  public.close_room_round(uuid), public.choose_room_title(uuid, text), public.leave_duo_room(uuid),
  public.remove_room_member(uuid, uuid), public.close_duo_room(uuid)
to authenticated;

-- ---------- Realtime ----------
-- Planes: plan_members deja de publicarse (un DELETE de Realtime no pasa por RLS y mandaría su clave
-- a cualquier suscriptor). Sus cambios "tocan" el plan, que sí filtra por RLS.

create function public.touch_plan()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.plans set updated_at = now()
  where id = case when tg_op = 'DELETE' then old.plan_id else new.plan_id end;
  return null;
end;
$$;
revoke execute on function public.touch_plan() from public, anon, authenticated;

create trigger plan_members_touch
  after insert or update or delete on public.plan_members
  for each row execute function public.touch_plan();

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'plan_members') then
      alter publication supabase_realtime drop table public.plan_members;
    end if;
    alter publication supabase_realtime add table public.duo_rooms, public.room_rounds;
  end if;
end;
$$;
