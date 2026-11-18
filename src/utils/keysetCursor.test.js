import { test } from "node:test";
import assert from "node:assert/strict";
import { appendUniquePage, keysetFilter, makeKeysetCursor, normalizeKeysetCursor, prependUniquePage, queryKeysetPage, takeKeysetPage } from "./keysetCursor.js";

const row = (id, created_at = "2026-11-17T12:00:00.000Z") => ({ id, created_at });
const ids = Array.from({ length: 5 }, (_, index) => `00000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`);

test("normaliza fechas a UTC, preserva microsegundos e ids en minúscula", () => {
  assert.deepEqual(makeKeysetCursor(row(ids[0].toUpperCase(), "2026-11-17T07:00:00.123456-05:00"), "created_at"), {
    value: "2026-11-17T12:00:00.123456Z",
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

test("las fechas de inicio nulas quedan al final y también admiten cursor estable", () => {
  const timed = makeKeysetCursor({ id: ids[0], starts_at: "2026-11-17T12:00:00.000Z" }, "starts_at");
  const empty = makeKeysetCursor({ id: ids[1], starts_at: null }, "starts_at");
  assert.match(keysetFilter(timed, "starts_at", "asc"), /starts_at\.is\.null$/);
  assert.deepEqual(empty, { value: null, id: ids[1] });
  assert.equal(keysetFilter(empty, "starts_at", "asc"), `starts_at.is.null,and(starts_at.is.null,id.gt.${ids[1]})`);
  assert.throws(() => keysetFilter(empty, "starts_at", "desc"), /ascendente/);
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

test("añade la página siguiente después de la lista cronológica sin repetir filas", () => {
  const existing = [{ id: ids[0] }, { id: ids[1] }];
  const next = [{ id: ids[1] }, { id: ids[2] }, { id: ids[3] }];
  assert.deepEqual(appendUniquePage(existing, next), [...existing, next[1], next[2]]);
  assert.throws(() => appendUniquePage(null, next), /listas/);
});

function queryDatabase(result) {
  const calls = [];
  const query = {};
  for (const method of ["select", "eq", "or", "order", "limit"]) {
    query[method] = (...args) => { calls.push([method, ...args]); return query; };
  }
  query.then = (resolve, reject) => Promise.resolve(result).then(resolve, reject);
  return { calls, from(table) { calls.push(["from", table]); return query; } };
}

test("una consulta de historial ordena por fecha e id y pide una fila centinela", async () => {
  const db = queryDatabase({ data: [row(ids[0]), row(ids[1])], error: null });
  const page = await queryKeysetPage(db, { table: "plans", select: "id,created_at", column: "created_at", direction: "desc", pageSize: 1 });
  assert.deepEqual(db.calls, [
    ["from", "plans"], ["select", "id,created_at"],
    ["order", "created_at", { ascending: false }], ["order", "id", { ascending: false }], ["limit", 2],
  ]);
  assert.deepEqual(page.items, [row(ids[0])]);
  assert.equal(page.hasMore, true);
});

test("la consulta de planes de grupo conserva el filtro de grupo y agrega el cursor compuesto", async () => {
  const cursor = makeKeysetCursor({ id: ids[1], starts_at: "2026-11-17T12:00:00.000Z" }, "starts_at");
  const db = queryDatabase({ data: [], error: null });
  const page = await queryKeysetPage(db, {
    table: "plans", select: "id,starts_at", filters: [["group_id", ids[4]]],
    column: "starts_at", direction: "asc", pageSize: 200, cursor,
  });
  assert.deepEqual(db.calls.slice(0, 5), [
    ["from", "plans"], ["select", "id,starts_at"], ["eq", "group_id", ids[4]],
    ["or", keysetFilter(cursor, "starts_at", "asc")], ["order", "starts_at", { ascending: true, nullsFirst: false }],
  ]);
  assert.deepEqual(db.calls.slice(-2), [["order", "id", { ascending: true }], ["limit", 201]]);
  assert.deepEqual(page, { items: [], hasMore: false, nextCursor: null });
});

test("la paginación propaga errores de PostgREST y valida la consulta antes de ejecutarla", async () => {
  const failure = { code: "08006", message: "offline" };
  const db = queryDatabase({ data: null, error: failure });
  await assert.rejects(queryKeysetPage(db, { table: "groups", select: "id", column: "created_at", direction: "asc", pageSize: 100 }), (error) => error === failure);
  assert.equal(db.calls.at(-1)[1], 101);
  const invalidDb = queryDatabase({ data: [], error: null });
  await assert.rejects(queryKeysetPage(invalidDb, { table: "plans;delete", select: "id", column: "created_at", pageSize: 20 }), /Consulta/);
  await assert.rejects(queryKeysetPage(invalidDb, { table: "plans", select: "id", filters: [["group_id.eq.anything", ids[0]]], column: "created_at", pageSize: 20 }), /Filtro/);
  assert.deepEqual(invalidDb.calls, []);
});

test("el máximo de página respeta el techo de PostgREST y rechaza valores del cliente", async () => {
  const db = queryDatabase({ data: [], error: null });
  await assert.rejects(queryKeysetPage(db, { table: "plans", select: "id", column: "created_at", pageSize: 501 }), /Tamaño/);
  assert.deepEqual(db.calls, []);
});

test("recorre 205 filas con fechas repetidas en varios tamaños sin perder ni repetir registros", () => {
  const rows = Array.from({ length: 205 }, (_, index) => ({
    id: `00000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
    created_at: new Date(Date.UTC(2026, 10, 17, 12, Math.floor(index / 7))).toISOString(),
  })).sort((a, b) => b.created_at.localeCompare(a.created_at) || b.id.localeCompare(a.id));

  for (const size of [1, 3, 17, 200]) {
    const visited = [];
    let pending = rows;
    let pages = 0;
    while (pending.length) {
      const page = takeKeysetPage(pending, size, "created_at");
      visited.push(...page.items.map(({ id }) => id));
      pages += 1;
      if (!page.hasMore) break;
      const cursor = page.nextCursor;
      pending = pending.filter((item) => item.created_at < cursor.value || (item.created_at === cursor.value && item.id < cursor.id));
    }
    assert.deepEqual(visited, rows.map(({ id }) => id), `tamaño ${size}`);
    assert.equal(new Set(visited).size, rows.length, `sin duplicados, tamaño ${size}`);
    assert.equal(pages, Math.ceil(rows.length / size), `número de páginas, tamaño ${size}`);
  }
});
