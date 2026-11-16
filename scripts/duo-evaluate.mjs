/* Evaluación sintética offline. No mide precisión de gustos ni latencia de TMDB.
   node scripts/duo-evaluate.mjs [--sizes=100,500,1000,2000] > evaluacion.json */
import assert from "node:assert/strict";
import { performance } from "node:perf_hooks";
import { DEFAULT_DUO_SESSION, DEFAULT_PERSON } from "../src/data/duo.js";
import { buildMarathon, buildProfile, pickFinalists, rankTitles, scoreTitle } from "../src/services/recommender.js";

const now = "2026-11-15";
const person = (index, patch = {}) => ({ ...DEFAULT_PERSON, name: `P${index}`, genres: ["drama"], ...patch });
const session = (size, patch = {}) => ({ ...DEFAULT_DUO_SESSION, people: Array.from({ length: size }, (_, index) => person(index)), ...patch });
const film = (id, patch = {}) => ({ id, title: id, type: "movie", genreKeys: ["drama"], runtime: 100, rating: 7, votes: 1000, popularity: 20, releaseDate: "2020-01-01", ...patch });
const custom = process.argv.find((argument) => argument.startsWith("--sizes="));
const sizes = custom ? custom.slice(8).split(",").map(Number) : [100, 500, 1000, 2000];
if (!sizes.length || sizes.length > 10 || sizes.some((size) => !Number.isInteger(size) || size < 1 || size > 5000)) {
  throw new RangeError("Usa entre 1 y 10 tamaños enteros de 1 a 5000 títulos.");
}
const result = { runtime: process.version, synthetic: true, network: false, scenarios: [], performance: [] };

for (const size of [1, 2, 3, 8]) {
  const profile = buildProfile(session(size));
  const ranked = rankTitles([
    film("valid"), film("unknown-runtime", { runtime: null }), film("too-long", { runtime: 150 }),
    film("wrong-type", { type: "tv" }), film("future", { releaseDate: "2099-01-01" }),
  ], profile, { now });
  assert.deepEqual(ranked.items.map((item) => item.title.id), ["valid"]);
  assert.deepEqual(rankTitles([], profile, { now }).items, []);
  assert.equal(rankTitles([film("seen")], profile, { now, history: { seen: ["seen"] } }).items.length, 0);
  result.scenarios.push({ participants: size, hardLimits: "pass", empty: "pass", history: "pass" });
}
const platformProfile = buildProfile(session(1, { providers: ["netflix"], region: "CO" }));
const platformResult = rankTitles([film("unknown"), film("empty", { providers: [] }), film("netflix", { providers: [{ id: 8 }] })], platformProfile, { now });
assert.deepEqual(platformResult.items.map((item) => item.title.id), ["netflix"]);
result.scenarios.push({ name: "CO and unknown platform", result: "pass" });

const familyProfile = buildProfile(session(1, { family: "kids" }));
assert.equal(rankTitles([film("unknown-classification")], familyProfile, { now }).items.length, 0);
result.scenarios.push({ name: "unknown family classification", result: "pass" });
const tv = rankTitles([film("long", { type: "tv", runtime: 100, rating: 9 }), film("short", { type: "tv", runtime: 30, rating: 6 })], buildProfile(session(1, { mode: "tv" })), { now });
const marathon = buildMarathon(tv.items, { type: "tv", maxMinutes: 60, count: 2, style: "thematic", scope: "mix" });
assert.deepEqual(marathon.entries, [{ id: "short", episodes: 2 }]);
result.scenarios.push({ name: "TV marathon fits the budget", result: "pass" });
const quality = scoreTitle(film("quality", { rating: 8, votes: 5000, popularity: 0 }), buildProfile(session(1)), { now }).score;
const popular = scoreTitle(film("popular", { rating: 6, votes: 5000, popularity: 10000 }), buildProfile(session(1)), { now }).score;
assert.ok(quality > popular);
result.scenarios.push({ name: "popularity does not outweigh this quality difference", quality, popular, result: "pass" });

for (const size of sizes) {
  const catalog = Array.from({ length: size }, (_, index) => film(`synthetic-${index}`, {
    genreKeys: index % 3 === 0 ? ["drama", "comedy"] : ["drama"], rating: 6 + (index % 30) / 10,
    popularity: index % 100, collection: index % 5 === 0 ? { id: index % 17 } : null,
  }));
  const profile = buildProfile(session(8));
  const measure = () => {
    const started = performance.now();
    const ranked = rankTitles(catalog, profile, { now });
    const finalists = pickFinalists(ranked.items, profile, { now });
    return { ms: +(performance.now() - started).toFixed(2), titles: ranked.items.length, finalists: finalists.length };
  };
  result.performance.push({ catalog: size, first: measure(), regeneration: measure() });
}
console.log(JSON.stringify(result, null, 2));
