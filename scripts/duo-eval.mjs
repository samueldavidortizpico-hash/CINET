/* Evaluación reproducible del motor de Duo: algoritmo anterior (último commit, contrato v1) frente al
   actual (contrato de límites v2), con las MISMAS preferencias y los MISMOS títulos (catálogo local de
   CINET + títulos sintéticos con datos desconocidos). Mide invariantes y calidad de datos, no satisfacción:
   la ausencia de violaciones no es «precisión». Sin red ni datos personales.
   Uso: node scripts/duo-eval.mjs  (escribe la tabla en la salida estándar) */
import { execFileSync } from "node:child_process";
import { rmSync, writeFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { DEFAULT_DUO_SESSION, DEFAULT_PERSON } from "../src/data/duo.js";
import { PLATFORMS } from "../src/data/platforms.js";
import { EMPTY_HISTORY, addToHistory } from "../src/services/historyService.js";
import { getMovies } from "../src/services/movieService.js";
import * as v2 from "../src/services/recommender.js";

const root = fileURLToPath(new URL("..", import.meta.url));
const v1Path = fileURLToPath(new URL("../src/services/.recommender-v1.eval.mjs", import.meta.url));
writeFileSync(v1Path, execFileSync("git", ["show", "HEAD:src/services/recommender.js"], { cwd: root }));
let v1;
try {
  v1 = await import(pathToFileURL(v1Path).href);
} finally {
  rmSync(v1Path, { force: true });
}

const NETFLIX = PLATFORMS.find((platform) => platform.id === "netflix");
const film = (id, genreKeys, patch = {}) => ({ id, type: "movie", title: id, releaseDate: "2018-05-01", year: "2018", rating: 7.4, votes: 4000, popularity: 40, runtime: 110, genreKeys, ...patch });
// Títulos con datos desconocidos o contradictorios: donde un motor puede declarar "comprobado" lo que no lo está.
const SYNTHETIC = [
  film("sin-duracion", ["action"], { runtime: null }),
  film("cota-amplia", ["action"], { runtime: null, runtimeCap: 160 }),
  film("cota-justa", ["action"], { runtime: null, runtimeCap: 120 }),
  film("contradictoria", ["action"], { runtime: 150, runtimeCap: 120 }),
  film("proveedores-nulos", ["action", "comedy"], { providers: null }),
  film("sin-oferta", ["action", "comedy"], { providers: [] }),
  film("en-netflix", ["action", "comedy"], { providers: [{ id: NETFLIX.tmdbIds[0], name: "Netflix" }] }),
  film("filtrada-netflix", ["action", "comedy"], { filtered: { providers: true } }),
  film("drama-crimen-corto", ["drama", "crime"], { runtime: 95 }),
  film("drama-solo-corto", ["drama"], { runtime: 98 }),
];
const titles = [...(await getMovies()), ...SYNTHETIC];
const person = (patch) => ({ ...DEFAULT_PERSON, ...patch });
const session = (people, patch = {}) => ({ ...DEFAULT_DUO_SESSION, people: people.map(person), ...patch });

const SCENARIOS = [
  { name: "Pareja acción + ciencia ficción, máx. 130", session: session([{ name: "A", genres: ["action"] }, { name: "B", genres: ["science-fiction"] }]) },
  { name: "Gustos incompatibles (terror / comedia)", session: session([{ name: "A", genres: ["horror"] }, { name: "B", genres: ["comedy"] }]) },
  { name: "Imprescindibles drama + crimen, máx. 100", session: session([{ name: "A", mustGenres: ["drama", "crime"], maxRuntime: 100 }, { name: "B", maxRuntime: 100 }]) },
  { name: "Grupo de 4 con gustos distintos", session: session([{ name: "A", genres: ["comedy"] }, { name: "B", genres: ["action"] }, { name: "C", genres: ["drama"] }, { name: "D", genres: ["adventure"] }]) },
  { name: "Netflix obligatorio", session: session([{ name: "A", genres: ["action"] }, { name: "B" }], { providers: ["netflix"] }) },
  { name: "Duración muy corta (60 min)", session: session([{ name: "A", genres: ["animation"], maxRuntime: 60 }, { name: "B", maxRuntime: 100 }]) },
  { name: "Una persona sin preferencias", session: session([{ name: "A", genres: ["comedy"] }, { name: "B" }]) },
  { name: "Vistos excluidos + veto (terror)", session: session([{ name: "A", genres: ["action"], rejectedGenres: ["horror"] }, { name: "B", genres: ["action"] }]), history: addToHistory(EMPTY_HISTORY, "seen", ["iron-man", "john-wick"]) },
];

/** ¿Este título rompe un límite duro o se da por bueno sin dato comprobable? */
function violations(item, profile) {
  const { title } = item;
  const genres = title.genreKeys ?? [];
  const max = profile.maxRuntime ? profile.maxRuntime + (Number(profile.relax.runtime) || 0) : 0;
  const hard = [];
  if (genres.some((key) => profile.rejected.includes(key))) hard.push("rechazado");
  if (profile.must.some((key) => !genres.includes(key))) hard.push("imprescindible");
  if (max && title.runtime && title.runtime > max) hard.push("duración");
  if (profile.providers.length && Array.isArray(title.providers) && !title.providers.some((provider) => PLATFORMS.some((platform) => profile.providers.includes(platform.id) && platform.tmdbIds.includes(provider.id)))) hard.push("plataforma");
  const unknown = [];
  if (max && !title.runtime && !(title.runtimeCap && title.runtimeCap <= max)) unknown.push("duración");
  if (profile.providers.length && !Array.isArray(title.providers) && !title.filtered?.providers) unknown.push("plataforma");
  return { hard, unknown };
}

const jaccard = (a, b) => {
  const all = new Set([...a, ...b]);
  return all.size ? a.filter((key) => b.includes(key)).length / all.size : 0;
};
function setQuality(picks, profile) {
  const pairs = picks.flatMap((a, i) => picks.slice(i + 1).map((b) => jaccard(a.title.genreKeys ?? [], b.title.genreKeys ?? [])));
  const diversity = pairs.length ? 1 - pairs.reduce((total, value) => total + value, 0) / pairs.length : null;
  const expressed = profile.people.map((p, index) => index).filter((index) => picks[0]?.seats?.[index]?.expressed);
  const covered = expressed.filter((index) => picks.some((pick) => pick.seats?.[index]?.pleased));
  return { diversity, coverage: expressed.length ? covered.length / expressed.length : null };
}

const fmt = (value) => (value == null ? "—" : typeof value === "number" && !Number.isInteger(value) ? value.toFixed(2) : String(value));
const rows = [];
for (const scenario of SCENARIOS) {
  for (const [label, engine] of [["anterior", v1], ["actual", v2]]) {
    const profile = engine.buildProfile(scenario.session);
    const { items, strict } = engine.rankTitles(titles, profile, { history: scenario.history ?? EMPTY_HISTORY });
    const checks = items.map((item) => violations(item, profile));
    const shown = label === "actual" ? v2.pickFinalists(items, profile).map((pick) => items.find((item) => item.title.id === pick.id)) : items.slice(0, 3);
    const ids = items.map((item) => item.title.id);
    const quality = setQuality(shown, profile);
    rows.push({
      scenario: scenario.name,
      engine: label,
      results: items.length,
      strict,
      hard: checks.filter((check) => check.hard.length).length,
      falseVerified: items.filter((item, index) => !item.relaxed.length && checks[index].unknown.length).length,
      unknownShown: checks.filter((check) => check.unknown.length).length,
      duplicates: ids.length - new Set(ids).size,
      finalists: shown.length,
      diversity: quality.diversity,
      coverage: quality.coverage,
    });
  }
}

console.log("| Escenario | Motor | Resultados | Cumplen todo | Violan un límite duro | «Comprobado» sin dato | Con dato desconocido | Duplicados | Propuestas | Diversidad de géneros | Cobertura de personas |");
console.log("| --- | --- | --: | --: | --: | --: | --: | --: | --: | --: | --: |");
for (const row of rows) {
  console.log(`| ${row.scenario} | ${row.engine} | ${row.results} | ${row.strict} | ${row.hard} | ${row.falseVerified} | ${row.unknownShown} | ${row.duplicates} | ${row.finalists} | ${fmt(row.diversity)} | ${fmt(row.coverage)} |`);
}
const total = (engine, key) => rows.filter((row) => row.engine === engine).reduce((sum, row) => sum + row[key], 0);
console.log(`\nTotales · anterior: ${total("anterior", "hard")} violaciones de límites duros, ${total("anterior", "falseVerified")} «comprobados» sin dato · actual: ${total("actual", "hard")} y ${total("actual", "falseVerified")}.`);
