/* TMDB con fetch falso: errores, estado, cache, paginación, filtros, normalización y fallback. `npm test` */
import { test } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_DUO_SESSION, DEFAULT_PERSON } from "../data/duo.js";
import { getDuoCandidates } from "./duoService.js";
import { addToHistory, EMPTY_HISTORY } from "./historyService.js";
import { buildMarathon, buildProfile, rankTitles } from "./recommender.js";
import { EMPTY_ADVANCED, fromTmdb, getCollection, getHeroSlides, getMovieById, loadMoviesByIds, searchCatalog, toDiscoverParams } from "./movieService.js";
import {
  checkTmdbConnection,
  configureTmdb,
  getTitleWatchProviders,
  getTmdbStatus,
  isTmdbEnabled,
  searchMulti,
  tmdbRequest,
  tmdbRetryAt,
} from "./tmdbClient.js";

/** Responde según la ruta (la más larga que coincida); cuenta las llamadas. */
function fakeApi(routes) {
  const calls = [];
  const paths = Object.keys(routes).sort((a, b) => b.length - a.length);
  const fetch = async (url) => {
    calls.push(url);
    const path = paths.find((item) => url.pathname.endsWith(item));
    if (!path) return { ok: false, status: 404 };
    const result = await routes[path](url);
    if (typeof result === "number") return { ok: false, status: result };
    return { ok: true, status: 200, json: async () => result };
  };
  return { calls, fetch };
}

const connect = (routes) => {
  const api = fakeApi(routes);
  configureTmdb({ token: "t", fetch: api.fetch, retryDelay: 0 });
  return api;
};

const page = (results, totalPages = 3, number = 1) => ({ page: number, results, total_pages: totalPages, total_results: results.length });

function rateLimitedApi(retryAfter, { now = 0, random = () => 0, failures = 1 } = {}) {
  const state = { calls: [], waits: [], clock: now };
  configureTmdb({
    token: "t",
    retryDelay: 1000,
    random,
    now: () => state.clock,
    wait: async (ms) => { state.waits.push(ms); state.clock += ms; },
    fetch: async () => {
      state.calls.push(state.clock);
      return state.calls.length <= failures
        ? { ok: false, status: 429, headers: { get: () => retryAfter } }
        : { ok: true, status: 200, json: async () => ({ ok: true }) };
    },
  });
  return state;
}

test("V30/V31: Retry-After en segundos, fecha futura, vencida e inválida se respeta completo", async () => {
  for (const [retryAfter, now, expected] of [["3", 1_000, 3_000], [new Date(5_000).toUTCString(), 1_000, 4_000], [new Date(0).toUTCString(), 9_000, 0], ["pronto", 0, 1_000]]) {
    const state = rateLimitedApi(retryAfter, { now });
    assert.deepEqual(await tmdbRequest(`/retry-${expected}-${now}`, {}, 0), { ok: true });
    assert.deepEqual(state.waits, expected ? [expected] : [], String(retryAfter));
    assert.equal(state.calls.length, 2);
    assert.ok(state.calls[1] >= now + expected, "el segundo intento nunca antes del instante autorizado");
  }
});

test("V30: Retry-After de 120 s no se recorta a 30 s: no reintenta y dice cuándo volver", async () => {
  const state = rateLimitedApi("120");
  const error = await tmdbRequest("/retry-long", {}, 0).catch((failure) => failure);
  assert.equal(error.code, "rate-limit");
  assert.equal(error.retryAt.getTime(), 120_000);
  assert.deepEqual([state.calls.length, state.waits], [1, []], "sin segunda petición adelantada");
  assert.equal(tmdbRetryAt().getTime(), 120_000);
  // Otra consulta durante el bloqueo tampoco sale a la red.
  const other = await tmdbRequest("/otra-consulta", {}, 0).catch((failure) => failure);
  assert.equal(other.code, "rate-limit");
  assert.equal(state.calls.length, 1);
  state.clock = 120_000;
  assert.deepEqual(await tmdbRequest("/despues", {}, 0), { ok: true }, "pasado el plazo se consulta de nuevo");
});

