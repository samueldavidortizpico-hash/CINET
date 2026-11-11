/* Plus en sandbox: derechos en el servidor, sin cobro real, webhook idempotente y ordenado (PGlite). */
import { test } from "node:test";
import assert from "node:assert/strict";
import { as, asAdmin, createDb, createUsers, errorCode, rpc } from "./db.js";

const id = (n) => `${String(n).padStart(8, "0")}-4444-4000-8000-${String(n).padStart(12, "0")}`;
const A = id(1); // organiza
const B = id(2); // invitada
const G = id(3); // invitada sin cuenta (anónima)

const db = await createDb();
await createUsers(db, [{ id: A, name: "Ana" }, { id: B, name: "Bea" }, { id: G }]);
const rows = async (sql, args) => (await db.query(sql, args)).rows;
const json = (value) => JSON.stringify(value);
const hasPlus = async (user) => {
  await as(db, user);
  return (await rpc(db, "has_plus", [])).has_plus;
};
async function asService() {
  await db.exec("reset role");
  await db.query("select set_config('request.jwt.claims', $1, false)", [json({ role: "service_role" })]);
  await db.exec("set role service_role");
}
const billing = (args) => rpc(db, "apply_billing_event", args).then((row) => row.apply_billing_event);
// El arnés no da permisos de tabla a service_role (Supabase sí): las comprobaciones se leen como admin.
async function adminRows(sql, args) {
  await asAdmin(db);
  const result = await rows(sql, args);
  await asService();
  return result;
}

await as(db, A);
const plan = (await rpc(db, "create_plan", [
  "plus-plan-0001", "Viernes de cine", "", "home", "tmdb-movie-1", json({ title: "Uno" }), json({ name: "Casa" }),
  "2030-01-04", "20:00", "America/Bogota", json({}), "Ana",
])).create_plan;
const token = (await rpc(db, "create_plan_invite", [plan, 14, null])).create_plan_invite;
await as(db, B);
await rpc(db, "accept_plan_invite", [token, "Bea"]);

test("sin sandbox encendido no hay Plus; lo gratuito sigue igual", async () => {
  await as(db, A);
  assert.equal(await errorCode(rpc(db, "activate_plus_sandbox", [])), "CN403");
  assert.equal(await hasPlus(A), false);
  await as(db, A);
  assert.equal(await errorCode(rpc(db, "set_plan_repeat", [plan, "week"])), "CN402", "la noche fija es Plus");
  await rpc(db, "set_plan_repeat", [plan, null]); // apagar siempre se puede
  const free = (await rpc(db, "repeat_plan", [plan, "plus-plan-free", "2030-02-01", "20:00", "America/Bogota"])).repeat_plan;
  assert.ok(free, "repetir a mano sigue siendo gratis");
});

test("el cliente no puede darse Plus: ni escribir derechos ni encender el sandbox ni llamar al webhook", async () => {
  await as(db, A);
  assert.equal(await errorCode(db.query("insert into public.entitlements (user_id, status, source, current_period_end) values ($1, 'active', 'sandbox', '2099-01-01')", [A])), "42501");
  assert.equal(await errorCode(db.query("update public.billing_config set sandbox = true")), "42501");
  assert.equal(await errorCode(billing(["x", "e-0", "activated", A, "2030-01-01T00:00:00Z", "2099-01-01T00:00:00Z", null])), "42501");
});

test("sandbox: cuenta activa 30 días sin cobro; anónima no; cada quien ve solo lo suyo", async () => {
  await asAdmin(db);
  await db.query("update public.billing_config set sandbox = true");
  await as(db, G, { anonymous: true });
  assert.equal(await errorCode(rpc(db, "activate_plus_sandbox", [])), "CN403");
  await as(db, A);
  const end = new Date((await rpc(db, "activate_plus_sandbox", [])).activate_plus_sandbox);
  const days = (end - Date.now()) / 86_400_000;
  assert.ok(days > 29.9 && days <= 30, `${days} días`);
  assert.equal(await hasPlus(A), true);
  await as(db, B);
  assert.deepEqual(await rows("select user_id from public.entitlements"), [], "B no ve los derechos de A");
  assert.equal(await hasPlus(B), false);
});

