import { test } from "node:test";
import assert from "node:assert/strict";
import { mergeTitlesById } from "./duoService.js";

test("FE05: deduplicar candidatos conserva coincidencias de todos los actores", () => {
  const result = mergeTitlesById([
    { id: "tmdb-1", title: "Prueba", castMatch: ["Actriz A"], origin: "cast" },
    { id: "tmdb-1", title: "Prueba", castMatch: ["Actor B", "Actriz A"], origin: "popular" },
  ]);
  assert.equal(result.length, 1);
  assert.deepEqual(result[0].castMatch, ["Actriz A", "Actor B"]);
});