test("V30: las consultas lanzadas durante el bloqueo esperan el mismo instante; el jitter va después del mínimo", async () => {
  const state = rateLimitedApi("5", { random: () => 0.5 });
  const sleepers = [];
  configureTmdb({ wait: (ms) => new Promise((resolve) => sleepers.push({ ms, resolve })) }); // reloj manual
  const flush = () => new Promise((resolve) => setTimeout(resolve, 0));
  const first = tmdbRequest("/a", {}, 0);
  await flush(); // llega el 429
  const others = ["/b", "/c"].map((path) => tmdbRequest(path, {}, 0));
  await flush();
  assert.equal(state.calls.length, 1, "nadie más sale a la red durante el bloqueo");
  assert.deepEqual(sleepers.map((sleeper) => sleeper.ms), [5_500, 5_500, 5_500], "mínimo 5 s + jitter, nunca menos");
  state.clock = 5_500;
  sleepers.forEach((sleeper) => sleeper.resolve());
  assert.deepEqual(await Promise.all([first, ...others]), [{ ok: true }, { ok: true }, { ok: true }]);
  assert.ok(state.calls.slice(1).every((at) => at >= 5_000));
});

test("Doomsday fijada en el carrusel pide su fondo y no se confunde con Thunderbolts", async () => {
  const api = connect({
    "/movie/1003596": () => ({ id: 1003596, title: "Avengers: Doomsday", backdrop_path: "/doomsday.jpg" }),
    "/movie/986056": () => ({ id: 986056, title: "Thunderbolts*", backdrop_path: "/thunderbolts.jpg" }),
  });
  const [slide] = await getHeroSlides(1, ["avengers-doomsday"]);
  assert.equal(slide.id, "avengers-doomsday");
  assert.equal(slide.tmdbId, 1003596);
  assert.match(slide.backdrop, /\/doomsday\.jpg$/);
  assert.ok(api.calls.some((url) => url.pathname.endsWith("/movie/1003596")));
  assert.ok(!api.calls.some((url) => url.pathname.endsWith("/movie/986056")));
  assert.equal(fromTmdb({ id: 1003596, title: "Avengers: Doomsday" }).id, "avengers-doomsday");
  const thunderbolts = fromTmdb({ id: 986056, title: "Thunderbolts*", poster_path: "/thunderbolts.jpg" });
  assert.equal(thunderbolts.id, "tmdb-movie-986056");
  assert.equal(thunderbolts.title, "Thunderbolts*");
});

test("tmdb: sin token → modo local visible y catálogo local", async () => {
  configureTmdb({ token: "" });
  assert.equal(isTmdbEnabled(), false);
  assert.equal(getTmdbStatus().state, "local");
  await assert.rejects(tmdbRequest("/x"), { code: "no-token" });
  const { source, titles } = await getCollection("top-rated", 3);
  assert.equal(source, "local");
  assert.equal(titles.length, 3);
  assert.deepEqual((await getCollection("popular-tv")).titles, [], "sin equivalente local");
});

test("tmdb: estado de conexión, errores normalizados, reintento y cache", async () => {
  let status = 200;
  const api = connect({ "/authentication": () => status === 200 ? { success: true } : status, "/search/multi": () => (status === 200 ? page([]) : status) });

  assert.equal(getTmdbStatus().state, "checking");
  assert.equal((await checkTmdbConnection()).state, "connected");

  status = 429;
  await assert.rejects(searchMulti("a"), { code: "rate-limit" });
  assert.equal(api.calls.filter((url) => url.searchParams.get("query") === "a").length, 2, "reintenta una vez");
  assert.equal(getTmdbStatus().state, "error");
  assert.equal(getTmdbStatus().code, "rate-limit");

  status = 401;
  await assert.rejects(searchMulti("b"), { code: "auth" });
  status = 200;
  await searchMulti("b");
  await searchMulti("b");
  assert.equal(api.calls.filter((url) => url.searchParams.get("query") === "b").length, 2, "error sin cache; éxito cacheado");
  assert.equal(getTmdbStatus().state, "connected", "se recupera tras una respuesta correcta");
  assert.equal(api.calls[0].searchParams.get("language"), "es-MX");

  await assert.rejects(tmdbRequest("/no-existe"), { code: "not-found" });
  assert.equal(getTmdbStatus().state, "connected", "un 404 de un recurso no marca la conexión como caída");

  configureTmdb({ fetch: async () => ({ ok: true, status: 200, json: async () => null }) });
  await assert.rejects(searchMulti("c"), { code: "empty" });

  configureTmdb({ fetch: async () => Promise.reject(Object.assign(new Error("t"), { name: "TimeoutError" })) });
  await assert.rejects(searchMulti("d"), { code: "timeout" });
  assert.equal(getTmdbStatus().state, "error");
  configureTmdb({ fetch: async () => Promise.reject(new TypeError("offline")) });
  await assert.rejects(searchMulti("e"), { code: "network" });
});

