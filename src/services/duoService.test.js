import { test } from "node:test";
import assert from "node:assert/strict";
import { getDuoCandidates, mergeTitlesById } from "./duoService.js";
import { configureTmdb } from "./tmdbClient.js";
import { buildProfile, rankTitles } from "./recommender.js";
import { DEFAULT_DUO_SESSION, DEFAULT_PERSON } from "../data/duo.js";

test("FE05: deduplicar candidatos conserva coincidencias de todos los actores", () => {
  const result = mergeTitlesById([
    { id: "tmdb-1", title: "Prueba", castMatch: ["Actriz A"], origin: "cast" },
    { id: "tmdb-1", title: "Prueba", castMatch: ["Actor B", "Actriz A"], origin: "popular" },
  ]);
  assert.equal(result.length, 1);
  assert.deepEqual(result[0].castMatch, ["Actriz A", "Actor B"]);
});

test("fuentes acotadas independientes del orden de las ocho personas", async () => {
  const tastes = [["drama"], ["comedy"], ["crime"], ["thriller"], ["romance"], ["action"], ["adventure"], ["science-fiction"]];
  const people = tastes.map((genres, index) => ({ ...DEFAULT_PERSON, name: `P${index}`, genres, actors: [{ id: 100 + index, name: `Actor ${index}` }] }));
  const requested = async (order) => {
    const urls = [];
    configureTmdb({ token: "synthetic", fetch: async (url) => {
      urls.push(String(url));
      return { ok: true, status: 200, json: async () => ({ results: [], page: 1, total_pages: 1 }) };
    } });
    await getDuoCandidates(buildProfile({ ...DEFAULT_DUO_SESSION, people: order }));
    return urls.sort();
  };
  try {
    const forward = await requested(people);
    assert.deepEqual(await requested([...people].reverse()), forward);
    assert.deepEqual(await requested([...people.slice(3), ...people.slice(0, 3)]), forward);
    const cast = forward.filter((url) => new URL(url).searchParams.has("with_cast"));
    assert.equal(cast.length, 4, "se conserva el presupuesto existente, sin afirmar cobertura de ocho actores");
    const pairs = forward.filter((url) => new URL(url).searchParams.get("with_genres")?.includes(","));
    assert.equal(new Set(pairs).size, pairs.length, "una combinación no se consulta de nuevo en otro orden");
  } finally { configureTmdb({ token: "" }); }
});

test("familia CO conserva la prueba de discover hasta el ranking y no consulta sagas sin clasificar", async () => {
  const urls = [];
  configureTmdb({ token: "synthetic", fetch: async (url) => {
    const path = new URL(String(url)).pathname; urls.push(path);
    const raw = { id: 987123, title: "Título ficticio", genre_ids: [18], release_date: "2020-01-01", vote_average: 7, vote_count: 1000 };
    const data = path.endsWith("/discover/movie") ? { results: [raw], page: 1, total_pages: 1 }
      : path.endsWith("/watch/providers") ? { results: { CO: { flatrate: [{ provider_id: 8, provider_name: "Netflix" }] } } }
      : { ...raw, runtime: 95, genres: [{ id: 18, name: "Drama" }] };
    return { ok: true, status: 200, json: async () => data };
  } });
  const profile = buildProfile({ ...DEFAULT_DUO_SESSION, family: "kids", region: "CO", people: [{ ...DEFAULT_PERSON, genres: ["drama"] }] });
  try {
    const result = await getDuoCandidates(profile, { saga: true });
    assert.equal(result.source, "tmdb");
    assert.equal(result.titles.length, 1);
    assert.deepEqual(result.titles[0].filtered.family, { country: "US", certifications: ["G", "PG"] });
    assert.equal(rankTitles(result.titles, profile).strict, 1);
    assert.ok(!urls.some((url) => url.includes("/collection/")));
    assert.equal(rankTitles(result.titles.map((title) => ({ ...title, filtered: {} })), profile).items.length, 0);
  } finally { configureTmdb({ token: "" }); }
});
