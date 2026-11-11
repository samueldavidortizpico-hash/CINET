/* Duo: filtros obligatorios, puntuación, dado, maratón, historial y almacenamiento. `npm test` */
import { test } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_DUO_SESSION, DEFAULT_PERSON, MAX_PEOPLE, stepsFor } from "../data/duo.js";
import { asSession } from "../hooks/useDuoSession.js";
import { readStorage, writeStorage, isStorageAvailable } from "../utils/storage.js";
import { getDuoCandidates, groupLiked, groupRejected, setVote, tallyVotes } from "./duoService.js";
import { addToHistory, asHistory, EMPTY_HISTORY, excludedGroups, restoreTitle } from "./historyService.js";
import { getCollection, getHeroSlides, getMovies, getTasteStats } from "./movieService.js";
import {
  buildMarathon,
  buildProfile,
  describeMarathon,
  diversify,
  feedbackFrom,
  fillBoard,
  findConflicts,
  findSimilar,
  isStrict,
  pickFinalists,
  quorum,
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
  assert.ok(items.every((item) => item.allPleased));
  assert.equal(items[0].reasons[0], "Coincide con el género elegido por ambos: animación.");
});

test("géneros diferentes: primero los que encajan con los dos; luego alternativas marcadas", () => {
  const both = rank(session({ genres: ["action"] }, { genres: ["science-fiction"] }));
  const strict = both.items.filter(isStrict);
  assert.ok(strict.length > 0 && strict.length === both.strict);
  assert.ok(strict.every(({ title }) => title.genreKeys.includes("action") && title.genreKeys.includes("science-fiction")));
  assert.deepEqual(both.items.slice(0, strict.length), strict, "los que cumplen todo van primero");
  assert.equal(both.items[0].reasons[0], "Encaja con los dos: acción para Ana y ciencia ficción para Luis.");

  const apart = session({ genres: ["horror"] }, { genres: ["comedy"] });
  const auto = rank(apart);
  assert.equal(auto.strict, 0, "ningún título del catálogo es terror y comedia a la vez");
  assert.ok(auto.rejectedBy.oneSided > 0, "el motivo queda registrado para el mensaje");
  assert.ok(auto.items.length > 0, "se completa con alternativas en vez de quedar vacío");
  assert.ok(auto.items.every((item) => item.relaxed.includes("oneSided")));
  assert.match(auto.items[0].reasons[0], /^Es una alternativa: encaja con los gustos de (Ana|Luis), no con los de (Ana|Luis)\.$/);

  const widened = rank({ ...apart, relax: { oneSided: true } });
  const fits = widened.items.slice(0, widened.strict);
  assert.ok(fits.length > 0 && fits.every((item) => item.relaxed.join() === "oneSided"), "ampliado a mano: cuentan como resultados y van primero");
});

test("animación y documental solo salen si alguien los elige; el tono no los cuela", () => {
  const { items } = rank(session({ genres: ["comedy", "adventure"], tone: ["fun"] }, { genres: ["family"], tone: ["relaxed"] }));
  assert.ok(items.length > 0);
  assert.ok(items.every(({ title }) => !title.genreKeys.includes("animation") && !title.genreKeys.includes("documentary")));
  const chosen = rank(session({ genres: ["animation"] }, { genres: ["comedy"] }));
  assert.ok(chosen.items.some(({ title }) => title.genreKeys.includes("animation")));
});

test("muchos filtros: los límites duros nunca se relajan para rellenar", () => {
  const genres = [["drama"], ["drama", "crime"], ["drama", "thriller"], ["crime", "thriller"], ["comedy"], ["romance", "drama"]];
  const pool = Array.from({ length: 90 }, (_, index) => ({
    id: `t${index}`,
    type: "movie",
    title: `T${index}`,
    releaseDate: "2015-01-01",
    genreKeys: genres[index % genres.length],
    runtime: 90 + (index % 5) * 15, // 90…150
    rating: 6 + (index % 4) * 0.5,
    votes: 1000,
  }));
  const picky = session(
    { mustGenres: ["drama", "crime", "thriller"], maxRuntime: 100 },
    { genres: ["romance"], rejectedGenres: ["comedy"], maxRuntime: 100 }
  );
  const { items, strict, rejectedBy } = rank(picky, {}, pool);
  assert.equal(strict, 0, "ninguno cumple los tres imprescindibles");
  assert.deepEqual(items, [], "cero es una respuesta válida: no se rellena con imprescindibles parciales ni duraciones de más");
  assert.ok(rejectedBy.must > 0, "el motivo queda contado para explicarlo");

  // Con un solo imprescindible y gustos distintos, lo que completa solo falla la preferencia (quórum).
  const loose = rank(session({ mustGenres: ["drama"], maxRuntime: 100 }, { genres: ["romance"], maxRuntime: 100 }), {}, pool);
  assert.ok(loose.items.length > 0);
  assert.ok(loose.items.every(({ title }) => title.genreKeys.includes("drama") && title.runtime <= 100), "límites duros en todas");
  assert.ok(loose.items.every((item) => item.relaxed.every((key) => key === "oneSided")), "solo la preferencia flexible se completa");
});