test("tmdb offline: sin red usa la última respuesta guardada; sin caché o con JSON dañado, error", async () => {
  connect({ "/search/multi": () => page([{ id: 1, media_type: "movie", title: "Guardada" }]) });
  await searchMulti("offline-ok");

  configureTmdb({ fetch: async () => Promise.reject(new TypeError("offline")) });
  const saved = await searchMulti("offline-ok");
  assert.equal(saved.results[0].title, "Guardada", "la caché persistente sobrevive a configureTmdb");
  assert.equal(getTmdbStatus().state, "saved");

  await assert.rejects(searchMulti("offline-nunca-visto"), { code: "network" });
  assert.equal(getTmdbStatus().state, "error", "sin caché: error visible");

  const previous = globalThis.localStorage;
  globalThis.localStorage = { getItem: () => "{dañado", setItem() {}, removeItem() {} };
  try {
    await assert.rejects(searchMulti("offline-json-roto"), { code: "network" });
  } finally {
    globalThis.localStorage = previous;
  }
});

test("tmdb: búsqueda multi normaliza películas, series y personas", async () => {
  connect({
    "/search/multi": () =>
      page([
        { media_type: "movie", id: 603, title: "Matrix" }, // ya está en el catálogo local
        { media_type: "tv", id: 1396, name: "Breaking Bad", first_air_date: "2008-01-20", genre_ids: [18, 80], vote_average: 8.91 },
        { media_type: "person", id: 17419, name: "Bryan Cranston", known_for: [{ media_type: "tv", id: 1396, name: "Breaking Bad" }] },
      ]),
  });

  const result = await searchCatalog({ query: "matrix", genre: "todas", advanced: EMPTY_ADVANCED }, 1);
  assert.deepEqual(result.titles.map((t) => t.id), ["the-matrix", "tmdb-tv-1396"], "sin duplicar títulos locales");
  const series = result.titles[1];
  assert.equal(series.type, "tv");
  assert.equal(series.year, "2008");
  assert.equal(series.rating, 8.9);
  assert.deepEqual(series.genreKeys, ["drama", "crime"]);
  assert.equal(result.people[0].knownFor[0].title, "Breaking Bad");
  assert.equal(result.totalPages, 3);
});

test("tmdb: búsqueda + filtros (Batman, Netflix, 2020+, rating > 7, acción)", async () => {
  const api = connect({
    "/search/movie": () =>
      page([
        { id: 414906, title: "The Batman", release_date: "2022-03-01", genre_ids: [28, 80], vote_average: 7.7 }, // local
        { id: 1, title: "Batman viejo", release_date: "1989-06-23", genre_ids: [28], vote_average: 7.2 },
        { id: 2, title: "Batman malo", release_date: "2021-01-01", genre_ids: [28], vote_average: 5 },
        { id: 3, title: "Batman sin Netflix", release_date: "2023-01-01", genre_ids: [28], vote_average: 7.5 },
        { id: 4, title: "Batman comedia", release_date: "2023-01-01", genre_ids: [35], vote_average: 8 },
      ]),
    "/movie/414906/watch/providers": () => ({ results: { CO: { flatrate: [{ provider_id: 8, provider_name: "Netflix" }] } } }),
    "/movie/3/watch/providers": () => ({ results: { CO: { rent: [{ provider_id: 8, provider_name: "Netflix" }] } } }),
  });

  const advanced = { ...EMPTY_ADVANCED, provider: "netflix", releaseFrom: "2020-01-01", ratingMin: "7", genre: "action" };
  const result = await searchCatalog({ query: "Batman", genre: "todas", sort: "default", advanced }, 1);
  assert.deepEqual(result.titles.map((t) => t.id), ["the-batman"]);
  assert.equal(result.people.length, 0);
  const providerCalls = api.calls.filter((url) => url.pathname.endsWith("/watch/providers")).length;
  assert.equal(providerCalls, 2, "solo consulta plataforma de los que pasan los demás filtros");
});

