/* Salas de Duo: permisos, privacidad de votos y gustos, cupo, enumeración y cierre, en PostgreSQL real (PGlite). */
import { test } from "node:test";
import assert from "node:assert/strict";
import { as, asAdmin, createDb, createUsers, errorCode, rpc } from "./db.js";

const id = (n) => `${String(n).padStart(8, "0")}-0000-4000-8000-${String(n).padStart(12, "0")}`;
const A = id(1); // abre la sala
const B = id(2); // se une
const C = id(3); // extraña
const D = id(4); // prueba códigos al azar
const G = id(5); // invitada anónima
const FILL = [6, 7, 8, 9, 10, 11].map(id); // completan la sala
const L = id(12); // llega tarde

const db = await createDb();
await createUsers(db, [A, B, C, D, ...FILL, L].map((user) => ({ id: user })).concat({ id: G, anonymous: true }));

const deck = [
  { id: "tmdb-movie-1", title: "Uno", year: "2001", image: "https://image.tmdb.org/t/p/w342/a.jpg", type: "movie" },
  { id: "tmdb-movie-2", title: "Dos", year: "2002", image: "/posters/dos.jpg", type: "movie" },
  { id: "tmdb-movie-3", title: "Tres", year: "2003", image: "", type: "movie" },
];
const json = (value) => JSON.stringify(value);
const vote = (round, candidate, value) => rpc(db, "cast_room_vote", [round, candidate, value]);
const roomRows = async (sql, args) => (await db.query(sql, args)).rows;

await as(db, A);
const { id: room, code } = await rpc(db, "create_duo_room", ["Ana", "movie", "CO"]);

test("abrir sala: código legible; invitados y anónimos no abren salas", async () => {
  assert.match(code, /^[A-HJ-NP-Z2-9]{6}$/);
  await as(db, G, { anonymous: true });
  assert.equal(await errorCode(rpc(db, "create_duo_room", ["G", "movie", "CO"])), "CN403");
  await as(db);
  assert.equal(await errorCode(rpc(db, "create_duo_room", ["X", "movie", "CO"])), "42501");
  assert.equal(await errorCode(db.query("select * from public.duo_rooms")), "42501");
});

test("un extraño no ve la sala ni la encuentra probando códigos", async () => {
  await as(db, C);
  assert.deepEqual(await roomRows("select id from public.duo_rooms"), []);
  assert.deepEqual(await roomRows("select user_id from public.room_members"), []);
  assert.equal(await errorCode(rpc(db, "room_deck_preferences", [room])), "CN404");
  await as(db, D);
  for (let attempt = 0; attempt < 10; attempt++) {
    assert.equal((await rpc(db, "join_duo_room", [`ZZZZZ${"23456789AB"[attempt]}`, "D"])).join_duo_room, null);
  }
  assert.equal(await errorCode(rpc(db, "join_duo_room", [code, "D"])), "CN429", "tras 10 fallos ni el código correcto sirve");
  assert.deepEqual(await roomRows("select id from public.duo_rooms"), []);
});

test("unirse: el código se normaliza, repetir no duplica y cada quien tiene su butaca", async () => {
  await as(db, B);
  const typed = `${code.slice(0, 3).toLowerCase()} ${code.slice(3)}`;
  assert.equal((await rpc(db, "join_duo_room", [typed, "Bea"])).join_duo_room, room);
  assert.equal((await rpc(db, "join_duo_room", [code, "Bea"])).join_duo_room, room, "idempotente");
  await as(db, G, { anonymous: true });
  assert.equal((await rpc(db, "join_duo_room", [code, "Invitada"])).join_duo_room, room, "un invitado anónimo sí se une");
  const seats = await roomRows("select user_id, seat, role from public.room_members order by seat");
  assert.deepEqual(seats.map((m) => [m.user_id, m.seat, m.role]), [[A, 1, "host"], [B, 2, "member"], [G, 3, "member"]]);
});

