import { test } from "node:test";
import assert from "node:assert/strict";
import { keysetFilter, makeKeysetCursor, normalizeKeysetCursor, prependUniquePage, takeKeysetPage } from "./keysetCursor.js";

const row = (id, created_at = "2026-11-17T12:00:00.000Z") => ({ id, created_at });
const ids = Array.from({ length: 5 }, (_, index) => `00000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`);

test("crea cursores estables con fecha normalizada e id en minúscula", () => {
  assert.deepEqual(makeKeysetCursor(row(ids[0].toUpperCase(), "2026-11-17T07:00:00-05:00"), "created_at"), {
    value: "2026-11-17T12:00:00.000Z",
    id: ids[0],
  });
});

test("rechaza columnas, fechas e ids que podrían alterar el filtro", () => {
  assert.throws(() => makeKeysetCursor(row(ids[0]), "owner_id"), /Columna/);
  assert.throws(() => makeKeysetCursor({ id: ids[0], created_at: "not-a-date" }, "created_at"), /fecha/);
  assert.throws(() => makeKeysetCursor(row("1)\u0026owner_id.eq.other"), "created_at"), /fecha/);
  assert.equal(normalizeKeysetCursor({ value: "yesterday", id: ids[0] }, "created_at"), null);
  assert.equal(normalizeKeysetCursor({ value: "2026-11-17", id: "bad" }, "created_at"), null);
});

test("forma el filtro descendente y ascendente con desempate por UUID", () => {
  const cursor = makeKeysetCursor(row(ids[2]), "created_at");
  assert.equal(keysetFilter(cursor, "created_at", "desc"), `created_at.lt.2026-11-17T12:00:00.000Z,and(created_at.eq.2026-11-17T12:00:00.000Z,id.lt.${ids[2]})`);
  assert.equal(keysetFilter(cursor, "created_at", "asc"), `created_at.gt.2026-11-17T12:00:00.000Z,and(created_at.eq.2026-11-17T12:00:00.000Z,id.gt.${ids[2]})`);
  assert.throws(() => keysetFilter(cursor, "created_at", "sideways"), /Dirección/);
});

test("una página con exactamente el límite no anuncia una página falsa", () => {
  const page = takeKeysetPage(ids.slice(0, 3).map((id) => row(id)), 3, "created_at");
  assert.equal(page.items.length, 3);
  assert.equal(page.hasMore, false);
  assert.equal(page.nextCursor, null);
});

test("conserva el cursor de la última fila visible y excluye la fila centinela", () => {
  const rows = ids.map((id) => row(id));
  const page = takeKeysetPage(rows, 4, "created_at");
  assert.deepEqual(page.items.map(({ id }) => id), ids.slice(0, 4));
  assert.equal(page.hasMore, true);
  assert.deepEqual(page.nextCursor, { value: "2026-11-17T12:00:00.000Z", id: ids[3] });
});

test("paginar un fixture con fechas empatadas no pierde ni repite IDs", () => {
  const sorted = ids.map((id) => row(id)).sort((a, b) => b.created_at.localeCompare(a.created_at) || b.id.localeCompare(a.id));
  const first = takeKeysetPage(sorted, 3, "created_at");
  const afterCursor = sorted.filter((item) => item.created_at < first.nextCursor.value || (item.created_at === first.nextCursor.value && item.id < first.nextCursor.id));
  const second = takeKeysetPage(afterCursor, 3, "created_at");
  assert.deepEqual([...first.items, ...second.items].map(({ id }) => id), sorted.map(({ id }) => id));
  assert.equal(new Set([...first.items, ...second.items].map(({ id }) => id)).size, sorted.length);
  assert.equal(second.hasMore, false);
});

test("une la página anterior delante de la actual sin duplicar filas concurrentes", () => {
  const existing = [{ id: ids[3], name: "actual" }, { id: ids[4], name: "actual" }];
  const older = [{ id: ids[1], name: "anterior" }, { id: ids[2], name: "anterior" }, { id: ids[3], name: "repetido" }];
  assert.deepEqual(prependUniquePage(existing, older), [older[0], older[1], ...existing]);
  assert.throws(() => prependUniquePage({}, older), /listas/);
});