test("contrato de límites: imprescindibles parciales, +1 minuto, datos desconocidos y metadatos contradictorios", () => {
  const profile = buildProfile(session({ mustGenres: ["drama", "crime"], maxRuntime: 130 }, { maxRuntime: 0 }));
  const check = (patch) => rankTitles([film("x", ["drama", "crime"], patch)], profile, { history: EMPTY_HISTORY });
  assert.equal(rankTitles([film("x", ["drama"])], profile, { history: EMPTY_HISTORY }).rejectedBy.must, 1, "uno de dos imprescindibles no cumple");
  assert.equal(check({ runtime: 130 }).strict, 1, "justo en el límite: cumple");
  assert.equal(check({ runtime: 131 }).rejectedBy.runtime, 1, "+1 minuto sobre un máximo duro: fuera");
  assert.equal(check({ runtime: null }).rejectedBy.unknownRuntime, 1, "sin duración: desconocida, no verificada");
  assert.equal(check({ runtime: null, runtimeCap: 130 }).strict, 1, "la cota de discover con el límite pedido sirve");
  assert.equal(check({ runtime: null, runtimeCap: 160 }).rejectedBy.unknownRuntime, 1, "una cota más amplia no prueba el límite");
  assert.equal(check({ runtime: 150, runtimeCap: 130 }).rejectedBy.runtime, 1, "el dato exacto del detalle gana a la cota");

  const widened = buildProfile({ ...session({ mustGenres: ["drama", "crime"], maxRuntime: 130 }, {}), relax: { runtime: 30 } });
  const extra = rankTitles([film("x", ["drama", "crime"], { runtime: 145 })], widened, { history: EMPTY_HISTORY }).items[0];
  assert.deepEqual(extra.relaxed, ["runtime"]);
  assert.equal(extra.reasons[0], "Ampliado: dura 2 h 25 min, 15 min más que el límite de 2 h 10 min que ampliaron.", "excedente exacto");

  const dupes = rankTitles([film("d", ["drama", "crime"]), film("d", ["drama", "crime"])], profile, { history: EMPTY_HISTORY });
  assert.equal(dupes.items.length, 1, "sin duplicados");
});

test("plataformas: disponibilidad nula, vacía, filtrada por discover y ampliada a mano", () => {
  const base = session({ genres: ["drama"] }, {}, { providers: ["netflix"] });
  const netflix = { id: 8, name: "Netflix" };
  const titles = [
    film("ok", ["drama"], { providers: [netflix] }),
    film("empty", ["drama"], { providers: [] }),
    film("unknown", ["drama"], { providers: null }),
    film("filtered", ["drama"], { filtered: { providers: true } }),
  ];
  const strict = rankTitles(titles, buildProfile(base), { history: EMPTY_HISTORY });
  assert.deepEqual(ids(strict.items).sort(), ["filtered", "ok"]);
  assert.deepEqual([strict.rejectedBy.platform, strict.rejectedBy.unknownPlatform], [1, 1], "no está ≠ no sabemos");
  const relaxed = rankTitles(titles, buildProfile({ ...base, relax: { platforms: true } }), { history: EMPTY_HISTORY });
  const unknown = relaxed.items.find((item) => item.title.id === "unknown");
  assert.deepEqual(unknown.relaxed, ["platforms"]);
  assert.ok(unknown.reasons.includes("Ampliado: disponibilidad sin comprobar en sus plataformas."));
});