test("gustos: se validan, cada quien lee solo los suyos y el anfitrión los recibe sin nombres", async () => {
  await as(db, B);
  assert.equal(await errorCode(rpc(db, "set_room_preferences", [room, json({ genres: ["drop table"] })])), "CN422");
  assert.equal(await errorCode(rpc(db, "set_room_preferences", [room, json({ maxRuntime: 9999 })])), "CN422");
  await rpc(db, "set_room_preferences", [room, json({ genres: ["comedy"], rejectedGenres: ["horror"], maxRuntime: 120, email: "b@x.co" })]);
  assert.deepEqual((await roomRows("select prefs from public.room_preferences"))[0].prefs, {
    genres: ["comedy"], mustGenres: [], rejectedGenres: ["horror"], maxRuntime: 120,
  }, "solo se guardan las claves conocidas");
  assert.equal(await errorCode(rpc(db, "room_deck_preferences", [room])), "CN403", "solo el anfitrión calcula la baraja");

  await as(db, A);
  await rpc(db, "set_room_preferences", [room, json({ genres: ["drama"], maxRuntime: 0 })]);
  assert.equal((await roomRows("select user_id from public.room_preferences")).length, 1, "A no lee los gustos de B");
  const prefs = (await rpc(db, "room_deck_preferences", [room])).room_deck_preferences;
  assert.equal(prefs.length, 2, "solo quienes están listos");
  assert.ok(prefs.every((item) => !("user_id" in item) && !("display_name" in item)), "sin identidad");
  const ready = await roomRows("select user_id, ready from public.room_members order by seat");
  assert.deepEqual(ready.map((m) => m.ready), [true, true, false]);
});

test("cupo de 8: la novena persona no entra", async () => {
  for (const user of FILL.slice(0, 5)) {
    await as(db, user);
    await rpc(db, "join_duo_room", [code, "Amiga"]);
  }
  await as(db, FILL[5]);
  assert.equal(await errorCode(rpc(db, "join_duo_room", [code, "Novena"])), "CN429");
  await asAdmin(db);
  assert.equal((await roomRows("select count(*)::int as n from public.room_members where room_id = $1", [room]))[0].n, 8);
});

test("ronda: solo el anfitrión la abre, la baraja se valida y queda congelada", async () => {
  await as(db, B);
  assert.equal(await errorCode(rpc(db, "start_room_round", [room, json(deck)])), "CN403");
  await as(db, A);
  assert.equal(await errorCode(rpc(db, "start_room_round", [room, json(deck.slice(0, 1))])), "CN422", "mínimo 2");
  assert.equal(await errorCode(rpc(db, "start_room_round", [room, json([deck[0], deck[0]])])), "CN422", "sin repetidos");
  const evil = [{ ...deck[0], image: "javascript:alert(1)" }, deck[1]];
  assert.equal(await errorCode(rpc(db, "start_room_round", [room, json(evil)])), "CN422", "imagen solo https o ruta propia");
  const round = (await rpc(db, "start_room_round", [room, json(deck.map((item) => ({ ...item, extra: "x" })))])).start_room_round;
  assert.equal(await errorCode(rpc(db, "start_room_round", [room, json(deck)])), "CN409", "una ronda a la vez");
  const row = (await roomRows("select candidates, participants from public.room_rounds where id = $1", [round]))[0];
  assert.equal(row.participants.length, 8);
  assert.ok(row.candidates.every((item) => !("extra" in item)), "solo campos conocidos");
});

test("votos privados durante y después de la ronda; reintentar no duplica", async () => {
  await as(db, A);
  const round = (await roomRows("select id from public.room_rounds where room_id = $1 and status = 'open'", [room]))[0].id;
  await as(db, B);
  await vote(round, "tmdb-movie-1", "maybe");
  await vote(round, "tmdb-movie-1", "yes");
  assert.deepEqual((await roomRows("select candidate_id, vote from public.round_votes")).map((v) => [v.candidate_id, v.vote]), [["tmdb-movie-1", "yes"]]);
  assert.equal(await errorCode(vote(round, "tmdb-movie-99", "yes")), "CN422", "solo títulos de la baraja");
  assert.equal(await errorCode(vote(round, "tmdb-movie-2", "love")), "CN422");
  await as(db, A);
  assert.deepEqual(await roomRows("select * from public.round_votes"), [], "el anfitrión no lee el voto de B");
  const progress = await roomRows("select user_id, votes_cast from public.room_members where user_id = $1", [B]);
  assert.equal(progress[0].votes_cast, 1, "solo se ve cuántos votó");
  await as(db, C);
  assert.equal(await errorCode(vote(round, "tmdb-movie-1", "yes")), "CN404", "un extraño no vota");
  await as(db);
  assert.equal(await errorCode(db.query("select * from public.round_votes")), "42501");
});

