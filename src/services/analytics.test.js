/* Analítica: contrato de eventos, consentimiento y nada de datos personales. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { createAnalytics, sanitize } from "./analytics.js";

const memory = () => {
  const data = new Map();
  return { read: (key, fallback) => (data.has(key) ? data.get(key) : fallback), write: (key, value) => data.set(key, value), data };
};

test("solo eventos y propiedades del contrato; nada personal", () => {
  assert.equal(sanitize("evento_inventado", {}), null);
  assert.deepEqual(sanitize("plan_created", { mode: "home", shared: true, email: "a@b.co", name: "Sam" }), { mode: "home", shared: true });
  assert.deepEqual(sanitize("rsvp_changed", { rsvp: "x".repeat(41) }), {}, "textos largos fuera");
  assert.deepEqual(sanitize("invite_accepted", { token: "secreto" }), {}, "el token de invitación nunca se mide");
});

test("sin consentimiento o sin endpoint no se envía nada; retirar borra el id", () => {
  const sent = [];
  const storage = memory();
  const analytics = createAnalytics({ endpoint: "https://example.test/e", storage, send: (url, body) => sent.push(body), randomId: () => "id-1" });
  assert.equal(analytics.track("plan_created", { mode: "home" }), false, "sin decidir");
  analytics.setConsent("granted");
  assert.equal(analytics.track("plan_created", { mode: "home", shared: false }), true);
  assert.deepEqual(sent[0].props, { mode: "home", shared: false });
  assert.equal(sent[0].anonymous_id, "id-1");
  analytics.setConsent("denied");
  assert.equal(storage.data.get("cinet-analytics-id"), null, "el id anónimo se borra");
  assert.equal(analytics.track("plan_created", { mode: "home" }), false);

  const off = createAnalytics({ endpoint: undefined, storage: memory(), send: () => sent.push("x") });
  off.setConsent("granted");
  assert.equal(off.track("plan_created", { mode: "home" }), false, "sin proveedor no se simula medición");
  assert.equal(sent.length, 1);
});