test("calibración: visto no es gustado, desconocido no es rechazo, un 'no' no veta el género", () => {
  const snap = (id, genreKeys, answer) => ({ id, ids: [id], title: id, genreKeys, answer });
  const titles = [film("space-1", ["science-fiction", "drama"]), film("space-2", ["science-fiction"]), film("laugh", ["comedy"]), film("seen", ["drama"])];
  const ana = { titles: [snap("interstellar", ["science-fiction", "drama"], "love"), snap("seen", ["drama"], "seen"), snap("hangover", ["comedy"], "nope")] };
  const solo = buildProfile(group({ ...ana }));
  const result = rankTitles(titles, solo, { history: EMPTY_HISTORY });
  assert.ok(!ids(result.items).includes("seen"), "visto por todas las personas: no se recomienda");
  assert.equal(result.items[0].title.id, "space-1", "se parece a lo que le encanta");
  assert.equal(result.items.at(-1).title.id, "laugh", "se parece a lo que no es para ella: baja, pero no desaparece");
  assert.ok(result.items[0].reasons.includes("Se parece a «interstellar», que te gustó."));
  const comedyFan = buildProfile(group({ genres: ["comedy"], titles: [snap("hangover", ["comedy"], "nope")] }));
  assert.equal(rankTitles([film("laugh", ["comedy"])], comedyFan, { history: EMPTY_HISTORY }).strict, 1, "un 'no es para mí' no veta su género");

  const pair = buildProfile(group({ ...ana }, { titles: [snap("unknown", ["horror"], "unknown")] }));
  const shared = rankTitles(titles, pair, { history: EMPTY_HISTORY });
  const seen = shared.items.find((item) => item.title.id === "seen");
  assert.ok(seen && seen.reasons.includes("Ya la vio P1."), "visto por una sola persona: se queda, con aviso");
  assert.equal(pair.people[1].loved.length + pair.people[1].noped.length, 0, "'no la conozco' no es una señal");
});

test("aprendizaje personal: el 'no' de una persona no desaparece por mayoría", () => {
  const profile = buildProfile(group({ genres: ["action"] }, { genres: ["action"] }, { genres: ["action"] }));
  const titles = [film("a", ["action"]), film("a2", ["action"]), film("b", ["comedy", "action"])];
  const majority = feedbackFrom({ a: ["yes", "yes", "no"] }, titles);
  assert.deepEqual(majority.liked.map((t) => t.id), ["a"], "resumen del grupo: ganó el sí");
  assert.deepEqual(majority.people[2].disliked.map((t) => t.id), ["a"], "pero P3 dijo que no, y se conserva");
  const allYes = feedbackFrom({ a: ["yes", "yes", "yes"] }, titles);
  const scoreOf = (feedback) => rankTitles(titles, profile, { history: EMPTY_HISTORY, feedback }).items.find((item) => item.title.id === "a2").score;
  assert.ok(scoreOf(majority) < scoreOf(allYes), "con un 'no', la parecida sube menos que con unanimidad");
});

test("finalistas: conjunto diverso con papeles justificados y sin forzar tres", () => {
  const profile = buildProfile(group({ genres: ["comedy", "horror"] }, { genres: ["comedy"] }, { genres: ["comedy", "horror"] }));
  const titles = [
    film("c1", ["comedy"], { rating: 8, votes: 20000, year: "2015" }),
    film("c2", ["comedy"], { rating: 7.9, votes: 18000, year: "2016", collection: { id: 9 } }),
    film("c3", ["comedy"], { rating: 7.8, votes: 15000, year: "2017", collection: { id: 9 } }),
    film("old", ["comedy"], { rating: 8.4, votes: 900, year: "1994" }),
    film("scary", ["comedy", "horror"], { rating: 7, votes: 5000, year: "2014" }),
  ];
  const { items } = rankTitles(titles, profile, { history: EMPTY_HISTORY });
  const finalists = pickFinalists(items, profile);
  assert.equal(finalists.length, 3);
  assert.equal(finalists[0].role, "meet");
  assert.ok(new Set(finalists.map((pick) => pick.id)).size === 3, "sin repetir");
  assert.ok(!(finalists.some((pick) => pick.id === "c2") && finalists.some((pick) => pick.id === "c3")), "no dos de la misma saga");
  const discover = finalists.find((pick) => pick.role === "discover");
  assert.ok(discover && discover.why.length && discover.why.every((why) => !why.includes("%")), "la novedad se explica con datos");

  const one = rankTitles([film("solo", ["comedy"])], profile, { history: EMPTY_HISTORY }).items;
  assert.deepEqual(pickFinalists(one, profile).map((pick) => pick.id), ["solo"], "con una válida, una finalista");
  assert.deepEqual(pickFinalists([], profile), [], "sin válidas, ninguna");
  const mixed = [{ title: { id: "alt" }, score: 99, relaxed: ["oneSided"], reasons: [], seats: [] }, { title: { id: "ok" }, score: 10, relaxed: [], reasons: [], seats: [] }];
  assert.deepEqual(pickFinalists(mixed, profile).map((pick) => pick.id), ["ok"], "si hay válidas, nunca una alternativa");
});

