/* Duo: filtros obligatorios, puntuación, dado, maratón, historial y almacenamiento. `npm test` */
import { test } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_DUO_SESSION, DEFAULT_PERSON } from "../data/duo.js";
import { readStorage, writeStorage, isStorageAvailable } from "../utils/storage.js";
import { bothLiked, getDuoCandidates, setVote } from "./duoService.js";
import { addToHistory, asHistory, EMPTY_HISTORY, excludedGroups, restoreTitle } from "./historyService.js";
import { getCollection, getHeroSlides, getMovies, getTasteStats } from "./movieService.js";
import {
  buildMarathon,
  buildProfile,
  describeMarathon,
  diversify,
  fillBoard,
  findConflicts,
  findSimilar,
  removeFromMarathon,
  rankTitles,
  replaceInMarathon,
  rollDice,
  scoreTitle,
  WEIGHTS,
} from "./recommender.js";

const catalog = await getMovies();
const person = (patch = {}) => ({ ...DEFAULT_PERSON, ...patch });
const session = (a = {}, b = {}, patch = {}) => ({
  ...DEFAULT_DUO_SESSION,
  ...patch,
  people: [person({ name: "Ana", ...a }), person({ name: "Luis", ...b })],
});
const rank = (s, context = {}, titles = catalog) => rankTitles(titles, buildProfile(s), { history: EMPTY_HISTORY, ...context });
const ids = (items) => items.map((item) => item.title.id);
/** Aleatorio reproducible (Park–Miller) para probar el dado. */
const seeded = (seed = 7) => () => (seed = (seed * 16807) % 2147483647) / 2147483647;

test("mismo género: todos los resultados lo tienen y lo explican", () => {
  const { items } = rank(session({ genres: ["animation"] }, { genres: ["animation"] }));
  assert.ok(items.length > 0);
  assert.ok(items.every(({ title }) => title.genreKeys.includes("animation")));
  assert.ok(items.every((item) => item.bothPleased));
  assert.equal(items[0].reasons[0], "Coincide con el género elegido por ambos: animación.");
});

test("géneros diferentes: solo títulos que encajan con los dos; ampliar es voluntario", () => {
  const both = rank(session({ genres: ["action"] }, { genres: ["science-fiction"] }));
  assert.ok(both.items.length > 0);
  assert.ok(both.items.every(({ title }) => title.genreKeys.includes("action") && title.genreKeys.includes("science-fiction")));
  assert.equal(both.items[0].reasons[0], "Encaja con los dos: acción para Ana y ciencia ficción para Luis.");

  const apart = session({ genres: ["horror"] }, { genres: ["comedy"] });
  const strict = rank(apart);
  assert.equal(strict.items.length, 0, "ningún título del catálogo es terror y comedia a la vez");
  assert.ok(strict.rejectedBy.oneSided > 0, "el motivo queda registrado para el mensaje");

  const widened = rank({ ...apart, relax: { oneSided: true } });
  assert.ok(widened.items.length > 0);
  assert.ok(widened.items.every((item) => item.relaxed.includes("oneSided")));
  assert.match(widened.items[0].reasons[0], /^Es una alternativa: encaja con los gustos de (Ana|Luis), no con los de (Ana|Luis)\.$/);
});

test("géneros incompatibles: conflicto explicado y cero resultados", () => {
  const s = session({ mustGenres: ["horror"] }, { rejectedGenres: ["horror"] });
  const conflicts = findConflicts(buildProfile(s));
  assert.equal(conflicts[0].blocking, true);
  assert.equal(conflicts[0].text, "Terror es imprescindible para una persona y la otra lo rechaza.");
  assert.deepEqual(rank(s).items, []);
});

test("imprescindible y rechazado se cumplen siempre", () => {
  const { items } = rank(session({ mustGenres: ["science-fiction"], maxRuntime: 0 }, { rejectedGenres: ["action"], maxRuntime: 0 }));
  assert.ok(items.length > 0);
  assert.ok(items.every(({ title }) => title.genreKeys.includes("science-fiction") && !title.genreKeys.includes("action")));
});

test("modo película: nunca mezcla series", () => {
  const series = { id: "tmdb-tv-1", type: "tv", tmdbId: 1, title: "Serie", releaseDate: "2020-01-01", genreKeys: ["comedy"], rating: 9 };
  const { items } = rank(session({ genres: ["comedy"] }, {}), {}, [...catalog, series]);
  assert.ok(items.length > 0 && items.every(({ title }) => title.type === "movie"));
});

