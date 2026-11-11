/* Grupos guardados y «repetir plan»: privacidad, invitaciones, revocación y sin copiar confirmaciones (PGlite). */
import { test } from "node:test";
import assert from "node:assert/strict";
import { as, createDb, createUsers, errorCode, rpc } from "./db.js";

const id = (n) => `${String(n).padStart(8, "0")}-1111-4000-8000-${String(n).padStart(12, "0")}`;
const A = id(1); // crea el grupo
const B = id(2); // se une
const C = id(3); // extraña
const D = id(4); // llega después
const G = id(5); // invitada anónima

const db = await createDb();
await createUsers(db, [{ id: A, name: "Ana" }, { id: B, name: "Bea" }, { id: C }, { id: D, name: "Dani" }, { id: G, anonymous: true }]);
const rows = async (sql, args) => (await db.query(sql, args)).rows;
const newPlan = (ref) => [
  ref, "Viernes de cine", "", "cinema", "tmdb-movie-1", JSON.stringify({ title: "Uno", year: "2001" }),
  JSON.stringify({ name: "Cinemark", location: "Andino" }), "2026-10-17", "20:30", "America/Bogota", JSON.stringify({}), "Ana",
];

await as(db, A);
const group = (await rpc(db, "create_group", ["La familia", "Ana"])).create_group;
const token = (await rpc(db, "create_group_invite", [group, 14])).create_group_invite;

test("crear y ver: solo miembros; invitados anónimos no crean grupos", async () => {
  await as(db, G, { anonymous: true });
  assert.equal(await errorCode(rpc(db, "create_group", ["X", "G"])), "CN403");
  await as(db, C);
  assert.deepEqual(await rows("select id from public.groups"), []);
  assert.deepEqual(await rows("select user_id from public.group_members"), []);
  assert.equal(await errorCode(rpc(db, "create_group_invite", [group, 14])), "CN404");
  await as(db);
  assert.equal(await errorCode(db.query("select * from public.groups")), "42501");
});

test("invitación: vista previa, unirse dos veces no duplica, el token no se puede leer", async () => {
  await as(db, B);
  const preview = await rpc(db, "preview_group_invite", [token]);
  assert.deepEqual([preview.name, preview.owner_name, preview.member_count, preview.already_member], ["La familia", "Ana", 1, false]);
  assert.equal((await rpc(db, "accept_group_invite", [token, "Bea"])).accept_group_invite, group);
  assert.equal((await rpc(db, "accept_group_invite", [token, "Bea"])).accept_group_invite, group);
  assert.equal((await rows("select count(*)::int as n from public.group_members")).at(0).n, 2);
  await as(db, A);
  assert.equal(await errorCode(db.query("select token_hash from public.group_invites")), "42501");
  assert.equal((await rows("select uses from public.group_invites where group_id = $1", [group]))[0].uses, 1);
});

test("compartir un plan con el grupo suma a quienes están hoy, sin respuesta; solo quien organiza", async () => {
  await as(db, A);
  const plan = (await rpc(db, "create_plan", newPlan("group-plan-0001"))).create_plan;
  await as(db, B);
  assert.equal(await errorCode(rpc(db, "share_plan_with_group", [plan, group])), "CN404", "B aún no está en el plan");
  await as(db, A);
  assert.equal((await rpc(db, "share_plan_with_group", [plan, group])).share_plan_with_group, 1);
  assert.equal((await rpc(db, "share_plan_with_group", [plan, group])).share_plan_with_group, 0, "idempotente");
  await as(db, B);
  const me = await rows("select rsvp, role from public.plan_members where plan_id = $1 and user_id = $2", [plan, B]);
  assert.deepEqual(me, [{ rsvp: null, role: "member" }]);
  await rpc(db, "set_plan_rsvp", [plan, "yes"]);

  // Quien entra al grupo después no ve planes anteriores.
  await as(db, D);
  await rpc(db, "accept_group_invite", [token, "Dani"]);
  assert.deepEqual(await rows("select id from public.plans where id = $1", [plan]), []);

  // Repetir: otra fecha, mismas personas + quien se sumó al grupo, sin copiar confirmaciones.
  await as(db, B);
  const again = (await rpc(db, "repeat_plan", [plan, "repeat-ref-0001", "2026-10-24", "19:00", "America/Bogota"])).repeat_plan;
  assert.notEqual(again, plan);
  assert.equal((await rpc(db, "repeat_plan", [plan, "repeat-ref-0001", "2026-10-24", "19:00", "America/Bogota"])).repeat_plan, again, "idempotente");
  const members = await rows("select user_id, role, rsvp from public.plan_members where plan_id = $1 order by role desc, user_id", [again]);
  assert.deepEqual(members.map((m) => [m.user_id, m.role, m.rsvp]), [[B, "owner", "yes"], [A, "member", null], [D, "member", null]]);
  const row = (await rows("select starts_at, group_id, title from public.plans where id = $1", [again]))[0];
  assert.equal(row.starts_at.toISOString(), "2026-10-25T00:00:00.000Z", "19:00 en Bogotá");
  assert.equal(row.group_id, group);
  assert.equal(row.title.title, "Uno");
  await as(db, C);
  assert.equal(await errorCode(rpc(db, "repeat_plan", [plan, "repeat-ref-0002", "2026-10-24", "19:00", "America/Bogota"])), "CN404");
  await as(db, G, { anonymous: true });
  assert.equal(await errorCode(rpc(db, "repeat_plan", [plan, "repeat-ref-0003", "2026-10-24", "19:00", "America/Bogota"])), "CN403");
});

test("revocar, retirar y salir tienen efecto inmediato", async () => {
  await as(db, A);
  const invite = (await rows("select id from public.group_invites where group_id = $1", [group]))[0].id;
  await rpc(db, "revoke_group_invite", [invite]);
  await as(db, C);
  assert.equal(await errorCode(rpc(db, "accept_group_invite", [token, "C"])), "CN410");
  await as(db, B);
  assert.equal(await errorCode(rpc(db, "remove_group_member", [group, D])), "CN403");
  await as(db, A);
  await rpc(db, "remove_group_member", [group, D]);
  assert.equal(await errorCode(rpc(db, "leave_group", [group])), "CN403", "quien crea no sale: elimina");
  await as(db, D);
  assert.deepEqual(await rows("select id from public.groups"), []);
  await as(db, B);
  await rpc(db, "leave_group", [group]);
  assert.deepEqual(await rows("select id from public.groups"), []);
  await as(db, A);
  await rpc(db, "delete_group", [group]);
  assert.deepEqual(await rows("select id from public.groups"), []);
  assert.ok((await rows("select id from public.plans where group_id is null")).length >= 1, "los planes siguen, sin grupo");
});