test("retirar a alguien le quita sus votos y el acceso a la sala", async () => {
  await as(db, A);
  const round = (await roomRows("select id from public.room_rounds where room_id = $1 and status = 'open'", [room]))[0].id;
  await as(db, FILL[0]);
  await vote(round, "tmdb-movie-2", "yes");
  await as(db, B);
  assert.equal(await errorCode(rpc(db, "remove_room_member", [room, FILL[0]])), "CN403", "solo el anfitrión retira");
  await as(db, A);
  await rpc(db, "remove_room_member", [room, FILL[0]]);
  const row = (await roomRows("select participants from public.room_rounds where id = $1", [round]))[0];
  assert.ok(!row.participants.includes(FILL[0]), "deja de contar en la ronda");
  await as(db, FILL[0]);
  assert.deepEqual(await roomRows("select id from public.duo_rooms"), [], "ya no ve la sala");
  assert.deepEqual(await roomRows("select * from public.round_votes"), [], "sus votos de la ronda se borraron");
  assert.equal(await errorCode(vote(round, "tmdb-movie-2", "yes")), "CN404");
});

test("cuando todas votan todo el servidor cierra; cerrar dos veces da lo mismo", async () => {
  await as(db, A);
  const round = (await roomRows("select id, participants from public.room_rounds where room_id = $1 and status = 'open'", [room]))[0];
  const ballots = { "tmdb-movie-1": "yes", "tmdb-movie-2": "maybe", "tmdb-movie-3": "no" };
  let status;
  for (const user of round.participants) {
    await as(db, user, { anonymous: user === G });
    for (const [candidate, value] of Object.entries(ballots)) status = (await vote(round.id, candidate, value)).cast_room_vote;
  }
  assert.equal(status, "closed", "el último voto cierra la ronda");
  await as(db, A);
  const first = (await rpc(db, "close_room_round", [round.id])).close_room_round;
  const second = (await rpc(db, "close_room_round", [round.id])).close_room_round;
  assert.deepEqual(first, second, "cierre doble: un único resultado");
  assert.equal(first.outcome, "match", "todas dijeron sí a «Uno»");
  assert.equal(first.winner, "tmdb-movie-1");
  assert.deepEqual(first.tallies[0], { id: "tmdb-movie-1", yes: 7, maybe: 0, no: 0, vetoed: false });
  assert.equal((await roomRows("select status from public.duo_rooms"))[0].status, "revealed");
  await as(db, B);
  assert.equal(await errorCode(vote(round.id, "tmdb-movie-1", "no")), "CN410", "no se vota tras el cierre");
});

test("sin unanimidad el resultado dice «más votada», y sin puntos, «sin coincidencia»", async () => {
  await as(db, A);
  const { id: small, code: smallCode } = await rpc(db, "create_duo_room", ["Ana", "movie", "CO"]);
  await as(db, B);
  await rpc(db, "join_duo_room", [smallCode, "Bea"]);
  await as(db, A);
  let round = (await rpc(db, "start_room_round", [small, json(deck)])).start_room_round;
  await as(db, L);
  await rpc(db, "join_duo_room", [smallCode, "Tarde"]);
  assert.equal(await errorCode(vote(round, "tmdb-movie-1", "yes")), "CN403", "quien llega tarde vota en la siguiente");
  await as(db, A);
  await vote(round, "tmdb-movie-1", "yes");
  await vote(round, "tmdb-movie-2", "yes");
  await as(db, B);
  await vote(round, "tmdb-movie-1", "no");
  await vote(round, "tmdb-movie-2", "maybe");
  await as(db, A);
  let result = (await rpc(db, "close_room_round", [round])).close_room_round; // B no votó todo: cierra el anfitrión
  assert.deepEqual([result.outcome, result.winner, result.participants], ["top", "tmdb-movie-2", 2]);

  await as(db, B);
  assert.equal(await errorCode(rpc(db, "choose_room_title", [small, "tmdb-movie-2"])), "CN403");
  await as(db, A);
  assert.equal(await errorCode(rpc(db, "choose_room_title", [small, "tmdb-movie-99"])), "CN422");
  assert.equal((await rpc(db, "choose_room_title", [small, "tmdb-movie-2"])).choose_room_title.title, "Dos");

  round = (await rpc(db, "start_room_round", [small, json(deck.slice(0, 2))])).start_room_round;
  const participants = (await roomRows("select participants from public.room_rounds where id = $1", [round]))[0].participants;
  assert.ok(participants.includes(L), "en la ronda siguiente ya participa");
  for (const user of participants) {
    await as(db, user);
    await vote(round, "tmdb-movie-1", "no");
    await vote(round, "tmdb-movie-2", "no");
  }
  await as(db, A);
  result = (await roomRows("select result from public.room_rounds where id = $1", [round]))[0].result;
  assert.deepEqual([result.outcome, result.winner], ["none", null], "no se inventa consenso");

  await rpc(db, "close_duo_room", [small]);
  await as(db, L);
  assert.equal(await errorCode(rpc(db, "leave_duo_room", [small])), "CN410");
  await as(db, C);
  assert.equal(await errorCode(rpc(db, "join_duo_room", [smallCode, "C"])), "CN410", "una sala cerrada no admite a nadie");
});