const tv = (id, patch) => ({
  id: `tmdb-tv-${id}`,
  type: "tv",
  tmdbId: id,
  title: `Serie ${id}`,
  releaseDate: "2019-01-01",
  genreKeys: ["drama"],
  rating: 8,
  votes: 3000,
  runtime: 45,
  seasons: 2,
  episodes: 16,
  seriesStatus: "Ended",
  ...patch,
});
const SERIES = [
  tv(1),
  tv(2, { seasons: 6, episodes: 60 }),
  tv(3, { seriesStatus: "Returning Series" }),
  tv(4, { runtime: 70 }),
  tv(5, { genreKeys: ["comedy"], runtime: 25, episodes: 10 }),
  tv(6, { releaseDate: "" }), // sin estrenar
];

test("modo serie: duración de episodio, temporadas y estado", () => {
  const s = session(
    { genres: ["drama", "comedy"], episodeMax: 45, seasonsMax: 3, seriesStatus: "ended" },
    { genres: ["drama", "comedy"], episodeMax: 60 },
    { mode: "tv" }
  );
  const { items, rejectedBy } = rank(s, {}, [...SERIES, ...catalog]);
  assert.deepEqual(ids(items).sort(), ["tmdb-tv-1", "tmdb-tv-5"]);
  assert.deepEqual(rejectedBy, { type: catalog.length, seasons: 1, status: 1, runtime: 1, unreleased: 1 });
  const first = items.find(({ title }) => title.id === "tmdb-tv-1");
  assert.ok(first.reasons.includes("Sus episodios duran unos 45 min, dentro del límite."));
  assert.ok(first.reasons.includes("Tiene 2 temporadas."));
  assert.ok(first.reasons.includes("Está finalizada."));
  assert.equal(findConflicts(buildProfile({ ...s, people: [s.people[0], person({ seriesStatus: "ongoing" })] }))[0].blocking, true);
});

test("duración máxima muy corta: mensaje en vez de relleno; ampliar marca la alternativa", () => {
  const short = session({ maxRuntime: 60 }, { maxRuntime: 100 });
  const strict = rank(short);
  assert.equal(strict.items.length, 0);
  assert.ok(strict.rejectedBy.runtime > 0);

  const widened = rank({ ...short, relax: { runtime: 30 } });
  assert.ok(widened.items.length > 0 && widened.items.every(({ title }) => title.runtime <= 90));
  assert.equal(widened.items[0].reasons[0], "Es una alternativa porque ampliaste el rango de duración.");
});

test("puntuación: fórmula documentada, sin porcentajes", () => {
  const profile = buildProfile(session({ genres: ["drama"] }, { genres: ["science-fiction"] }));
  const title = { id: "t", type: "movie", rating: 6.5, runtime: 108, popularity: 0, genreKeys: ["drama", "science-fiction"] };
  const { score, breakdown, reasons } = scoreTitle(title, profile);
  const quality = Math.round(WEIGHTS.quality * ((6.5 - 5) / 3.5) * 10) / 10;
  assert.equal(score, WEIGHTS.genre + WEIGHTS.subgenre + WEIGHTS.compat + WEIGHTS.runtime + quality);
  assert.deepEqual(breakdown.map(({ key }) => key), ["genre", "subgenre", "compat", "runtime", "quality"]);
  assert.ok(reasons.includes("Está dentro del límite de duración: 1 h 48 min de 2 h 10 min como máximo."));
  assert.ok(reasons.every((reason) => !reason.includes("%")));
  const recent = scoreTitle(title, profile, { recent: ["t"] });
  assert.equal(recent.score, Math.round((score + WEIGHTS.recent) * 10) / 10, "lo reciente baja de puesto");
});

test("muchos títulos vistos: solo quedan los no vistos", () => {
  const s = session({ genres: ["animation"] }, {});
  const all = ids(rank(s).items);
  const history = addToHistory(EMPTY_HISTORY, "seen", all.slice(0, -1));
  const { items, rejectedBy } = rank(s, { history });
  assert.deepEqual(ids(items), all.slice(-1));
  assert.equal(rejectedBy.history, all.length - 1);
});

test("dado pulsado muchas veces: siempre válido, nunca repite lo visible ni lo anterior", () => {
  const { items } = rank(session({ genres: ["action"] }, {}));
  const board = fillBoard([], items, 3);
  const random = seeded();
  let previous = board[0];
  const picks = new Set();
  for (let roll = 0; roll < 40; roll += 1) {
    const result = rollDice(items, { shown: board, previous, recent: [], random });
    assert.ok(result, "quedan candidatos");
    assert.ok(!board.includes(result.item.title.id) && result.item.title.id !== previous);
    assert.ok(result.item.title.genreKeys.includes("action"), "respeta el filtro");
    picks.add(result.item.title.id);
    previous = result.item.title.id;
  }
  assert.ok(picks.size > 2, "varía entre candidatos");

  const recent = ids(items).filter((id) => !board.includes(id)).slice(1);
  const fresh = rollDice(items, { shown: board, recent, random });
  assert.equal(fresh.repeatsRecent, false, "evita lo reciente mientras haya otra opción");
  assert.equal(rollDice(items.slice(0, 1), { shown: ids(items.slice(0, 1)) }), null, "sin candidatos: null");
});