test("foco de género: una comedia pura gana a una aventura-comedia-familiar-fantasía", () => {
  const profile = buildProfile(session({ genres: ["comedy"] }, { genres: ["comedy"] }));
  const pure = scoreTitle({ id: "a", type: "movie", rating: 7, genreKeys: ["comedy"] }, profile);
  const stuffed = scoreTitle({ id: "b", type: "movie", rating: 7, genreKeys: ["adventure", "comedy", "family", "fantasy"] }, profile);
  assert.ok(pure.score > stuffed.score);
});

test("géneros incompatibles: conflicto explicado y cero resultados", () => {
  const s = session({ mustGenres: ["horror"] }, { rejectedGenres: ["horror"] });
  const conflicts = findConflicts(buildProfile(s));
  assert.equal(conflicts[0].blocking, true);
  assert.equal(conflicts[0].text, "Terror es imprescindible para Ana y Luis lo rechaza.");
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
  assert.deepEqual(ids(items.filter(isStrict)).sort(), ["tmdb-tv-1", "tmdb-tv-5"]);
  assert.deepEqual(rejectedBy, { type: catalog.length, seasons: 1, status: 1, runtime: 1, unreleased: 1 });
  assert.deepEqual(ids(items.filter((item) => !isStrict(item))), [], "temporadas, estado y duración son límites: no completan");
  const unknown = rank(s, {}, [tv(7, { seasons: null, seriesStatus: null })]).rejectedBy;
  assert.deepEqual(unknown, { unknownSeasons: 1 }, "sin dato de temporadas: desconocido, no válido");
  const first = items.find(({ title }) => title.id === "tmdb-tv-1");
  assert.ok(first.reasons.includes("Sus episodios duran unos 45 min, dentro del límite."));
  assert.ok(first.reasons.includes("Tiene 2 temporadas."));
  assert.ok(first.reasons.includes("Está finalizada."));
  assert.equal(findConflicts(buildProfile({ ...s, people: [s.people[0], person({ seriesStatus: "ongoing" })] }))[0].blocking, true);
});

test("duración máxima muy corta: explicada; solo una ampliación explícita la mueve", () => {
  const short = session({ maxRuntime: 60, genres: ["animation"] }, { maxRuntime: 100 }); // las cortas del catálogo son animadas
  const strict = rank(short);
  assert.equal(strict.strict, 0);
  assert.ok(strict.rejectedBy.runtime > 0);
  assert.deepEqual(strict.items, [], "nada que se pase del máximo aparece por su cuenta");

  const widened = rank({ ...short, relax: { runtime: 30 } });
  assert.ok(widened.items.length > 0 && widened.items.every(({ title }) => title.runtime <= 90), "ampliado a mano: hasta 60 + 30, nunca más");
  assert.match(widened.items[0].reasons[0], /^Ampliado: dura 1 h \d+ min, \d+ min más que el límite de 1 h que ampliaron\.$/);
});

test("puntuación: fórmula documentada, sin porcentajes", () => {
  const profile = buildProfile(session({ genres: ["drama"] }, { genres: ["science-fiction"] }));
  const title = { id: "t", type: "movie", rating: 6.5, runtime: 108, popularity: 0, genreKeys: ["drama", "science-fiction"] };
  const { score, breakdown, reasons } = scoreTitle(title, profile);
  const quality = Math.round(WEIGHTS.quality * ((6.5 - 5) / 3.5) * 10) / 10;
  assert.equal(score, WEIGHTS.genre + WEIGHTS.subgenre + WEIGHTS.group + WEIGHTS.runtime + quality);
  assert.deepEqual(breakdown.map(({ key }) => key), ["genre", "subgenre", "group", "runtime", "quality"]);
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

  const mix = [{ title: { id: "ok" }, score: 10, relaxed: [] }, { title: { id: "alt" }, score: 95, relaxed: ["runtime"] }];
  for (let roll = 0; roll < 20; roll += 1) assert.equal(rollDice(mix, { random }).item.title.id, "ok", "cumplir todo gana a puntuar alto");
  assert.equal(rollDice(mix, { shown: ["ok"] }).alternative, true, "sin estrictos: alternativa, y lo dice");
});