test("FE03: búsqueda por texto aplica también el filtro de actor", async () => {
  connect({
    "/search/movie": () => page([
      { id: 801, title: "Dune actor", release_date: "2024-01-01", genre_ids: [], vote_average: 8 },
      { id: 802, title: "Dune sin actor", release_date: "2024-01-01", genre_ids: [], vote_average: 8 },
    ]),
    "/movie/801": () => ({ credits: { cast: [{ id: 77 }] } }),
    "/movie/802": () => ({ credits: { cast: [{ id: 88 }] } }),
  });
  const result = await searchCatalog({ query: "Dune", genre: "todas", sort: "default", advanced: { ...EMPTY_ADVANCED, person: { id: 77, name: "Actor" } } });
  assert.deepEqual(result.titles.map((title) => title.tmdbId), [801]);
});

test("FE10: película inexistente y error transitorio tienen resultados distintos", async () => {
  configureTmdb({
    token: "t",
    fetch: async (url) => url.pathname.endsWith("990001")
      ? { ok: false, status: 404 }
      : { ok: false, status: 503, json: async () => ({ error: { code: "upstream" } }) },
  });
  assert.equal(await getMovieById("tmdb-movie-990001"), null);
  await assert.rejects(getMovieById("tmdb-movie-990002"), (error) => error.code === "http" && error.status === 503);
});

test("tmdb: filtros avanzados → discover", () => {
  const params = toDiscoverParams({
    genre: "marvel",
    sort: "rating",
    advanced: { ...EMPTY_ADVANCED, type: "tv", genre: "science-fiction", year: "2020", language: "en", ratingMin: "7", provider: "netflix" },
  });
  assert.equal(params.with_genres, "10765");
  assert.equal(params.with_companies, "420");
  assert.equal(params.first_air_date_year, "2020");
  assert.equal(params.with_watch_providers, "8|1796");
  assert.equal(params.with_watch_monetization_types, "flatrate|free|ads");
  assert.equal(params["vote_average.gte"], "7");
  assert.equal(params.sort_by, "vote_average.desc");
});

test("tmdb: proveedores por tipo de oferta, colecciones mezcladas y detalle de serie", async () => {
  connect({
    "/watch/providers": () => ({
      results: {
        MX: { link: "javascript:alert(1)" }, // H-06: un upstream comprometido no inyecta enlaces
        PE: { link: "https://evil.example/themoviedb.org/" },
        CO: {
          link: "https://www.themoviedb.org/movie/1/watch?locale=CO",
          flatrate: [{ provider_id: 119, provider_name: "Amazon Prime Video", logo_path: "/p.jpg" }],
          ads: [{ provider_id: 119, provider_name: "Amazon Prime Video", logo_path: "/p.jpg" }],
          rent: [{ provider_id: 2, provider_name: "Apple TV" }],
          buy: [{ provider_id: 2, provider_name: "Apple TV" }],
        },
      },
    }),
    "/discover/movie": (url) => (url.searchParams.get("vote_count.gte") === "3000" ? page([{ id: 10, title: "Peli top" }, { id: 11, title: "Peli 2" }]) : 500),
    "/discover/tv": () => page([{ id: 20, name: "Serie top" }]),
    "/tv/1396": () => ({ id: 1396, name: "Breaking Bad", genres: [{ id: 18, name: "Drama" }], number_of_seasons: 5, created_by: [{ name: "Vince Gilligan" }] }),
  });

  const watch = await getTitleWatchProviders("movie", 1, "CO");
  assert.deepEqual(watch.providers.map((p) => p.id), [119], "suscripción + gratis, sin duplicados");
  assert.deepEqual(watch.offers.rent.map((p) => p.id), [2]);
  assert.deepEqual(watch.offers.buy.map((p) => p.id), [2]);
  assert.equal(watch.link, "https://www.themoviedb.org/movie/1/watch?locale=CO");
  assert.equal((await getTitleWatchProviders("movie", 1, "MX")).link, null);
  assert.equal((await getTitleWatchProviders("movie", 1, "PE")).link, null);

  const top = await getCollection("top-rated");
  assert.equal(top.source, "tmdb");
  assert.deepEqual(top.titles.map((t) => t.id), ["tmdb-movie-10", "tmdb-tv-20", "tmdb-movie-11"], "películas y series intercaladas");

  const series = await getMovieById("tmdb-tv-1396");
  assert.equal(series.duration, "5 temporadas");
  assert.equal(series.director, "Vince Gilligan");
});