test("noche fija: solo quien organiza; programa la siguiente fecha futura con las mismas personas, idempotente", async () => {
  await as(db, B);
  assert.equal(await errorCode(rpc(db, "set_plan_repeat", [plan, "week"])), "CN403");
  await as(db, A);
  assert.equal(await errorCode(rpc(db, "set_plan_repeat", [plan, "daily"])), "CN422");
  assert.equal(await errorCode(rpc(db, "schedule_next_plan", [plan, "plus-next-0001"])), "CN422", "sin frecuencia no programa");
  await rpc(db, "set_plan_repeat", [plan, "week"]);
  const next = (await rpc(db, "schedule_next_plan", [plan, "plus-next-0001"])).schedule_next_plan;
  assert.equal((await rpc(db, "schedule_next_plan", [plan, "plus-next-0001"])).schedule_next_plan, next, "reintentar no duplica");
  const [row] = await rows("select to_char(starts_at at time zone time_zone, 'YYYY-MM-DD HH24:MI') as local, repeat_every from public.plans where id = $1", [next]);
  assert.deepEqual(row, { local: "2030-01-11 20:00", repeat_every: "week" });
  assert.deepEqual((await rows("select user_id from public.plan_members where plan_id = $1 order by user_id", [next])).map((member) => member.user_id), [A, B]);

  await asAdmin(db);
  await db.query("update public.plans set starts_at = now() - interval '20 days' where id = $1", [plan]);
  await as(db, A);
  const future = (await rpc(db, "schedule_next_plan", [plan, "plus-next-0002"])).schedule_next_plan;
  const [{ ahead }] = await rows("select starts_at > now() and starts_at <= now() + interval '7 days' as ahead from public.plans where id = $1", [future]);
  assert.equal(ahead, true, "salta a la siguiente fecha futura, no a una pasada");
});

test("cancelar conserva Plus hasta el fin del periodo; vencido ya no programa", async () => {
  await as(db, A);
  await rpc(db, "cancel_plus", []);
  assert.equal(await hasPlus(A), true, "cancelado sigue vigente hasta el fin del periodo");
  await as(db, A);
  assert.equal(await errorCode(rpc(db, "cancel_plus", [])), "CN404", "no se cancela dos veces");
  await asAdmin(db);
  await db.query("update public.entitlements set current_period_end = now() - interval '1 minute' where user_id = $1", [A]);
  assert.equal(await hasPlus(A), false);
  await as(db, A);
  assert.equal(await errorCode(rpc(db, "schedule_next_plan", [plan, "plus-next-0003"])), "CN402");
  await rpc(db, "set_plan_repeat", [plan, null]);
});

test("webhook de cobros: idempotente, ignora eventos viejos, cancela y vence con coherencia", async () => {
  await asService();
  assert.equal(await billing(["pasarela", "evt-1", "activated", B, "2030-01-01T00:00:00Z", "2030-02-01T00:00:00Z", "sub-b"]), "applied");
  assert.equal(await billing(["pasarela", "evt-1", "activated", B, "2030-01-01T00:00:00Z", "2030-02-01T00:00:00Z", "sub-b"]), "duplicate");
  assert.equal(await billing(["pasarela", "evt-2", "canceled", B, "2030-01-10T00:00:00Z", null, null]), "applied");
  assert.equal(await billing(["pasarela", "evt-0", "renewed", B, "2030-01-05T00:00:00Z", "2030-03-01T00:00:00Z", null]), "stale", "un evento viejo no reactiva");
  let [row] = await adminRows("select status, source, to_char(current_period_end at time zone 'UTC', 'YYYY-MM-DD') as ends from public.entitlements where user_id = $1", [B]);
  assert.deepEqual(row, { status: "canceled", source: "provider", ends: "2030-02-01" });
  assert.equal(await errorCode(billing(["pasarela", "evt-3", "renewed", B, "2030-01-11T00:00:00Z", "2030-01-01T00:00:00Z", null])), "CN422");
  assert.equal(await billing(["pasarela", "evt-4", "expired", B, "2030-01-12T00:00:00Z", null, null]), "applied");
  [row] = await adminRows("select status, to_char(current_period_end at time zone 'UTC', 'YYYY-MM-DD') as ends from public.entitlements where user_id = $1", [B]);
  assert.deepEqual(row, { status: "expired", ends: "2030-01-12" }, "vencido corta el periodo");
  assert.equal((await adminRows("select count(*)::int as n from public.billing_events"))[0].n, 4, "el evento rechazado no queda registrado");
});
