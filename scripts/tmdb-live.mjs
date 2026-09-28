/* Prueba REAL contra TMDB (red + token). No forma parte de `npm test`.
   Uso: npm run test:tmdb   (lee VITE_TMDB_READ_TOKEN de .env) */
import { test } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_DUO_SESSION, DEFAULT_PERSON } from "../src/data/duo.js";
import { getDuoCandidates } from "../src/services/duoService.js";
import { buildProfile, rankTitles } from "../src/services/recommender.js";
import { EMPTY_ADVANCED, findMovie, getCollection, getMovieById, getTitleExtras, searchCatalog } from "../src/services/movieService.js";
import { checkTmdbConnection, isTmdbEnabled } from "../src/services/tmdbClient.js";

const search = (query, advanced = EMPTY_ADVANCED) => searchCatalog({ query, genre: "todas", sort: "default", advanced }, 1);

test("TMDB real", { skip: !isTmdbEnabled() && "Falta VITE_TMDB_READ_TOKEN en .env" }, async (t) => {
  await t.test("conexión y token válidos", async () => {
    const status = await checkTmdbConnection();
    assert.equal(status.state, "connected", status.message);
  });

  await t.test("Avatar: The Way of Water se une a la ficha local (sin duplicar)", async () => {
    const { titles } = await search("Avatar: The Way of Water");
    const avatar = titles.find((title) => title.tmdbId === 76600);
    assert.equal(avatar, findMovie("avatar-way-of-water"));
  });

  await t.test("Oppenheimer llega desde TMDB con póster, fondo e información", async () => {
    const { titles } = await search("Oppenheimer");
    const movie = titles.find((title) => title.tmdbId === 872585);
    assert.ok(movie, "aparece en /search/multi");
    assert.equal(findMovie(movie.id), null, "no está en el catálogo local");
    assert.equal(movie.id, "tmdb-movie-872585");
    assert.match(movie.poster, /^https:\/\/image\.tmdb\.org\/t\/p\/w500\//);
    assert.match(movie.backdrop, /^https:\/\/image\.tmdb\.org\/t\/p\/w1280\//);
    assert.ok(movie.description.length > 40);

    const detail = await getMovieById(movie.id);
    assert.equal(detail.director, "Christopher Nolan");
    assert.ok(detail.trailerKey, "tráiler para TrailerModal");

    const extras = await getTitleExtras(detail, "CO");
    assert.ok(extras.cast.length > 0 && extras.genres.length > 0);
    assert.ok(extras.runtime && extras.language && extras.releaseDate);
    assert.ok(extras.related.length > 0, "También te puede gustar");
    assert.ok(extras.directors.some((person) => person.name === "Christopher Nolan"));
    assert.ok(extras.countries.length > 0);
    assert.ok(extras.watch && "subscription" in extras.watch.offers);
    console.log("   Oppenheimer en CO:", JSON.stringify(Object.fromEntries(
      Object.entries(extras.watch.offers).map(([kind, list]) => [kind, list.map((p) => `${p.name} (${p.id})`)])
    )));
  });

  await t.test("series y búsqueda con filtros", async () => {
    const { titles, people } = await search("The Last of Us");
    assert.ok(titles.some((title) => title.type === "tv"));
    assert.ok(Array.isArray(people));
    const filtered = await search("Batman", { ...EMPTY_ADVANCED, releaseFrom: "2020-01-01", ratingMin: "7", genre: "action" });
    assert.ok(filtered.titles.every((title) => Number(title.year) >= 2020 && title.rating >= 7));
  });

  await t.test("secciones del inicio", async () => {
    for (const name of ["trending", "popular-movies", "popular-tv", "top-rated", "upcoming"]) {
      const { source, titles } = await getCollection(name, 5);
      assert.equal(source, "tmdb", name);
      assert.ok(titles.length > 0, name);
    }
  });

  const duo = (mode, a, b) =>
    buildProfile({ ...DEFAULT_DUO_SESSION, mode, providers: ["netflix", "prime"], people: [{ ...DEFAULT_PERSON, ...a }, { ...DEFAULT_PERSON, ...b }] });

  for (const [label, profile] of [
    ["películas", duo("movie", { genres: ["science-fiction"] }, { genres: ["drama"] })],
    ["series", duo("tv", { genres: ["drama"], episodeMax: 65 }, { genres: ["crime"], seriesStatus: "ended" })],
  ]) {
    await t.test(`Duo (${label}) con plataformas de Colombia`, async () => {
      const { source, titles } = await getDuoCandidates(profile);
      assert.equal(source, "tmdb");
      const { items, rejectedBy } = rankTitles(titles, profile, {});
      assert.ok(items.every(({ title }) => title.type === profile.type), "no mezcla tipos");
      console.log(`   Duo ${label}: ${items.length} válidos`, rejectedBy);
      console.log(items.slice(0, 3).map(({ title, score, reasons }) => `   ${title.title} (${score}) — ${reasons.join(" ")}`).join("\n"));
    });
  }
});
