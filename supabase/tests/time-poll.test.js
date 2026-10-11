/* Encuesta de horarios: propone quien organiza, cada cuenta marca lo suyo, elegir cierra la encuesta (PGlite). */
import { test } from "node:test";
import assert from "node:assert/strict";
import { as, createDb, createUsers, errorCode, rpc } from "./db.js";

const id = (n) => `${String(n).padStart(8, "0")}-2222-4000-8000-${String(n).padStart(12, "0")}`;
const A = id(1);
const B = id(2);
const C = id(3);

const db = await createDb();
await createUsers(db, [{ id: A, name: "Ana" }, { id: B, name: "Bea" }, { id: C }]);
const rows = async (sql, args) => (await db.query(sql, args)).rows;
const json = (value) => JSON.stringify(value);

await as(db, A);
const plan = (await rpc(db, "create_plan", [
  "poll-plan-0001", "Cine sin fecha", "", "cinema", "tmdb-movie-1", json({ title: "Uno" }), json({ name: "Cinemark" }),
  "2030-01-01", "20:00", "America/Bogota", json({}), "Ana",
])).create_plan;
const token = (await rpc(db, "create_plan_invite", [plan, 14, null])).create_plan_invite;
await as(db, B);
await rpc(db, "accept_plan_invite", [token, "Bea"]);

test("solo quien organiza propone, entre 2 y 5 horarios futuros y válidos", async () => {
  await as(db, B);
  assert.equal(await errorCode(rpc(db, "propose_plan_times", [plan, json([{ date: "2030-01-10", time: "20:00" }, { date: "2030-01-11", time: "20:00" }])])), "CN403");
  await as(db, A);
  assert.equal(await errorCode(rpc(db, "propose_plan_times", [plan, json([{ date: "2030-01-10", time: "20:00" }])])), "CN422", "mínimo 2");
  assert.equal(await errorCode(rpc(db, "propose_plan_times", [plan, json([{ date: "2020-01-10", time: "20:00" }, { date: "2030-01-11", time: "20:00" }])])), "CN422", "futuros");
  assert.equal(await errorCode(rpc(db, "propose_plan_times", [plan, json([{ date: "mañana", time: "20:00" }, { date: "2030-01-11", time: "20:00" }])])), "CN422");
  const added = (await rpc(db, "propose_plan_times", [plan, json([{ date: "2030-01-10", time: "20:00" }, { date: "2030-01-11", time: "19:30" }, { date: "2030-01-10", time: "20:00" }])])).propose_plan_times;
  assert.equal(added, 2, "sin duplicados");
  const six = Array.from({ length: 4 }, (_, index) => ({ date: `2030-02-0${index + 1}`, time: "20:00" }));
  assert.equal(await errorCode(rpc(db, "propose_plan_times", [plan, json(six)])), "CN422", "máximo 5 en total");
});

test("cada cuenta marca lo que le sirve; un extraño no ve ni marca", async () => {
  await as(db, B);
  const options = await rows("select id, starts_at from public.plan_time_options where plan_id = $1 order by starts_at", [plan]);
  assert.equal(options.length, 2);
  assert.equal(options[0].starts_at.toISOString(), "2030-01-11T01:00:00.000Z", "20:00 en Bogotá");
  await rpc(db, "toggle_plan_time_vote", [options[1].id, true]);
  await rpc(db, "toggle_plan_time_vote", [options[1].id, true]); // repetir no duplica
  await as(db, A);
  await rpc(db, "toggle_plan_time_vote", [options[1].id, true]);
  await rpc(db, "toggle_plan_time_vote", [options[0].id, true]);
  await rpc(db, "toggle_plan_time_vote", [options[0].id, false]);
  const votes = await rows("select option_id, user_id from public.plan_time_votes order by user_id");
  assert.deepEqual(votes.map((vote) => [vote.option_id, vote.user_id]), [[options[1].id, A], [options[1].id, B]]);
  await as(db, C);
  assert.deepEqual(await rows("select id from public.plan_time_options"), []);
  assert.equal(await errorCode(rpc(db, "toggle_plan_time_vote", [options[0].id, true])), "CN404");
  assert.equal(await errorCode(db.query("insert into public.plan_time_votes (option_id, plan_id, user_id) values ($1, $2, $3)", [options[0].id, plan, C])), "42501");
});

test("elegir un horario lo vuelve la hora propuesta y cierra la encuesta", async () => {
  await as(db, A);
  const option = (await rows("select id, starts_at from public.plan_time_options where plan_id = $1 order by starts_at desc limit 1", [plan]))[0];
  await as(db, B);
  assert.equal(await errorCode(rpc(db, "choose_plan_time", [option.id])), "CN403");
  await as(db, A);
  const before = (await rows("select version from public.plans where id = $1", [plan]))[0].version;
  await rpc(db, "choose_plan_time", [option.id]);
  const after = (await rows("select starts_at, time_source, version from public.plans where id = $1", [plan]))[0];
  assert.equal(after.starts_at.toISOString(), option.starts_at.toISOString());
  assert.deepEqual([after.time_source, after.version], ["organizer", before + 1]);
  assert.deepEqual(await rows("select id from public.plan_time_options where plan_id = $1", [plan]), []);
  assert.deepEqual(await rows("select option_id from public.plan_time_votes"), []);
});
