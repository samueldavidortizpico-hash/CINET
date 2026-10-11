/* Webhook de cobros: firma, ventana, validación y paso a la base (la idempotencia la prueba supabase/tests/plus.test.js). */
import { test } from "node:test";
import assert from "node:assert/strict";
import { createBillingWebhook } from "./billingWebhook.js";
import { signPayload } from "./partnerWebhook.js";

const SECRET = "secreto-de-prueba-cobros-0001";
const NOW = Date.parse("2030-01-01T12:00:00Z");
const USER = "00000001-4444-4000-8000-000000000001";

function setup() {
  const applied = [];
  const handle = createBillingWebhook({ secret: SECRET, provider: "sandbox", now: () => NOW, store: { apply: async (provider, event) => (applied.push([provider, event]), "applied") } });
  const send = (event, { secret = SECRET, timestamp = NOW / 1000 } = {}) => {
    const body = JSON.stringify(event);
    return handle({ headers: { "x-cinet-timestamp": String(timestamp), "x-cinet-signature": signPayload(secret, timestamp, body) }, body });
  };
  return { applied, handle, send };
}

const activated = { id: "evt-1", type: "activated", user_id: USER, occurred_at: "2030-01-01T11:59:00Z", period_end: "2030-02-01T00:00:00Z", subscription_ref: "sub-1" };

test("un evento firmado y válido llega a la base normalizado", async () => {
  const { applied, send } = setup();
  const response = await send(activated);
  assert.equal(response.status, 200);
  assert.deepEqual(JSON.parse(response.body), { received: true, result: "applied" });
  assert.deepEqual(applied, [["sandbox", {
    p_event_id: "evt-1", p_kind: "activated", p_user: USER, p_occurred_at: "2030-01-01T11:59:00.000Z", p_period_end: "2030-02-01T00:00:00.000Z", p_provider_ref: "sub-1",
  }]]);
});

test("sin firma válida o fuera de la ventana no toca la base", async () => {
  const { applied, handle, send } = setup();
  assert.equal((await send(activated, { secret: "otro-secreto-de-prueba-0002" })).status, 401);
  assert.equal((await send(activated, { timestamp: NOW / 1000 - 600 })).status, 401, "repetición vieja");
  assert.equal((await handle({ headers: {}, body: JSON.stringify(activated) })).status, 401);
  assert.equal(applied.length, 0);
});

test("datos inválidos se rechazan con 400: sin periodo, tipo desconocido, usuario mal formado", async () => {
  const { applied, send } = setup();
  for (const bad of [
    { ...activated, period_end: undefined },
    { ...activated, period_end: "2029-12-01T00:00:00Z" },
    { ...activated, type: "refund_everything" },
    { ...activated, user_id: "ana@cinet.test" },
  ]) assert.equal((await send(bad)).status, 400, JSON.stringify(bad));
  assert.equal((await send({ id: "evt-2", type: "canceled", user_id: USER, occurred_at: "2030-01-01T11:59:00Z" })).status, 200, "cancelar no necesita periodo");
  assert.equal(applied.length, 1);
});
