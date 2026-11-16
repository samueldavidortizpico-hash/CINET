import { test } from "node:test";
import assert from "node:assert/strict";
import { collectDataPages, decodeCursor, encodeCursor, readDataPage } from "./dataPagination.js";
import { comparePlanStart } from "./groupRepository.js";

const id = "00000001-7777-4000-8000-000000000001";
const position = { createdAt: "2026-11-15T22:00:00.123456+00:00", id };

test("presentación de planes de grupo conserva hora ascendente y sin fecha al final", () => {
  const data = [
    { id: "z", startsAt: null }, { id: "b", startsAt: "2030-01-02T00:00:00Z" },
    { id: "a", startsAt: "2030-01-01T20:00:00-05:00" }, { id: "y", startsAt: null },
  ];
  assert.deepEqual(data.sort(comparePlanStart).map((plan) => plan.id), ["b", "a", "y", "z"]);
});

test("cursor conserva microsegundos y admite ambos runtimes sin Buffer", () => {
  assert.deepEqual(decodeCursor(encodeCursor(position)), position);
  const audit = { ...position, id: "9007199254740993" };
  assert.deepEqual(decodeCursor(encodeCursor(audit, { integerId: true }), { integerId: true }), audit);
  assert.throws(() => encodeCursor({ ...audit, id: "9223372036854775808" }, { integerId: true }), { code: "CN422" });
});

test("cursor rechaza fechas normalizadas imposibles y estructuras manipuladas", () => {
  for (const createdAt of ["2026-02-31T00:00:00Z", "2025-02-29T00:00:00Z", "2026-13-01T00:00:00Z", "2026-01-01T24:00:00Z", "2026-01-01T00:00:00+14:30", "now()", "2026-01-01"]) {
    assert.throws(() => encodeCursor({ ...position, createdAt }), { code: "CN422" });
  }
  assert.equal(decodeCursor(encodeCursor({ ...position, createdAt: "2024-02-29T00:00:00Z" })).createdAt, "2024-02-29T00:00:00Z");
  for (const raw of ["", "!", "x".repeat(301), btoa(JSON.stringify({ v: 2, ...position })), btoa(JSON.stringify({ v: 1, ...position, limit: 10000 }))]) {
    assert.throws(() => decodeCursor(raw), { code: "CN422" });
  }
});

test("más de 200 resultados, vacío y duplicados no inventan ni pierden identidades", async () => {
  const rows = Array.from({ length: 251 }, (_, id) => ({ id }));
  const cursors = [];
  const data = await collectDataPages(async (cursor) => {
    cursors.push(cursor);
    const start = Number(cursor ?? 0);
    return { items: [...(start ? [rows[start - 1]] : []), ...rows.slice(start, start + 50)], nextCursor: start + 50 < rows.length ? String(start + 50) : null };
  });
  assert.deepEqual(data, rows);
  assert.equal(cursors.length, 6);
  assert.deepEqual(await collectDataPages(async () => ({ items: [], nextCursor: null })), []);
});

test("fallo en página intermedia se propaga y se puede reintentar el mismo cursor", async () => {
  const cursor = encodeCursor(position);
  let fail = true;
  const requests = [];
  const db = { rpc: async (_name, args) => {
    requests.push(args);
    if (fail) return { error: { code: "503", message: "offline" } };
    return { data: { items: [{ id }], nextCursor: null } };
  } };
  await assert.rejects(readDataPage(db, "list_plans_page", {}, { cursor }), { code: "503" });
  fail = false;
  assert.deepEqual((await readDataPage(db, "list_plans_page", {}, { cursor })).items, [{ id }]);
  assert.deepEqual(requests[0], requests[1]);
  assert.equal(requests[0].p_cursor_at, position.createdAt);
  assert.equal("limit" in requests[0], false);
});

test("respuesta que excede el máximo y cursor repetido fallan sin bucle infinito", async () => {
  await assert.rejects(readDataPage({ rpc: async () => ({ data: { items: Array(51), nextCursor: null } }) }, "test"), /Respuesta de paginación/);
  await assert.rejects(collectDataPages(async () => ({ items: [], nextCursor: "same" })), /repitió un cursor/);
});