test("tmdb: Duo pide solo el tipo elegido, con los filtros obligatorios en el servidor", async () => {
  const movie = (id) => ({ id, title: `Peli ${id}`, release_date: "2024-05-01", genre_ids: [878], vote_average: 7.9, vote_count: 900 });
  const offer = (id, name) => ({ results: { CO: { flatrate: [{ provider_id: id, provider_name: name }] } } });
  const api = connect({
    "/discover/movie": (url) => page(url.searchParams.get("page") === "1" ? [movie(1), movie(2)] : [movie(3), movie(1)], 3, Number(url.searchParams.get("page"))),
    "/discover/tv": () => page([]),
    "/watch/providers": (url) => (url.pathname.includes("/movie/2/") ? offer(8, "Netflix") : offer(119, "Amazon Prime Video")),
    "/movie/1": () => ({ ...movie(1), genres: [{ id: 878, name: "Ciencia ficción" }], runtime: 118, belongs_to_collection: { id: 77, name: "Saga X" } }),
  });

  const session = {
    ...DEFAULT_DUO_SESSION,
    providers: ["prime"],
    people: [{ ...DEFAULT_PERSON, genres: ["science-fiction"] }, { ...DEFAULT_PERSON, rejectedGenres: ["horror"], maxRuntime: 160 }],
  };
  const profile = buildProfile(session);
  const { source, titles, stats } = await getDuoCandidates(profile);
  assert.equal(source, "tmdb");
  assert.ok(!api.calls.some((url) => url.pathname.endsWith("/discover/tv")), "no mezcla series");
  const discover = api.calls.filter((url) => url.pathname.endsWith("/discover/movie"));
  // Con menos de MIN_RESULTS válidos hay segunda ronda: MÁS PÁGINAS con los MISMOS límites (nunca +minutos).
  assert.ok(discover.every((url) => url.searchParams.get("with_runtime.lte") === "130"), "los límites no se amplían para rellenar");
  const param = (url, key) => url.searchParams.get(key);
  const isWide = (url) =>
    (param(url, "sort_by") === "popularity.desc" && ["4", "5", "6"].includes(param(url, "page"))) || param(url, "vote_count.gte") === "500" || (param(url, "vote_count.lte") === "2500" && param(url, "page") === "2");
  const first = discover.filter((url) => !isWide(url));
  const tag = (url) => (url.searchParams.get("with_original_language") ? "+intl" : url.searchParams.get("primary_release_date.gte") ? "+fresh" : "");
  const origins = first.map((url) => url.searchParams.get("sort_by") + tag(url));
  assert.deepEqual(origins.sort(), [
    "popularity.desc",
    "popularity.desc",
    "popularity.desc",
    "popularity.desc+fresh",
    "popularity.desc+fresh",
    "vote_average.desc",
    "vote_average.desc+intl",
  ]);
  assert.ok(discover.some(isWide), "segunda ronda: más páginas");
  assert.deepEqual([stats.discovered, stats.enriched], [3, 3], "se mide cuánto se revisó y comprobó");
  assert.ok(stats.requests > 0 && Number.isFinite(stats.ms));
  const params = first[0].searchParams;
  assert.equal(params.get("with_genres"), "878");
  assert.equal(params.get("without_genres"), "16|27|99", "rechazado (terror) + animación y documental, que nadie eligió");
  assert.equal(params.get("with_runtime.lte"), "130", "el menor de los dos límites");
  assert.equal(params.get("with_watch_providers"), "119|9|10");
  assert.deepEqual(titles.map((t) => t.id).sort(), ["tmdb-movie-1", "tmdb-movie-2", "tmdb-movie-3"], "sin duplicados");
  const one = titles.find((t) => t.id === "tmdb-movie-1");
  assert.equal(one.runtime, 118, "duración exacta del detalle");
  assert.deepEqual(one.collection, { id: 77, name: "Saga X" });

  const history = addToHistory(EMPTY_HISTORY, "rejected", ["tmdb-movie-3"]);
  const { items, strict, rejectedBy } = rankTitles(titles, profile, { history });
  assert.deepEqual(items.map((item) => item.title.id), ["tmdb-movie-1"], "la de Netflix no completa: la plataforma marcada es un límite");
  assert.equal(strict, 1);
  assert.deepEqual(rejectedBy, { platform: 1, history: 1 }, "fuera la que no está en Prime y la rechazada");
  assert.deepEqual(items[0].reasons, [
    "Coincide con ciencia ficción, que eligió Persona 1.",
    "Está dentro del límite de duración: 1 h 58 min de 2 h 10 min como máximo.",
    "Está en Prime Video en Colombia.",
    "Tiene 7.9/10 en TMDB con 900 votos.",
  ]);
});