test("rechazos, 'no me interesa', recuperar y reiniciar historial", () => {
  const s = session({ genres: ["animation"] }, {});
  const [first, second] = rank(s).items.map(({ title }) => title);

  let votes = setVote({}, first.id, 0, "no");
  votes = setVote(votes, first.id, 1, "no");
  assert.deepEqual(votes[first.id], ["no", "no"]);
  assert.deepEqual(groupLiked(setVote(setVote({}, "x", 0, "yes"), "x", 1, "yes")), ["x"]);
  assert.ok(groupRejected(votes[first.id], 2));

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

/* ---------- Grupos de 1 a MAX_PEOPLE ---------- */

const group = (...people) => ({ ...DEFAULT_DUO_SESSION, people: people.map((patch, index) => person({ name: `P${index + 1}`, ...patch })) });
const film = (id, genreKeys, extra = {}) => ({ id, type: "movie", title: id, rating: 7, votes: 1000, runtime: 100, popularity: 50, genreKeys, ...extra });

test("solo: una persona, explicaciones en singular y sin 'para los dos'", () => {
  const { items } = rank(group({ genres: ["animation"] }));
  assert.ok(items.length > 0 && items.every((item) => !item.allPleased));
  assert.equal(items[0].reasons[0], "Es de animación, lo que elegiste.");
  assert.equal(items[0].seats.length, 1);
  assert.deepEqual(stepsFor(1).map((step) => step.key), ["mode", "person-0", "seen", "common", "results", "final"]);
});

test("grupo: quórum de 2/3, 'menor descontento' y la mayoría", () => {
  assert.deepEqual([1, 2, 3, 4, 6, 8].map(quorum), [1, 2, 2, 3, 4, 6]);
  const s = group({ genres: ["comedy"] }, { genres: ["comedy"] }, { genres: ["comedy", "action"] }, { genres: ["drama"] });
  const profile = buildProfile(s);
  assert.deepEqual(profile.majority, ["comedy"], "3 de 4 eligieron comedia");
  const titles = [film("comedia", ["comedy"]), film("comedia-drama", ["comedy", "drama"]), film("accion", ["action"])];
  const { items, strict } = rankTitles(titles, profile, { history: EMPTY_HISTORY });
  assert.equal(strict, 2, "comedia (3 de 4) cumple el quórum; acción (1 de 4) no");
  assert.equal(items[0].title.id, "comedia-drama", "la que no deja a nadie fuera va primero");
  assert.ok(items[0].allPleased);
  assert.match(items[0].reasons[0], /^Encaja con los 4: comedia para P1, comedia para P2, comedia para P3 y también con P4\.$/);
  const comedy = items.find((item) => item.title.id === "comedia");
  assert.equal(comedy.reasons[0], "Encaja con P1, P2 y P3 (3 de 4).");
  assert.ok(comedy.seats.map((seat) => seat.pleased).join() === "true,true,true,false");
  assert.ok(items.at(-1).relaxed.includes("oneSided"), "la de acción solo completa, marcada");
  assert.match(findConflicts(buildProfile(group({ mustGenres: ["horror"] }, { rejectedGenres: ["horror"] }, { rejectedGenres: ["horror"] })))[0].text, /para P1 y P2 y P3 lo rechazan/);
});

test("votos de la sesión: el ranking aprende (más de lo que gustó, menos de lo que no)", () => {
  const profile = buildProfile(group({ genres: ["action", "comedy"] }, { genres: ["action", "comedy"] }));
  const titles = [film("a", ["action"]), film("b", ["comedy"]), film("a2", ["action"]), film("b2", ["comedy"])];
  const votes = { a: ["yes", "yes"], b: ["no", "no"], x: ["yes", "no"] };
  const feedback = feedbackFrom(votes, titles);
  assert.deepEqual([feedback.liked.map((t) => t.id), feedback.disliked.map((t) => t.id)], [["a"], ["b"]], "empate = neutro; ids sin título se ignoran");
  const before = rankTitles(titles, profile, { history: EMPTY_HISTORY });
  const after = rankTitles(titles, profile, { history: EMPTY_HISTORY, feedback });
  const scoreOf = (result, id) => result.items.find((item) => item.title.id === id).score;
  assert.ok(scoreOf(after, "a2") > scoreOf(before, "a2") && scoreOf(after, "b2") < scoreOf(before, "b2"));
  assert.ok(after.items.find((item) => item.title.id === "a2").reasons.includes("Se parece a «a», que les gustó."));
  assert.ok(groupLiked({ t: ["yes", "yes", "yes"], u: ["yes", "yes"] }, 3).join() === "t", "todas las personas, no solo dos");
});

test("estrenos: bonus y motivo verificable", () => {
  const profile = buildProfile(group({ genres: ["drama"] }));
  const fresh = scoreTitle(film("new", ["drama"], { releaseDate: "2026-06-01", year: "2026" }), profile, { now: "2026-10-09" });
  const old = scoreTitle(film("old", ["drama"], { releaseDate: "2010-06-01", year: "2010" }), profile, { now: "2026-10-09" });
  assert.equal(Math.round((fresh.score - old.score) * 10) / 10, WEIGHTS.fresh);
  assert.ok(fresh.reasons.includes("Es un estreno reciente (2026)."));
});

test("sesión guardada: de 1 a MAX_PEOPLE personas y pasos de cada una", () => {
  assert.equal(asSession({ people: [{ name: "Sola" }] }).people.length, 1);
  assert.equal(asSession({ people: Array.from({ length: 12 }, () => ({})) }).people.length, MAX_PEOPLE);
  assert.equal(asSession({}).people.length, 2, "por defecto, en pareja");
  assert.equal(asSession({ people: [{}, {}, {}], step: "person-2" }).step, "person-2");
  assert.equal(asSession({ people: [{}, {}], step: "person-2" }).step, "mode", "un paso que no existe vuelve al inicio");
});

test("ronda de votación: match primero, luego puntos; empate = orden recomendado", () => {
  const items = ["a", "b", "c", "d"].map((id) => ({ title: { id } }));
  const votes = { a: ["later", "yes", "no"], b: ["yes", "yes", "yes"], c: ["yes", "later", "later"], d: ["later", "yes"] };
  const rows = tallyVotes(items, votes, 3);
  assert.deepEqual(rows.map((row) => row.item.title.id), ["b", "c", "a", "d"]);
  assert.deepEqual([rows[0].match, rows[0].points, rows[3].list], [true, 6, ["later", "yes", null]]);
});

test("reparto justo: desde el 2.º puesto, quien aún no tiene una opción suya recibe una", () => {
  const profile = buildProfile(group({ genres: ["comedy"] }, { genres: ["comedy"] }, { genres: ["comedy", "horror"] }, { genres: ["horror"] }));
  const titles = [
    ...["c1", "c2", "c3", "c4"].map((id) => film(id, ["comedy"], { rating: 8.5 })),
    film("h1", ["horror", "thriller"], { rating: 6 }),
  ];
  const strict = rankTitles(titles, { ...profile, relax: { ...profile.relax, oneSided: true } }, { history: EMPTY_HISTORY }).items;
  assert.equal(strict[0].title.id.startsWith("c"), true, "la mejor sigue primero");
  assert.equal(strict[1].title.id, "h1", "después, algo para P4 (terror) antes que otra comedia");
});

test("finalistas: si alguien sigue sin opción, la «otra forma» puede ser una alternativa que solo falla un gusto", () => {
  const profile = buildProfile(group({ genres: ["comedy"] }, { genres: ["comedy"] }, { genres: ["comedy"] }, { genres: ["horror"] }));
  const titles = [film("risa", ["comedy"], { rating: 8 }), film("susto", ["horror"], { rating: 7 }), film("larga", ["horror"], { runtime: 200 })];
  const { items } = rankTitles(titles, profile, { history: EMPTY_HISTORY });
  const picks = pickFinalists(items, profile);
  assert.deepEqual(picks.map((pick) => [pick.id, pick.role]), [["risa", "meet"], ["susto", "other"]]);
  assert.match(picks[1].why[0], /^Es una alternativa: encaja con los gustos de P4/, "se dice que es una alternativa");
  assert.ok(!picks.some((pick) => pick.id === "larga"), "un límite duro (duración) nunca entra, ni como puente");
});
