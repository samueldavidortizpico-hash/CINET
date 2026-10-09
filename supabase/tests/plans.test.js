/* Planes compartidos: permisos reales en PostgreSQL (PGlite) con dueño, miembro, extraño e invitado. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { as, asAdmin, createDb, createUsers, errorCode, rpc } from "./db.js";

const A = "aaaaaaaa-0000-4000-8000-000000000001"; // organiza
const B = "bbbbbbbb-0000-4000-8000-000000000002"; // invitada
const C = "cccccccc-0000-4000-8000-000000000003"; // extraña
const G = "dddddddd-0000-4000-8000-000000000004"; // invitado anónimo

const db = await createDb();
await createUsers(db, [{ id: A, name: "Sam" }, { id: B, name: "Sam" }, { id: C }, { id: G, anonymous: true }]);

const newPlan = (ref = "client-ref-0001") => [
  ref, "Noche de cine", "Llevo crispetas", "home", "tmdb-movie-550", JSON.stringify({ title: "El club de la pelea", year: "1999" }),
  JSON.stringify({ name: "Netflix", location: "En casa" }), "2026-10-17", "20:30", "America/Bogota", JSON.stringify({ ambience: "😂 Divertido" }), "Sam",
];
const createPlan = async (ref) => (await rpc(db, "create_plan", newPlan(ref))).create_plan;
const visiblePlans = async () => (await db.query("select id from public.plans")).rows.map((row) => row.id);
const members = async (plan) => (await db.query("select user_id, display_name, rsvp, role from public.plan_members where plan_id = $1 order by joined_at, role desc", [plan])).rows;

await as(db, A);
const plan = await createPlan();
const token = (await rpc(db, "create_plan_invite", [plan, 14, null])).create_plan_invite;

test("crear es idempotente y guarda la hora con su zona", async () => {
  await as(db, A);
  assert.equal(await createPlan(), plan, "reintentar la misma petición no duplica");
  const row = (await db.query("select starts_at, time_zone, time_source from public.plans where id = $1", [plan])).rows[0];
  assert.equal(row.starts_at.toISOString(), "2026-10-18T01:30:00.000Z", "20:30 en Bogotá = 01:30 UTC del día siguiente");
  assert.deepEqual([row.time_zone, row.time_source], ["America/Bogota", "organizer"]);
  assert.deepEqual((await members(plan)).map((m) => [m.role, m.rsvp]), [["owner", "yes"]]);
});

test("sin invitación nadie más lee, edita ni responde", async () => {
  await as(db, C);
  assert.deepEqual(await visiblePlans(), [], "C no ve el plan");
  assert.deepEqual(await members(plan), [], "ni sus miembros");
  assert.equal(await errorCode(rpc(db, "set_plan_rsvp", [plan, "yes"])), "CN404");
  assert.equal(await errorCode(rpc(db, "update_plan", [plan, 1, "Hackeado", ""])), "CN404");
  assert.equal(await errorCode(rpc(db, "create_plan_invite", [plan, 14, null])), "CN404");
  assert.equal(await errorCode(rpc(db, "accept_plan_invite", ["token-inventado-123456", "C"])), "CN404", "no se adivina un token");
  await as(db);
  assert.equal(await errorCode(db.query("select * from public.plans")), "42501", "anónimo de la API: sin acceso a la tabla");
  assert.equal(await errorCode(rpc(db, "create_plan", newPlan("anon-ref-0001"))), "42501");
});

test("B se une con su propia identidad aunque se llame igual que A", async () => {
  await as(db, B);
  const preview = await rpc(db, "preview_plan_invite", [token]);
  assert.deepEqual([preview.name, preview.owner_name, preview.member_count, preview.already_member], ["Noche de cine", "Sam", 1, false]);
  assert.equal(preview.title.title, "El club de la pelea");
  assert.equal(preview.message, undefined, "el preview no incluye el mensaje privado");
  assert.equal((await rpc(db, "accept_plan_invite", [token, "Sam"])).accept_plan_invite, plan);
  assert.equal((await rpc(db, "accept_plan_invite", [token, "Sam"])).accept_plan_invite, plan, "aceptar dos veces es idempotente");
  await rpc(db, "set_plan_rsvp", [plan, "maybe"]);
  const rows = await members(plan);
  assert.deepEqual(rows.map((m) => [m.user_id, m.display_name, m.rsvp]), [[A, "Sam", "yes"], [B, "Sam", "maybe"]], "dos «Sam» distintos");
  await as(db, A);
  assert.equal((await members(plan)).find((m) => m.user_id === B).rsvp, "maybe", "A ve la respuesta de B persistida");
  await asAdmin(db);
  assert.equal((await db.query("select uses from public.plan_invites")).rows[0].uses, 1, "un solo uso aunque aceptó dos veces");
});

test("nadie confirma ni edita en nombre de otro (ataques directos a las tablas)", async () => {
  await as(db, B);
  assert.equal(await errorCode(db.query("update public.plan_members set rsvp = 'no' where user_id = $1", [A])), "42501");
  assert.equal(await errorCode(db.query("insert into public.plan_members (plan_id, user_id, display_name) values ($1, $2, 'C')", [plan, C])), "42501");
  assert.equal(await errorCode(db.query("update public.plans set owner_id = $1 where id = $2", [B, plan])), "42501", "no se cambia el dueño");
  assert.equal(await errorCode(db.query("delete from public.plans where id = $1", [plan])), "42501");
  assert.equal(await errorCode(rpc(db, "update_plan", [plan, 1, "Mío", ""])), "CN403", "B es miembro pero no organiza");
  assert.equal(await errorCode(rpc(db, "create_plan_invite", [plan, 14, null])), "CN403");
  assert.equal(await errorCode(rpc(db, "remove_plan_member", [plan, A])), "CN403");
  assert.equal(await errorCode(db.query("select token_hash from public.plan_invites")), "42501", "el hash del token no se puede leer");
  assert.deepEqual((await db.query("select id from public.plan_invites")).rows, [], "B no lista las invitaciones de A");
  await as(db, A);
  assert.equal((await members(plan)).find((m) => m.user_id === A).rsvp, "yes", "la respuesta de A no cambió");
  assert.equal((await db.query("select id from public.plan_invites")).rows.length, 1, "A sí ve sus invitaciones");
  await asAdmin(db);
  const stored = (await db.query("select encode(token_hash, 'hex') as hash from public.plan_invites")).rows[0].hash;
  assert.notEqual(stored, token, "en la base solo está el hash");
  assert.equal(stored.length, 64);
});

test("versiones: editar con una versión vieja es un conflicto", async () => {
  await as(db, A);
  assert.equal((await rpc(db, "update_plan", [plan, 1, "Noche de cine 2", "Cambio"])).update_plan, 2);
  assert.equal(await errorCode(rpc(db, "update_plan", [plan, 1, "Otro cambio", ""])), "CN409");
  assert.equal(await errorCode(rpc(db, "update_plan", [plan, 2, "", ""])), "CN422", "nombre vacío");
});

test("revocar invitación y expulsar tienen efecto inmediato", async () => {
  await as(db, A);
  const invite = (await db.query("select id from public.plan_invites")).rows[0].id;
  await rpc(db, "revoke_plan_invite", [invite]);
  await as(db, C);
  assert.equal(await errorCode(rpc(db, "accept_plan_invite", [token, "C"])), "CN410", "invitación revocada");
  await as(db, A);
  await rpc(db, "remove_plan_member", [plan, B]);
  await as(db, B);
  assert.deepEqual(await visiblePlans(), [], "B ya no lee el plan");
  assert.equal(await errorCode(rpc(db, "set_plan_rsvp", [plan, "yes"])), "CN404");
});

test("invitaciones caducadas, de uso limitado y cupo del plan", async () => {
  await as(db, A);
  const limited = (await rpc(db, "create_plan_invite", [plan, 1, 1])).create_plan_invite;
  await as(db, C);
  await rpc(db, "accept_plan_invite", [limited, "C"]);
  await as(db, B);
  assert.equal(await errorCode(rpc(db, "accept_plan_invite", [limited, "B"])), "CN410", "un solo uso");
  await as(db, A);
  const expiring = (await rpc(db, "create_plan_invite", [plan, 1, null])).create_plan_invite;
  await asAdmin(db);
  await db.query("update public.plan_invites set expires_at = now() - interval '1 second' where uses = 0 and revoked_at is null");
  await as(db, B);
  assert.equal(await errorCode(rpc(db, "accept_plan_invite", [expiring, "B"])), "CN410", "caducada");

  await as(db, A);
  const full = await createPlan("client-ref-full");
  const open = (await rpc(db, "create_plan_invite", [full, 7, null])).create_plan_invite;
  await asAdmin(db);
  for (let index = 0; index < 29; index += 1) {
    const id = `eeeeeeee-0000-4000-8000-${String(index).padStart(12, "0")}`;
    await db.query("insert into auth.users (id) values ($1)", [id]);
    await db.query("insert into public.plan_members (plan_id, user_id, display_name) values ($1, $2, 'X')", [full, id]);
  }
  await as(db, B);
  assert.equal(await errorCode(rpc(db, "accept_plan_invite", [open, "B"])), "CN429", "30 personas como máximo");
});

test("invitado anónimo: se une y responde, pero no organiza", async () => {
  await as(db, A);
  const invite = (await rpc(db, "create_plan_invite", [plan, 7, null])).create_plan_invite;
  await as(db, G, { anonymous: true });
  assert.equal(await errorCode(rpc(db, "create_plan", newPlan("guest-ref-0001"))), "CN403");
  assert.equal((await rpc(db, "accept_plan_invite", [invite, "Invitado"])).accept_plan_invite, plan);
  await rpc(db, "set_plan_rsvp", [plan, "yes"]);
  assert.deepEqual(await visiblePlans(), [plan]);
});

test("cancelar bloquea respuestas e invitaciones; solo el dueño elimina", async () => {
  await as(db, A);
  const invite = (await rpc(db, "create_plan_invite", [plan, 7, null])).create_plan_invite;
  await rpc(db, "cancel_plan", [plan]);
  await rpc(db, "cancel_plan", [plan]); // idempotente
  await as(db, C);
  assert.equal(await errorCode(rpc(db, "set_plan_rsvp", [plan, "no"])), "CN410");
  assert.equal(await errorCode(rpc(db, "preview_plan_invite", [invite])), "CN410");
  assert.equal(await errorCode(rpc(db, "delete_plan", [plan])), "CN403");
  assert.equal(await errorCode(rpc(db, "leave_plan", [plan])), null, "un miembro sí puede salirse");
  await as(db, A);
  assert.equal(await errorCode(rpc(db, "leave_plan", [plan])), "CN403", "quien organiza no se sale");
  await rpc(db, "delete_plan", [plan]);
  assert.equal((await visiblePlans()).includes(plan), false);
});
