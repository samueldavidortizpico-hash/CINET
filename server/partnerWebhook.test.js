/* Webhook de ventas: firma, anti-repetición, idempotencia y comisión solo con confirmación. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { PassThrough } from "node:stream";
import { commissionFor, createPartnerWebhook, failureReply, readBody, signPayload } from "./partnerWebhook.js";

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

// ---------- N08: lector de cuerpo acotado (V22, V23) ----------

const stream = () => Object.assign(new PassThrough(), { headers: {} });

test("V22: un cuerpo excedido en varios trozos responde 413, deja de acumular y limpia oyentes", async () => {
  const req = stream();
  const pending = readBody(req, { limit: 16 });
  req.write("1234567890");
  req.write("1234567890");
  const error = await pending.catch((failure) => failure);
  assert.equal(error.status, 413);
  assert.equal(req.listenerCount("data"), 0, "sin oyente data que siga guardando");
  assert.equal(req.listenerCount("end"), 0);
  assert.equal(failureReply(error).status, 413);
  for (let index = 0; index < 100; index += 1) req.write("x".repeat(1000)); // lo que siga llegando se descarta
  req.end();
});

test("V23: el límite es en BYTES UTF-8 y los bytes llegan intactos aunque un carácter se parta entre trozos", async () => {
  const tooBig = stream();
  const rejected = readBody(tooBig, { limit: 16 });
  tooBig.end(Buffer.from("ñññññññññ")); // 9 caracteres, 18 bytes
  assert.equal((await rejected.catch((failure) => failure)).status, 413);

  const req = stream();
  const pending = readBody(req, { limit: 64 });
  const bytes = Buffer.from('{"t":"🎬ñ"}');
  req.write(bytes.subarray(0, 7)); // corta el emoji a la mitad
  req.end(bytes.subarray(7));
  const body = await pending;
  assert.ok(Buffer.isBuffer(body) && body.equals(bytes), "mismos bytes");
});

test("lector: cuerpo vacío, plazo de lectura y desconexión", async () => {
  const empty = stream();
  const pending = readBody(empty);
  empty.end();
  assert.equal((await pending).length, 0);

  const slow = stream();
  const timed = readBody(slow, { timeoutMs: 20 });
  slow.write("{");
  const timeout = await timed.catch((failure) => failure);
  assert.equal(timeout.status, 408);
  assert.equal(slow.listenerCount("data"), 0);

  const gone = stream();
  const aborted = readBody(gone);
  gone.emit("aborted");
  assert.equal((await aborted.catch((failure) => failure)).status, 400);
  assert.equal(gone.listenerCount("aborted"), 0);
});

test("V28: un evento válido cerca del umbral, leído como Buffer, verifica su firma sobre los bytes exactos", async () => {
  const { handle, saved } = setup();
  const body = Buffer.from(JSON.stringify({ ...sale, id: "venta-ñ", plan_ref: "x".repeat(200) }));
  const req = stream();
  const pending = readBody(req, { limit: body.length });
  req.end(body);
  const raw = await pending;
  const result = await handle({ headers: { "x-cinet-org": ORG, "x-cinet-timestamp": String(NOW / 1000), "x-cinet-signature": signPayload(SECRET, NOW / 1000, raw) }, body: raw });
  assert.equal(result.status, 400, "id con ñ no cumple el formato: 400 tras verificar la firma");
  const clean = Buffer.from(JSON.stringify({ ...sale, id: "venta-limite", plan_ref: "ñ".repeat(100) }));
  const ok = await handle({ headers: { "x-cinet-org": ORG, "x-cinet-timestamp": String(NOW / 1000), "x-cinet-signature": signPayload(SECRET, NOW / 1000, clean) }, body: clean });
  assert.equal(ok.status, 200);
  assert.equal(saved.size, 1);
});

// ---------- N23: plazo del almacenamiento (V29) ----------

test("V29: almacenamiento que no responde → 503 reintentable en tiempo acotado; reintento idempotente sin doble efecto", async () => {
  const committed = new Map();
  let hang = true;
  const handle = createPartnerWebhook({
    secretFor: () => SECRET,
    now: () => NOW,
    storeTimeoutMs: 250,
    store: {
      // Respuesta perdida tras el commit: escribe y luego no contesta.
      insert: (org, event, signal) => new Promise((resolve, reject) => {
        const key = `${org}:${event.external_id}`;
        const duplicate = committed.has(key);
        committed.set(key, event);
        if (!hang) return resolve(duplicate ? "duplicate" : "inserted");
        signal.addEventListener("abort", () => reject(signal.reason));
      }),
    },
  });
  const body = JSON.stringify(sale);
  const headers = { "x-cinet-org": ORG, "x-cinet-timestamp": String(NOW / 1000), "x-cinet-signature": signPayload(SECRET, NOW / 1000, body) };
  const started = Date.now();
  const first = await handle({ headers, body });
  assert.equal(first.status, 503);
  assert.equal(first.headers["retry-after"], "5");
  assert.ok(Date.now() - started < 2000, "respuesta acotada en tiempo");
  hang = false;
  const retry = await handle({ headers, body });
  assert.deepEqual([retry.status, JSON.parse(retry.body).duplicate], [200, true], "el reintento descubre que ya se registró");
  assert.equal(committed.size, 1, "un único efecto de negocio");
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
