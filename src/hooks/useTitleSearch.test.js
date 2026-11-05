import { test } from "node:test";
import assert from "node:assert/strict";
import { applySearchError } from "./useTitleSearch.js";

test("FE01: un error de paginación antigua no contamina la búsqueda actual", () => {
  const current = { key: "B", titles: [{ id: 2 }], loadingMore: true, error: null };
  assert.equal(applySearchError(current, "A", new Error("A falló")), current);
  const error = new Error("B falló");
  assert.deepEqual(applySearchError(current, "B", error), { ...current, loadingMore: false, error });
});
