/* Webhook de ventas: firma, anti-repetición, idempotencia y comisión solo con confirmación. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { commissionFor, createPartnerWebhook, signPayload } from "./partnerWebhook.js";

const ORG = "aaaaaaaa-3333-4000-8000-000000000001";
const SECRET = "secreto-de-prueba-del-aliado";
const NOW = Date.parse("2026-10-10T20:00:00Z");

function setup() {
  const saved = new Map();
  const handle = createPartnerWebhook({
    secretFor: (org) => (org === ORG ? SECRET : null),
    store: { insert: async (org, event) => (saved.has(`${org}:${event.external_id}`) ? "duplicate" : (saved.set(`${org}:${event.external_id}`, event), "inserted")) },
    now: () => NOW,
  });
  const send = (payload, { secret = SECRET, at = NOW / 1000, org = ORG } = {}) => {
    const body = JSON.stringify(payload);
    return handle({ headers: { "x-cinet-org": org, "x-cinet-timestamp": String(at), "x-cinet-signature": signPayload(secret, at, body) }, body });
  };
  return { saved, handle, send };
}

const sale = { id: "venta-1", type: "sale_confirmed", amount_cop: 36000, occurred_at: "2026-10-10T19:00:00Z", plan_ref: "plan-123" };

test("solo entra con la firma correcta del aliado y dentro de la ventana", async () => {
  const { send, handle, saved } = setup();
  assert.equal((await send(sale, { secret: "otro" })).status, 401);
  assert.equal((await send(sale, { org: "bbbbbbbb-3333-4000-8000-000000000002" })).status, 401, "aliado desconocido");
  assert.equal((await send(sale, { at: NOW / 1000 - 600 })).status, 401, "repetición vieja");
  assert.equal((await handle({ headers: { "x-cinet-org": ORG }, body: JSON.stringify(sale) })).status, 401, "sin firma");
  const body = JSON.stringify(sale);
  const tampered = await handle({
    headers: { "x-cinet-org": ORG, "x-cinet-timestamp": String(NOW / 1000), "x-cinet-signature": signPayload(SECRET, NOW / 1000, body) },
    body: body.replace("36000", "99000"),
  });
  assert.equal(tampered.status, 401, "cuerpo alterado");
  assert.equal(saved.size, 0);
});

test("valida el evento y es idempotente", async () => {
  const { send, saved } = setup();
  assert.equal((await send({ ...sale, amount_cop: -5 })).status, 400);
  assert.equal((await send({ ...sale, type: "click" })).status, 400, "un clic no es una venta");
  assert.equal((await send({ id: "r1", type: "sale_refunded", amount_cop: 1, occurred_at: sale.occurred_at })).status, 400, "reembolso sin refund_of");
  const first = await send(sale);
  const again = await send(sale);
  assert.deepEqual([first.status, JSON.parse(first.body).duplicate], [200, false]);
  assert.deepEqual([again.status, JSON.parse(again.body).duplicate], [200, true]);
  assert.equal(saved.size, 1);
});

test("comisión: solo ventas confirmadas y sin reembolso", () => {
  const events = [
    { external_id: "v1", kind: "sale_confirmed", amount_cop: 36000 },
    { external_id: "v2", kind: "sale_confirmed", amount_cop: 20000 },
    { external_id: "r1", kind: "sale_refunded", refund_of: "v2", amount_cop: 20000 },
  ];
  assert.deepEqual(commissionFor(events, 0.05), { sales: 1, gross: 36000, commission: 1800 });
  assert.deepEqual(commissionFor([], 0.05), { sales: 0, gross: 0, commission: 0 });
});