test("veto: uno por persona y ronda, privado, y un vetado nunca gana (ni para rellenar)", async () => {
  await as(db, A);
  const { id: vetoRoom, code: vetoCode } = await rpc(db, "create_duo_room", ["Ana", "movie", "CO"]);
  await as(db, C);
  await rpc(db, "join_duo_room", [vetoCode, "Caro"]);
  await as(db, A);
  let round = (await rpc(db, "start_room_round", [vetoRoom, json(deck)])).start_room_round;
  await vote(round, "tmdb-movie-1", "yes");
  await vote(round, "tmdb-movie-2", "maybe");
  await vote(round, "tmdb-movie-3", "no");
  await as(db, C);
  await vote(round, "tmdb-movie-1", "veto");
  assert.equal(await errorCode(vote(round, "tmdb-movie-2", "veto")), "CN409", "un solo veto por ronda");
  await vote(round, "tmdb-movie-2", "yes");
  await as(db, A);
  assert.equal((await roomRows("select * from public.round_votes where vote = 'veto'")).length, 0, "nadie ve el veto ajeno");
  await as(db, C);
  await vote(round, "tmdb-movie-3", "no"); // último voto: cierra
  await as(db, A);
  let result = (await roomRows("select result from public.room_rounds where id = $1", [round]))[0].result;
  assert.deepEqual([result.outcome, result.winner, result.all_vetoed], ["top", "tmdb-movie-2", false], "«Uno» tenía un Sí pero fue vetado");
  assert.deepEqual(result.tallies.map((t) => t.vetoed), [true, false, false]);

  round = (await rpc(db, "start_room_round", [vetoRoom, json(deck.slice(0, 2))])).start_room_round;
  await vote(round, "tmdb-movie-1", "veto");
  await vote(round, "tmdb-movie-2", "yes");
  await as(db, C);
  await vote(round, "tmdb-movie-1", "yes");
  await vote(round, "tmdb-movie-2", "veto");
  await as(db, A);
  result = (await roomRows("select result from public.room_rounds where id = $1", [round]))[0].result;
  assert.deepEqual([result.outcome, result.winner, result.all_vetoed], ["none", null, true], "todo vetado: otra ronda, no un vetado");
  assert.equal(await errorCode(rpc(db, "choose_room_title", [vetoRoom, "tmdb-movie-1"])), "CN422", "el anfitrión tampoco elige un vetado");
});

test("el anfitrión no puede salir; un miembro sí, y deja de verla", async () => {
  await as(db, A);
  assert.equal(await errorCode(rpc(db, "leave_duo_room", [room])), "CN422");
  await as(db, B);
  await rpc(db, "leave_duo_room", [room]);
  assert.deepEqual(await roomRows("select id from public.duo_rooms where id = $1", [room]), []);
});

test("Realtime publica salas y rondas, nunca votos, gustos ni miembros", async () => {
  await asAdmin(db);
  const tables = (await roomRows("select tablename from pg_publication_tables where pubname = 'supabase_realtime' order by tablename")).map((row) => row.tablename);
  assert.deepEqual(tables, ["duo_rooms", "plans", "room_rounds"]);
});
