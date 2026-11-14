/* Auditoría 2026-11-07 · N05 (V11–V14): orden, duplicados y permutaciones de eventos de facturación (PGlite). */
import { test } from "node:test";
import assert from "node:assert/strict";
import { as, asAdmin, createDb, createUsers, errorCode } from "./db.js";

const id = (n) => `${String(n).padStart(8, "0")}-5555-4000-8000-${String(n).padStart(12, "0")}`;
const db = await createDb();
const users = Array.from({ length: 30 }, (_, index) => id(index + 1));
await createUsers(db, users.map((userId) => ({ id: userId })));
await asAdmin(db);

const day = (n) => `2030-01-${String(n).padStart(2, "0")}T00:00:00Z`;
const apply = async (user, event) => {
  const { rows } = await db.query("select public.apply_billing_event('p', $6 || ':' || $1, $2, $3, $4, $5, null) as r", [event.id, event.kind, user, event.at, event.end ?? null, user]);
  return rows[0].r;
};
const state = async (user) => (await db.query("select status, to_char(current_period_end at time zone 'UTC', 'YYYY-MM-DD') as ends from public.entitlements where user_id = $1", [user])).rows[0] ?? null;

test("V11: expirar primero y luego una activación MÁS ANTIGUA no reactiva Plus", async () => {
  const user = users[0];
  assert.equal(await apply(user, { id: "e-expired", kind: "expired", at: day(2) }), "stale", "sin derecho previo: se registra y no cambia nada");
  assert.equal(await apply(user, { id: "e-old", kind: "activated", at: day(1), end: day(20) }), "applied");
  assert.deepEqual(await state(user), { status: "expired", ends: "2030-01-02" }, "gana el evento posterior, no el que llegó último");
  await as(db, user);
  assert.equal((await db.query("select public.has_plus() as plus")).rows[0].plus, false);
  await asAdmin(db);
});

test("V12: id repetido = un solo efecto; fechas iguales se desempatan por event_id", async () => {
  const user = users[1];
  assert.equal(await apply(user, { id: "a-1", kind: "activated", at: day(1), end: day(20) }), "applied");
  assert.equal(await apply(user, { id: "a-1", kind: "activated", at: day(1), end: day(25) }), "duplicate");
  assert.equal((await state(user)).ends, "2030-01-20", "el duplicado no cambia el periodo");
  assert.equal((await db.query("select count(*)::int as n from public.billing_events where user_id = $1", [user])).rows[0].n, 1);
  // Mismo instante: «z-cancel» > «a-1» por event_id → la cancelación gana siempre, en cualquier orden.
  await apply(user, { id: "z-cancel", kind: "canceled", at: day(1) });
  assert.equal((await state(user)).status, "canceled");
  const other = users[2];
  await apply(other, { id: "z-cancel", kind: "canceled", at: day(1) });
  await apply(other, { id: "a-1", kind: "activated", at: day(1), end: day(20) });
  assert.deepEqual(await state(other), await state(user), "mismo estado sin importar el orden de llegada");
});

test("V11/V13: TODAS las permutaciones de activar, renovar, cancelar y expirar llegan al mismo estado final", async () => {
  const events = [
    { id: "ev-1", kind: "activated", at: day(1), end: day(10) },
    { id: "ev-2", kind: "renewed", at: day(8), end: day(20) },
    { id: "ev-3", kind: "canceled", at: day(12) },
    { id: "ev-4", kind: "expired", at: day(21) },
  ];
  const permutations = (list) => (list.length <= 1 ? [list] : list.flatMap((item, index) => permutations([...list.slice(0, index), ...list.slice(index + 1)]).map((rest) => [item, ...rest])));
  const finals = new Set();
  let n = 0;
  for (const order of permutations(events)) {
    const user = users[3 + n];
    n += 1;
    for (const event of order) await apply(user, event);
    finals.add(JSON.stringify(await state(user)));
  }
  assert.equal(n, 24);
  assert.deepEqual([...finals], [JSON.stringify({ status: "expired", ends: "2030-01-20" })], "24 permutaciones, un único estado");
});

test("V11: cancelar conserva el acceso hasta el fin del periodo y una renovación posterior lo restablece", async () => {
  const user = users[27];
  await apply(user, { id: "c-1", kind: "activated", at: day(1), end: day(30) });
  await apply(user, { id: "c-2", kind: "canceled", at: day(5) });
  assert.deepEqual(await state(user), { status: "canceled", ends: "2030-01-30" });
  await apply(user, { id: "c-3", kind: "renewed", at: day(6), end: day(31) });
  assert.deepEqual(await state(user), { status: "active", ends: "2030-01-31" });
});

test("V14: una cuenta normal no puede llamar a facturación ni leer el estado de control", async () => {
  await as(db, users[0]);
  assert.equal(await errorCode(db.query("select public.apply_billing_event('p', 'x', 'expired', $1, now(), null, null)", [users[0]])), "42501");
  assert.equal(await errorCode(db.query("select * from public.billing_state")), "42501");
  await asAdmin(db);
});

test("N05 entradas inválidas: tipo desconocido y periodo ausente → CN422", async () => {
  assert.equal(await errorCode(apply(users[28], { id: "bad-1", kind: "refund", at: day(1) })), "CN422");
  assert.equal(await errorCode(apply(users[28], { id: "bad-2", kind: "activated", at: day(1) })), "CN422");
});