test("tmdb: maratón por saga usa la colección de TMDB también para películas del catálogo local", async () => {
  const part = (id, title, date) => ({ id, title, release_date: date, genre_ids: [28, 12], vote_average: 7.5, vote_count: 9000 });
  connect({
    "/discover/movie": () => page([part(429617, "Lejos de casa", "2019-06-28")], 1),
    "/watch/providers": () => ({ results: {} }),
    "/movie/429617": () => ({ ...part(429617, "Lejos de casa", "2019-06-28"), runtime: 129, belongs_to_collection: { id: 531241, name: "Spider-Man (MCU)" } }),
    "/collection/531241": () => ({
      name: "Spider-Man (MCU)",
      parts: [part(634649, "No Way Home", "2021-12-15"), part(315635, "Homecoming", "2017-07-05"), part(429617, "Lejos de casa", "2019-06-28")],
    }),
  });
  const anyLength = { ...DEFAULT_PERSON, genres: ["action"], maxRuntime: 0 };
  const session = { ...DEFAULT_DUO_SESSION, mode: "marathon", marathon: { type: "movie", maxMinutes: 720, count: 3, style: "thematic", scope: "saga" }, people: [anyLength, anyLength] };
  const profile = buildProfile(session);
  const { titles } = await getDuoCandidates(profile, { saga: true });
  const { items } = rankTitles(titles, profile, {});
  const plan = buildMarathon(items, session.marathon);
  assert.deepEqual(plan.entries.map((entry) => entry.id), ["spider-man-homecoming", "tmdb-movie-429617", "spider-man-no-way-home"], "las fichas locales entran en la saga, en orden");
  assert.equal(plan.notice, "Saga «Spider-Man (MCU)», en orden de estreno.");
});

test("tmdb: si discover falla, Duo usa el catálogo local", async () => {
  connect({ "/discover/movie": () => 500 });
  const result = await getDuoCandidates(buildProfile(DEFAULT_DUO_SESSION));
  assert.equal(result.source, "local");
  assert.equal(result.titles.length, 40);
  assert.match(result.notice, /error 500/);
  configureTmdb({ token: "" });
});

// ---------- N10: orden en la búsqueda de texto (V32–V34) ----------

