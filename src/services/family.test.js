/* Modo familia: clasificación exacta, «sin clasificar» nunca es apto y nada sin comprobar. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_DUO_SESSION, familyFilter } from "../data/duo.js";
import { asSession } from "../hooks/useDuoSession.js";
import { getDuoCandidates } from "./duoService.js";
import { buildProfile } from "./recommender.js";
import { configureTmdb } from "./tmdbClient.js";

test("referencia por región: México con su sistema; el resto con EE. UU. y avisado", () => {
  assert.equal(familyFilter("off", "CO"), null);
  assert.equal(familyFilter("inventado", "CO"), null);
  assert.deepEqual(familyFilter("kids", "CO"), { level: "kids", country: "US", system: "EE. UU. (MPA)", certifications: ["G", "PG"], fallback: true });
  assert.deepEqual(familyFilter("teens", "MX").certifications, ["AA", "A", "B"]);
  assert.equal(familyFilter("teens", "MX").fallback, false);
  assert.equal(asSession({ family: "kids" }).family, "kids");
  assert.equal(asSession({ family: "<script>" }).family, "off");
});

test("sin catálogo en vivo, o con series, el modo familia no muestra nada", async () => {
  configureTmdb({ token: "" });
  const movies = await getDuoCandidates(buildProfile({ ...DEFAULT_DUO_SESSION, family: "all" }));
  assert.deepEqual([movies.source, movies.titles.length], ["family", 0]);
  assert.match(movies.notice, /no mostramos títulos cuya clasificación no podemos comprobar/);
  const series = await getDuoCandidates(buildProfile({ ...DEFAULT_DUO_SESSION, mode: "tv", family: "all" }));
  assert.match(series.notice, /no permite filtrar series/);
  const normal = await getDuoCandidates(buildProfile(DEFAULT_DUO_SESSION));
  assert.ok(normal.titles.length > 0, "sin modo familia, el catálogo local sigue disponible");
});

test("con TMDB, cada consulta pide la lista exacta de clasificaciones (nunca «hasta»)", async () => {
  const urls = [];
  configureTmdb({
    token: "t",
    retryDelay: 0,
    fetch: async (url) => {
      urls.push(new URL(String(url)));
      return { ok: true, status: 200, json: async () => ({ results: [], page: 1, total_pages: 1, total_results: 0 }) };
    },
  });
  try {
    await getDuoCandidates(buildProfile({ ...DEFAULT_DUO_SESSION, family: "kids", region: "CO" }), { saga: true });
    const discover = urls.filter((url) => url.pathname.endsWith("/discover/movie"));
    assert.ok(discover.length > 0);
    for (const url of discover) {
      assert.equal(url.searchParams.get("certification_country"), "US");
      assert.equal(url.searchParams.get("certification"), "G|PG");
      assert.equal(url.searchParams.get("certification.lte"), null);
    }
    assert.ok(!urls.some((url) => url.pathname.includes("/collection/")), "sin partes de saga sin filtrar");
  } finally {
    configureTmdb({ token: "" });
  }
});