test("rechazos, 'no me interesa', recuperar y reiniciar historial", () => {
  const s = session({ genres: ["animation"] }, {});
  const [first, second] = rank(s).items.map(({ title }) => title);

  let votes = setVote({}, first.id, 0, "no");
  votes = setVote(votes, first.id, 1, "no");
  assert.deepEqual(votes[first.id], ["no", "no"]);
  assert.deepEqual(bothLiked(setVote(setVote({}, "x", 0, "yes"), "x", 1, "yes")), ["x"]);

  let history = addToHistory(EMPTY_HISTORY, "rejected", [first]);
  history = addToHistory(history, "notInterested", [second]);
  const after = ids(rank(s, { history }).items);
  assert.ok(!after.includes(first.id) && !after.includes(second.id), "nunca vuelven automáticamente");
  assert.equal(excludedGroups(history).find((group) => group.key === "rejected").items[0].title, first.title);

  history = restoreTitle(history, first.id);
  assert.ok(ids(rank(s, { history }).items).includes(first.id), "se puede recuperar");
  assert.equal(rank(s, { history: EMPTY_HISTORY }).items.length, rank(s).items.length, "reiniciar devuelve todo");
});

test("historial dañado o de la versión anterior se sanea", () => {
  assert.deepEqual(asHistory("{roto"), EMPTY_HISTORY);
  assert.deepEqual(asHistory(null), EMPTY_HISTORY);
  const old = asHistory({ seen: ["a", "a", 3, ""], dismissed: ["b"], recent: "x", titles: { a: "mal" } });
  assert.deepEqual(old, { seen: ["a"], rejected: ["b"], notInterested: [], recent: [], titles: {} });
  const many = Array.from({ length: 80 }, (_, index) => `id-${index}`);
  assert.equal(addToHistory(EMPTY_HISTORY, "recent", many).recent.length, 60);
});

test("persistencia: recarga, JSON corrupto y sin almacenamiento", () => {
  const store = new Map();
  globalThis.localStorage = {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => store.set(key, String(value)),
    removeItem: (key) => store.delete(key),
  };
  const saved = session({ genres: ["drama"] }, {}, { step: "results", mode: "tv" });
  writeStorage("cinehub-duo-session", saved);
  assert.deepEqual(readStorage("cinehub-duo-session", null), saved, "tras recargar se lee igual");
  store.set("cinehub-duo-history", "{roto");
  assert.deepEqual(asHistory(readStorage("cinehub-duo-history", null)), EMPTY_HISTORY);
  assert.equal(isStorageAvailable(), true);

  globalThis.localStorage = {
    getItem: () => {
      throw new Error("SecurityError");
    },
    setItem: () => {
      throw new Error("QuotaExceededError");
    },
  };
  assert.equal(isStorageAvailable(), false);
  writeStorage("cinehub-favorites", ["dune"]);
  assert.deepEqual(readStorage("cinehub-favorites", []), ["dune"], "sigue funcionando en memoria");
  delete globalThis.localStorage;
});

test("maratón de películas: cabe en el tiempo, sin repetir; reemplazar y quitar", () => {
  const settings = { type: "movie", maxMinutes: 360, count: 3, style: "balanced", scope: "mix" };
  const { items } = rank(session({ genres: ["action", "science-fiction"] }, {}, { mode: "marathon", marathon: settings }));
  const plan = buildMarathon(items, settings);
  const view = describeMarathon(plan, items, settings);
  assert.equal(view.rows.length, 3);
  assert.equal(new Set(plan.entries.map((entry) => entry.id)).size, 3);
  assert.ok(view.total <= 360 && view.remaining === 360 - view.total);
  assert.equal(view.rows[1].start, view.rows[0].minutes, "orden con hora de inicio");

  const swapped = replaceInMarathon(plan, plan.entries[1].id, items, settings, { random: seeded() });
  assert.ok(swapped && !plan.entries.some((entry) => entry.id === swapped.item.title.id));
  assert.ok(describeMarathon(swapped.plan, items, settings).total <= 360);
  assert.equal(removeFromMarathon(plan, plan.entries[0].id).entries.length, 2);

  const again = buildMarathon(items, settings, { random: seeded(3), avoid: plan.entries.map((entry) => entry.id) });
  assert.ok(again.entries.every((entry) => !plan.entries.some((old) => old.id === entry.id)), "regenerar cambia la maratón");
});