test("V32: texto solo respeta el orden elegido (antes: Baja seguía antes que Alta) y lo declara de lo cargado", async () => {
  const results = [
    { id: 901, media_type: "movie", title: "Baja", release_date: "2001-01-01", vote_average: 2 },
    { id: 902, media_type: "movie", title: "Alta", release_date: "1999-01-01", vote_average: 9 },
    { id: 903, media_type: "movie", title: "Media", release_date: "2010-01-01", vote_average: 9 },
    { id: 77, media_type: "person", name: "Actor" },
  ];
  connect({ "/search/multi": () => page(results) });
  const titles = async (sort) => (await searchCatalog({ query: "x", genre: "todas", sort, advanced: EMPTY_ADVANCED }, 1)).titles.map((title) => title.title);
  assert.deepEqual(await titles("rating"), ["Alta", "Media", "Baja"], "empate 9–9 desempatado por título");
  assert.deepEqual(await titles("title"), ["Alta", "Baja", "Media"]);
  assert.deepEqual(await titles("year"), ["Media", "Baja", "Alta"]);
  assert.deepEqual(await titles("default"), ["Baja", "Alta", "Media"], "sin orden: relevancia de TMDB");
  const result = await searchCatalog({ query: "x", genre: "todas", sort: "rating", advanced: EMPTY_ADVANCED }, 1);
  assert.equal(result.sortScope, "loaded");
  assert.equal(result.people.length, 1, "las personas siguen apareciendo");
});

test("V32: texto + género y texto + persona también ordenan; discover declara orden de catálogo", async () => {
  connect({
    "/search/movie": () => page([
      { id: 911, title: "B", release_date: "2020-01-01", genre_ids: [28], vote_average: 5 },
      { id: 912, title: "A", release_date: "2020-01-01", genre_ids: [28], vote_average: 8 },
    ]),
    "/discover/movie": () => page([{ id: 913, title: "Z", vote_average: 1 }]),
  });
  const withGenre = await searchCatalog({ query: "x", genre: "todas", sort: "rating", advanced: { ...EMPTY_ADVANCED, genre: "action" } }, 1);
  assert.deepEqual(withGenre.titles.map((title) => title.title), ["A", "B"]);
  assert.equal(withGenre.sortScope, "loaded");
  const discover = await searchCatalog({ query: "", genre: "todas", sort: "rating", advanced: { ...EMPTY_ADVANCED, genre: "action" } }, 1);
  assert.equal(discover.sortScope, "catalog");
});

test("V32: al cargar otra página se reordena todo lo cargado (no solo la página nueva)", async () => {
  const { mergeSearchPage } = await import("../hooks/useTitleSearch.js");
  const first = { titles: [{ id: "a", title: "A", rating: 7 }, { id: "b", title: "B", rating: 5 }], people: [] };
  const merged = mergeSearchPage(first, { titles: [{ id: "c", title: "C", rating: 9 }, { id: "a", title: "A", rating: 7 }], people: [], page: 2, totalPages: 3, sortScope: "loaded" }, "rating");
  assert.deepEqual(merged.titles.map((title) => title.id), ["c", "a", "b"], "sin duplicados y en orden global de lo cargado");
});

// ---------- N22: favoritos con fallos parciales (V48) ----------

test("V48: tres favoritas y una ficha caída → dos visibles, una pendiente de reintento, ninguna borrada", async () => {
  connect({
    "/movie/1001": () => ({ id: 1001, title: "Uno" }),
    "/movie/1002": () => 500,
    "/movie/1003": () => ({ id: 1003, title: "Tres" }),
    "/movie/1004": () => 404,
  });
  const ids = ["tmdb-movie-1001", "tmdb-movie-1002", "tmdb-movie-1003", "tmdb-movie-1004"];
  const saved = [...ids];
  const result = await loadMoviesByIds(ids);
  assert.deepEqual(result.movies.map((movie) => movie.title), ["Uno", "Tres"]);
  assert.deepEqual(result.failedIds, ["tmdb-movie-1002"], "fallo transitorio ≠ inexistente");
  assert.deepEqual(result.missingIds, ["tmdb-movie-1004"]);
  assert.deepEqual(ids, saved, "los ids guardados no cambian");
  configureTmdb({ token: "" });
});
