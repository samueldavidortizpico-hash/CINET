/* TMDB con fetch falso: errores, estado, cache, paginación, filtros, normalización y fallback. `npm test` */
import { test } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_DUO_SESSION, DEFAULT_PERSON } from "../data/duo.js";
import { getDuoCandidates } from "./duoService.js";
import { addToHistory, EMPTY_HISTORY } from "./historyService.js";
import { buildMarathon, buildProfile, rankTitles } from "./recommender.js";
import { EMPTY_ADVANCED, fromTmdb, getCollection, getHeroSlides, getMovieById, searchCatalog, toDiscoverParams } from "./movieService.js";
import {
  checkTmdbConnection,
  configureTmdb,
  getTitleWatchProviders,
  getTmdbStatus,
  isTmdbEnabled,
  searchMulti,
  tmdbRequest,
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
  assert.deepEqual((await getTitleWatchProviders("movie", 1, "MX")).providers, []);

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
  const { source, titles } = await getDuoCandidates(profile);
  assert.equal(source, "tmdb");
  assert.ok(!api.calls.some((url) => url.pathname.endsWith("/discover/tv")), "no mezcla series");
  const discover = api.calls.filter((url) => url.pathname.endsWith("/discover/movie"));
  // Primera ronda (tope pedido: 130 min); con menos de MIN_RESULTS válidos, segunda ronda con +30 min.
  const first = discover.filter((url) => url.searchParams.get("with_runtime.lte") === "130");
  const origins = first.map((url) => url.searchParams.get("sort_by") + (url.searchParams.get("with_original_language") ? "+intl" : ""));
  assert.deepEqual(origins.sort(), ["popularity.desc", "popularity.desc", "popularity.desc", "vote_average.desc", "vote_average.desc+intl"]);
  const wide = discover.filter((url) => url.searchParams.get("with_runtime.lte") === "160");
  assert.ok(wide.length > 0 && wide.length + first.length === discover.length, "segunda ronda más amplia");
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
  assert.deepEqual(items.map((item) => item.title.id), ["tmdb-movie-1", "tmdb-movie-2"]);
  assert.equal(strict, 1);
  assert.deepEqual(rejectedBy, { platform: 1, history: 1 }, "fuera la que no está en Prime y la rechazada");
  assert.equal(items[1].reasons[0], "Es una alternativa: puede no estar en sus plataformas.", "la de Netflix solo completa, marcada");
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