test("maratón temática, variada y por saga", () => {
  const base = { type: "movie", maxMinutes: 720, count: 4, scope: "mix" };
  const { items } = rank(session({}, {}, { mode: "marathon" }));
  const genresOf = (plan) => plan.entries.map((entry) => items.find((item) => item.title.id === entry.id).title.genreKeys[0]);
  const varied = genresOf(buildMarathon(items, { ...base, style: "varied" }));
  assert.equal(new Set(varied).size, varied.length, "variada: un género principal distinto por título");
  const thematic = genresOf(buildMarathon(items, { ...base, style: "thematic" }));
  assert.ok(new Set(thematic).size < varied.length, "temática: repite el hilo");

  const saga = buildMarathon(items, { ...base, style: "thematic", scope: "saga" });
  const titles = saga.entries.map((entry) => items.find((item) => item.title.id === entry.id).title);
  assert.ok(titles.length >= 2 && titles.every((title) => title.collection.id === titles[0].collection.id));
  assert.deepEqual(titles.map((title) => title.year), [...titles.map((title) => title.year)].sort(), "en orden de estreno");
  assert.match(saga.notice, /^Saga «/);
});

test("maratón de series: reparte episodios sin pasarse del tiempo", () => {
  const settings = { type: "tv", maxMinutes: 240, count: 6, style: "balanced", scope: "mix" };
  const { items } = rank(session({}, {}, { mode: "marathon", marathon: settings }), {}, SERIES);
  const plan = buildMarathon(items, settings);
  const view = describeMarathon(plan, items, settings);
  const episodes = (p) => p.entries.reduce((total, entry) => total + entry.episodes, 0);
  assert.equal(plan.entries.length, 2, "equilibrada: dos series");
  assert.ok(view.total <= 240 && episodes(plan) > 0 && episodes(plan) <= 6, "no se pasa del tiempo");
  const roomy = { ...settings, maxMinutes: 600 };
  assert.equal(episodes(buildMarathon(items, roomy)), 6, "con tiempo de sobra, los 6 episodios");
  assert.equal(buildMarathon(items, { ...roomy, style: "thematic" }).entries.length, 1, "temática: una sola serie");
});

test("ver otra parecida, diversidad y tablero", () => {
  const item = (id, genreKeys, score = 50) => ({ title: { id, genreKeys }, score, relaxed: [] });
  const mixed = diversify([item("1", ["drama"]), item("2", ["drama"]), item("3", ["drama"]), item("4", ["comedy"])]);
  assert.equal(mixed[1].title.id, "4", "no encadena tres del mismo género");
  const pool = [item("a", ["drama", "crime"]), item("b", ["comedy"]), item("c", ["drama"])];
  assert.equal(findSimilar({ id: "x", genreKeys: ["drama", "crime"] }, pool, []).title.id, "a");
  assert.equal(findSimilar({ id: "x", genreKeys: ["horror"] }, pool, []), null);
  assert.deepEqual(fillBoard(["c", "gone"], pool, 2), ["c", "a"], "conserva lo válido y rellena");
});

test("candidatos sin token: catálogo local", async () => {
  const { source, titles } = await getDuoCandidates(buildProfile(session()));
  assert.equal(source, "local");
  assert.equal(titles.length, catalog.length);
});

test("inicio y perfil: carrusel, secciones personalizadas y estadísticas (catálogo local)", async () => {
  const forYou = await getCollection("for-you", 5, { favorites: ["toy-story"] });
  assert.ok(forYou.titles.length > 0 && forYou.titles.every((t) => t.id !== "toy-story"));
  assert.deepEqual((await getCollection("for-you", 5, { favorites: [] })).titles, [], "sin favoritas no hay recomendaciones");
  assert.equal((await getCollection("couple", 3)).titles.length, 3);
  const slides = await getHeroSlides(6);
  assert.equal(slides.length, 6);
  assert.ok(slides.every((slide) => slide.status !== "PRÓXIMAMENTE" && (slide.backdrop || slide.poster)));
  assert.deepEqual((await getCollection("now-playing", 10)).titles, [], "sin TMDB la cartelera no se rellena con películas que quizá no están en cines");
  const pinned = await getHeroSlides(6, ["interstellar", "avengers-doomsday"]);
  assert.deepEqual(pinned.slice(0, 2).map((slide) => slide.id), ["interstellar", "avengers-doomsday"], "las fijadas del dashboard van primero, en su orden");
  assert.equal(new Set(pinned.map((slide) => slide.id)).size, pinned.length, "sin repetir las fijadas");
  assert.ok(pinned.every((slide) => !slide.backdrop), "sin TMDB no se usan fondos locales inexistentes: se muestra el póster");

  const stats = getTasteStats([
    { genreKeys: ["drama"], runtime: 100, year: "1994" },
    { genreKeys: ["drama", "crime"], runtime: 140, year: "1999" },
    { genreKeys: ["comedy"], year: "2010" },
  ]);
  assert.equal(stats.topGenre, "Drama");
  assert.equal(stats.avgRuntime, 120);
  assert.equal(stats.favoriteDecade, "Años 1990");
});
