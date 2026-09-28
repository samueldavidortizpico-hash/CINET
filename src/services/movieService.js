/* =========================================================
   movieService — consultas y transformación del catálogo.
   Devuelve Promises (misma firma que tendrá la API del backend),
   así los componentes no cambian cuando los datos sean remotos.

   Con token de TMDB, las búsquedas, listas y detalles llegan de la API
   y se normalizan al mismo modelo que el catálogo local. Sin token o
   ante un error, se usa el catálogo local (fallback).
   ========================================================= */

import { movies as catalog } from "../data/movies.js";
import trailerKeys from "../data/trailerKeys.json" with { type: "json" };
import tmdbIds from "../data/tmdbIds.json" with { type: "json" };
import { PLATFORMS } from "../data/platforms.js";
import { CINEMAS, MONTHS, SHOW_TIMES, WEEKDAYS } from "../data/showtimes.js";
import { getHeroPreferences } from "./heroPreferences.js";
import { GENRES, genreKeysFor, genreLabel } from "../data/tmdb.js";
import {
  discoverMovies,
  discoverTv,
  getTitleDetails,
  getTitleList,
  getTitleSummary,
  getTitleWatchProviders,
  isTmdbEnabled,
  searchMulti,
  searchTitles,
  tmdbImage,
} from "./tmdbClient.js";

const BASE_URL = import.meta.env?.BASE_URL ?? "/";

// Enlaces antiguos (pelicula.html?id=spiderman) → id actual del catálogo.
const ALIASES = { spiderman: "spider-man-no-way-home", batman: "the-batman" };

export const GENRE_FILTERS = [
  { value: "todas", label: "Todas" },
  { value: "marvel", label: "🦸 Marvel" },
  { value: "dc", label: "🦇 DC" },
  { value: "accion", label: "💥 Acción" },
  { value: "ciencia", label: "🚀 Ciencia ficción" },
  { value: "aventura", label: "🌎 Aventura" },
  { value: "animacion", label: "🧸 Animación" },
];

export const SORT_OPTIONS = [
  { value: "default", label: "Orden original" },
  { value: "rating", label: "⭐ Mejor calificadas" },
  { value: "year", label: "🆕 Más recientes" },
  { value: "title", label: "🔤 Nombre A-Z" },
];

/** Filtros avanzados ("Más filtros"). region solo acompaña al filtro de plataforma. */
export const EMPTY_ADVANCED = {
  type: "movie",
  genre: "",
  year: "",
  language: "",
  runtimeMax: "",
  ratingMin: "",
  region: "CO",
  provider: "",
  releaseFrom: "",
  releaseTo: "",
  person: null, // { id, name } — actor o director elegido en el buscador
};

export const isAdvancedActive = (advanced = EMPTY_ADVANCED) =>
  Object.entries(advanced).some(([key, value]) => key !== "region" && value !== EMPTY_ADVANCED[key]);

const SORTERS = {
  rating: (a, b) => b.rating - a.rating,
  year: (a, b) => Number(b.year) - Number(a.year),
  title: (a, b) => a.title.localeCompare(b.title, "es"),
};

const plain = (text) => String(text).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
const GENRE_BY_LABEL = new Map(GENRES.map((genre) => [plain(genre.label), genre.key]));

/** "2h 49min" → 169. "Por confirmar" → null. */
function parseRuntime(duration) {
  const hours = /(\d+)\s*h/.exec(duration ?? "");
  const minutes = /(\d+)\s*min/.exec(duration ?? "");
  if (!hours && !minutes) return null;
  return Number(hours?.[1] ?? 0) * 60 + Number(minutes?.[1] ?? 0);
}

const formatRuntime = (minutes) =>
  minutes ? `${Math.floor(minutes / 60)}h ${minutes % 60}min`.replace(/^0h /, "") : "Por confirmar";

/** Géneros de CineHub (claves de data/tmdb.js) de una película local. */
function localGenreKeys(data) {
  const keys = new Set();
  const byFilter = GENRES.find((genre) => genre.local === data.genreFilter);
  if (byFilter) keys.add(byFilter.key);
  for (const label of [...(data.tags ?? []), ...String(data.genre ?? "").split("/")]) {
    const key = GENRE_BY_LABEL.get(plain(label));
    if (key) keys.add(key);
  }
  return [...keys];
}

function toMovie([id, data]) {
  return {
    id,
    ...data,
    type: "movie",
    tmdbId: tmdbIds[id] ?? null,
    genreKeys: localGenreKeys(data),
    runtime: parseRuntime(data.duration),
    language: null,
    collection: data.universe ? { id: `local-${data.universe}`, name: data.universe } : null, // saga o universo (maratón)
    poster: data.poster ? `${BASE_URL}${data.poster}` : "",
    backdrop: data.backdrop ? `${BASE_URL}${data.backdrop}` : "",
    trailerKey: trailerKeys[id] ?? null,
  };
}

const MOVIES = Object.entries(catalog).map(toMovie);
const BY_TMDB_ID = new Map(MOVIES.map((movie) => [movie.tmdbId, movie]));

export function getMovies() {
  return Promise.resolve(MOVIES);
}

/** Búsqueda síncrona tolerante: alias antiguos y mayúsculas. */
export function findMovie(rawId) {
  const id = String(rawId ?? "").toLowerCase().trim();
  const resolved = ALIASES[id] ?? id;
  return MOVIES.find((movie) => movie.id === resolved) ?? null;
}

const pad = (n) => String(n).padStart(2, "0");
export const toISODate = (date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

function pickTrailer(videos) {
  const youtube = (videos?.results ?? []).filter((video) => video.site === "YouTube");
  const trailers = youtube.filter((video) => video.type === "Trailer");
  return (trailers.find((video) => video.official) ?? trailers[0] ?? youtube[0])?.key ?? null;
}

/**
 * Resultado de TMDB (lista o detalle, película o serie) → modelo de CineHub.
 * Si la película ya está en el catálogo local se devuelve esa (mismo id,
 * favoritos, planes y tráiler), así nunca hay dos fichas del mismo título.
 */
export function fromTmdb(raw, fallbackType = "movie") {
  const type = raw.media_type ?? fallbackType;
  const local = type === "movie" ? BY_TMDB_ID.get(raw.id) : null;
  if (local) return local;

  const genreIds = raw.genre_ids ?? raw.genres?.map((genre) => genre.id) ?? [];
  const genreNames = raw.genres?.map((genre) => genre.name) ?? genreIds.map((id) => genreLabel(type, id)).filter(Boolean);
  const date = raw.release_date ?? raw.first_air_date ?? "";
  // Series: TMDB ya casi no llena episode_run_time; el último episodio emitido sí trae su duración.
  const runtime = raw.runtime || raw.episode_run_time?.[0] || raw.last_episode_to_air?.runtime || null;
  const seasons = raw.number_of_seasons;
  const collection = raw.belongs_to_collection;

  return {
    id: `tmdb-${type}-${raw.id}`,
    type,
    tmdbId: raw.id,
    title: raw.title ?? raw.name ?? "Sin título",
    year: date.slice(0, 4),
    releaseDate: date,
    genre: genreNames.slice(0, 2).join(" / ") || (type === "tv" ? "Serie" : "Película"),
    genreKeys: genreKeysFor(type, genreIds),
    tags: genreNames,
    rating: Math.round((raw.vote_average ?? 0) * 10) / 10,
    votes: raw.vote_count ?? null,
    popularity: raw.popularity ?? 0,
    language: raw.original_language ?? null,
    runtime,
    seasons: seasons ?? null,
    episodes: raw.number_of_episodes ?? null,
    seriesStatus: type === "tv" ? (raw.status ?? null) : null,
    collection: collection ? { id: collection.id, name: collection.name } : null,
    keywords: (raw.keywords?.keywords ?? raw.keywords?.results ?? []).map((keyword) => keyword.name),
    duration: seasons ? `${seasons} temporada${seasons === 1 ? "" : "s"}` : formatRuntime(runtime),
    status: date > toISODate(new Date()) ? "PRÓXIMAMENTE" : null,
    description: raw.overview || "Sin sinopsis disponible.",
    poster: tmdbImage(raw.poster_path, "w500"),
    backdrop: tmdbImage(raw.backdrop_path, "w1280"),
    director: raw.credits?.crew?.find((person) => person.job === "Director")?.name ?? raw.created_by?.[0]?.name ?? null,
    universe: raw.belongs_to_collection?.name ?? (type === "tv" ? "Serie" : null),
    trailerKey: pickTrailer(raw.videos),
  };
}

const TMDB_ID_PATTERN = /^tmdb-(movie|tv)-(\d+)$/;

/** Local por id/alias; `tmdb-movie-123` / `tmdb-tv-456` se piden a TMDB. */
export async function getMovieById(id) {
  const local = findMovie(id);
  if (local) return local;
  const match = TMDB_ID_PATTERN.exec(String(id ?? ""));
  if (!match || !isTmdbEnabled()) return null;
  try {
    return fromTmdb(await getTitleDetails(match[1], Number(match[2])), match[1]);
  } catch {
    return null;
  }
}

/** Favoritos y listas guardadas pueden mezclar ids locales y de TMDB. */
export async function getMoviesByIds(ids) {
  const list = await Promise.all(ids.map(getMovieById));
  return list.filter(Boolean);
}

function matchesGenre(movie, genre) {
  const universe = (movie.universe ?? "").toLowerCase();
  if (genre === "todas") return true;
  if (genre === "marvel") return universe.includes("marvel");
  if (genre === "dc") return universe === "dc";
  if (genre === "ciencia") return movie.genreFilter === "ciencia-ficcion";
  return movie.genreFilter === genre;
}

/** Filtros avanzados aplicables al catálogo local (idioma y plataforma requieren TMDB). */
function matchesAdvanced(movie, advanced) {
  const { type, genre, year, runtimeMax, ratingMin, releaseFrom, releaseTo } = advanced;
  if (type === "tv") return false;
  if (genre && !movie.genreKeys.includes(genre)) return false;
  if (year && movie.year !== String(year)) return false;
  if (runtimeMax && !(movie.runtime && movie.runtime <= Number(runtimeMax))) return false;
  if (ratingMin && movie.rating < Number(ratingMin)) return false;
  if (releaseFrom && movie.year < releaseFrom.slice(0, 4)) return false;
  if (releaseTo && movie.year > releaseTo.slice(0, 4)) return false;
  return true;
}

/** Busca, filtra y ordena sin mutar la lista original. */
export function queryMovies(movies, { query = "", genre = "todas", sort = "default", advanced = EMPTY_ADVANCED } = {}) {
  const text = query.toLowerCase().trim();
  const result = movies.filter(
    (movie) =>
      movie.title.toLowerCase().includes(text) && matchesGenre(movie, genre) && matchesAdvanced(movie, advanced)
  );
  return SORTERS[sort] ? [...result].sort(SORTERS[sort]) : result;
}

export function getTrendingMovies(movies, limit = 10) {
  return [...movies].sort((a, b) => b.popularity - a.popularity).slice(0, limit);
}

/* ---------- Búsqueda global y filtros avanzados (TMDB) ---------- */

// Botones de género del catálogo → filtro equivalente en discover.
const LEGACY_FILTERS = {
  marvel: { companies: "420" },
  dc: { companies: "9993|429|128064" },
  accion: { genre: "action" },
  ciencia: { genre: "science-fiction" },
  aventura: { genre: "adventure" },
  animacion: { genre: "animation" },
};

export function toDiscoverParams({ genre = "todas", sort = "default", advanced = EMPTY_ADVANCED } = {}) {
  const type = advanced.type === "tv" ? "tv" : "movie";
  const tv = type === "tv";
  const legacy = LEGACY_FILTERS[genre] ?? {};
  const genreIds = [advanced.genre, legacy.genre]
    .map((key) => GENRES.find((item) => item.key === key)?.[type])
    .filter(Boolean);
  const date = tv ? "first_air_date" : "primary_release_date";

  return {
    sort_by: { rating: "vote_average.desc", year: `${date}.desc`, title: tv ? "name.asc" : "title.asc" }[sort] ?? "popularity.desc",
    "vote_count.gte": sort === "rating" ? 200 : undefined,
    with_genres: [...new Set(genreIds)].join(",") || undefined,
    with_companies: legacy.companies,
    [tv ? "first_air_date_year" : "primary_release_year"]: advanced.year,
    with_original_language: advanced.language,
    "with_runtime.lte": advanced.runtimeMax,
    "vote_average.gte": advanced.ratingMin,
    watch_region: advanced.region,
    with_watch_providers: PLATFORMS.find((platform) => platform.id === advanced.provider)?.tmdbIds.join("|"),
    with_watch_monetization_types: advanced.provider ? "flatrate|free|ads" : undefined, // "lo tienen": no alquiler/compra
    with_people: advanced.person?.id,
    [`${date}.gte`]: advanced.releaseFrom,
    [`${date}.lte`]: advanced.releaseTo || (sort === "year" ? toISODate(new Date()) : undefined),
  };
}

const toPerson = (raw) => ({
  id: raw.id,
  name: raw.name,
  photo: tmdbImage(raw.profile_path, "w185"),
  department: raw.known_for_department ?? "",
  knownFor: (raw.known_for ?? []).slice(0, 3).map((title) => fromTmdb(title)),
});

const hasFilters = ({ genre = "todas", advanced = EMPTY_ADVANCED }) => genre !== "todas" || isAdvancedActive(advanced);

/** Filtros que se pueden comprobar con los datos que trae /search. */
function matchesSearchResult(raw, type, { genre = "todas", advanced = EMPTY_ADVANCED }) {
  const date = raw.release_date ?? raw.first_air_date ?? "";
  const genreIds = [advanced.genre, LEGACY_FILTERS[genre]?.genre]
    .filter(Boolean)
    .map((key) => GENRES.find((item) => item.key === key)?.[type]);
  if (genreIds.some((id) => !id || !raw.genre_ids?.includes(id))) return false;
  if (advanced.ratingMin && (raw.vote_average ?? 0) < Number(advanced.ratingMin)) return false;
  if (advanced.language && raw.original_language !== advanced.language) return false;
  if (advanced.releaseFrom && (!date || date < advanced.releaseFrom)) return false;
  if (advanced.releaseTo && (!date || date > advanced.releaseTo)) return false;
  return true;
}

/** Plataforma, duración y estudio (Marvel/DC) no vienen en /search: se consultan por título, con cache. */
async function matchesTitleDetails(raw, type, { genre = "todas", advanced = EMPTY_ADVANCED }) {
  if (advanced.provider) {
    const platform = PLATFORMS.find((item) => item.id === advanced.provider);
    const watch = await getTitleWatchProviders(type, raw.id, advanced.region).catch(() => null);
    if (!watch?.providers.some((provider) => platform.tmdbIds.includes(provider.id))) return false;
  }
  const companies = LEGACY_FILTERS[genre]?.companies?.split("|").map(Number);
  if (advanced.runtimeMax || companies) {
    const details = await getTitleDetails(type, raw.id).catch(() => null);
    if (!details) return false;
    const runtime = details.runtime ?? details.episode_run_time?.[0];
    if (advanced.runtimeMax && !(runtime && runtime <= Number(advanced.runtimeMax))) return false;
    if (companies && !details.production_companies?.some((company) => companies.includes(company.id))) return false;
  }
  return true;
}

/**
 * Una página de resultados remotos. Lanza TmdbError.
 * - Solo texto: /search/multi (películas, series y personas).
 * - Texto + filtros: /search/movie|tv y se aplican los filtros a los resultados.
 * - Solo filtros: /discover.
 */
export async function searchCatalog(filters, page = 1) {
  const text = filters.query?.trim();
  if (text && !hasFilters(filters)) {
    const data = await searchMulti(text, page);
    const isPerson = (raw) => raw.media_type === "person";
    return {
      titles: data.results.filter((raw) => !isPerson(raw)).map((raw) => fromTmdb(raw)),
      people: data.results.filter(isPerson).map(toPerson),
      page: data.page,
      totalPages: data.totalPages,
    };
  }

  const advanced = filters.advanced ?? EMPTY_ADVANCED;
  const type = advanced.type === "tv" ? "tv" : "movie";

  if (text) {
    const year = advanced.year ? { [type === "tv" ? "first_air_date_year" : "primary_release_year"]: advanced.year } : {};
    const data = await searchTitles(type, text, year, page);
    const candidates = data.results.filter((raw) => matchesSearchResult(raw, type, filters));
    const checks = await Promise.all(candidates.map((raw) => matchesTitleDetails(raw, type, filters)));
    const titles = candidates.filter((_, index) => checks[index]).map((raw) => fromTmdb(raw, type));
    return {
      titles: SORTERS[filters.sort] ? [...titles].sort(SORTERS[filters.sort]) : titles,
      people: [],
      page: data.page,
      totalPages: data.totalPages,
    };
  }

  const data = await (type === "tv" ? discoverTv : discoverMovies)(toDiscoverParams(filters), page);
  return { titles: data.results.map((raw) => fromTmdb(raw, type)), people: [], page: data.page, totalPages: data.totalPages };
}

/* ---------- Secciones del inicio ---------- */

/** Loader de una lista fija de TMDB (el tipo sale de la ruta o de media_type). */
const listOf = (path, params, page = 1) => async () => {
  const { results } = await getTitleList(path, params, page);
  const type = path.startsWith("/tv") ? "tv" : "movie";
  return results.filter((raw) => raw.media_type !== "person").map((raw) => fromTmdb(raw, type));
};

const discovered = (type, params, page = 1) => async () => {
  const { results } = await (type === "tv" ? discoverTv : discoverMovies)(params, page);
  return results.map((raw) => fromTmdb(raw, type));
};

function shuffle(list, random = Math.random) {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/** Últimas favoritas con id de TMDB: semillas de "Recomendadas para ti". */
function favoriteSeeds(favorites = []) {
  return favorites
    .slice(-3)
    .map((id) => {
      const local = findMovie(id);
      if (local?.tmdbId) return { type: "movie", tmdbId: local.tmdbId };
      const match = TMDB_ID_PATTERN.exec(String(id));
      return match ? { type: match[1], tmdbId: Number(match[2]) } : null;
    })
    .filter(Boolean);
}

const favoriteGenres = (favorites = []) => favorites.flatMap((id) => findMovie(id)?.genreKeys ?? []);

const genreIdsFor = (keys, type) =>
  [...new Set(GENRES.filter((genre) => keys.includes(genre.key)).map((genre) => genre[type]).filter(Boolean))].join("|");

const COLLECTIONS = {
  trending: { remote: () => [listOf("/trending/all/day")], local: (movies) => getTrendingMovies(movies) },
  "popular-movies": { remote: () => [listOf("/movie/popular")] },
  "popular-tv": { remote: () => [listOf("/tv/popular")] },
  // discover con muchos votos: /top_rated incluye estrenos con pocas valoraciones.
  "top-rated": {
    remote: () => [
      discovered("movie", { sort_by: "vote_average.desc", "vote_count.gte": 3000 }),
      discovered("tv", { sort_by: "vote_average.desc", "vote_count.gte": 1500 }),
    ],
    local: (movies) => [...movies].sort(SORTERS.rating),
  },
  upcoming: {
    remote: () => [listOf("/movie/upcoming", { region: "CO" })],
    local: (movies) => movies.filter((movie) => movie.status === "PRÓXIMAMENTE" || Number(movie.year) > new Date().getFullYear()),
  },
  // En cines de Colombia hoy (TMDB). Sin TMDB no hay cartelera real: no se rellena con el catálogo local.
  "now-playing": {
    remote: () =>
      [1, 2].map((page) => async () =>
        (await listOf("/movie/now_playing", { region: "CO" }, page)()).filter((title) => title.status !== "PRÓXIMAMENTE")
      ),
  },
  // A partir de las últimas favoritas (recomendaciones de TMDB o géneros en común).
  "for-you": {
    remote: ({ favorites }) => favoriteSeeds(favorites).map(({ type, tmdbId }) => listOf(`/${type}/${tmdbId}/recommendations`)),
    local: (movies, { favorites = [] }) => {
      const keys = favoriteGenres(favorites);
      return keys.length ? movies.filter((movie) => movie.genreKeys.some((key) => keys.includes(key))).sort(SORTERS.rating) : [];
    },
    exclude: ({ favorites = [] }) => favorites,
  },
  // Joyas poco vistas y bien valoradas; página al azar para que cambie en cada visita.
  "discover-new": {
    remote: ({ random = Math.random }) => [
      discovered("movie", { sort_by: "vote_average.desc", "vote_count.gte": 150, "vote_count.lte": 2500 }, 1 + Math.floor(random() * 5)),
    ],
    local: (movies, { random = Math.random }) => shuffle(movies, random),
  },
  // Géneros de la última sesión Duo o, si no hay, comedia y romance.
  couple: {
    remote: ({ genres = [] }) => {
      const keys = genres.length ? genres : ["romance", "comedy"];
      return [
        discovered("movie", {
          with_genres: genreIdsFor(keys, "movie"),
          sort_by: "popularity.desc",
          "vote_average.gte": 6.8,
          "vote_count.gte": 300,
        }),
      ];
    },
    local: (movies, { genres = [] }) => {
      const keys = genres.length ? genres : ["romance", "comedy", "animation", "drama"];
      return movies.filter((movie) => movie.genreKeys.some((key) => keys.includes(key))).sort(SORTERS.rating);
    },
  },
};

/** [[a1, a2], [b1]] → [a1, b1, a2]: mezcla listas (películas y series) sin repetir. */
function interleave(lists) {
  const longest = Math.max(0, ...lists.map((list) => list.length));
  const mixed = Array.from({ length: longest }, (_, index) => lists.map((list) => list[index])).flat().filter(Boolean);
  return mixed.filter((title, index) => mixed.findIndex((other) => other.id === title.id) === index);
}

/**
 * → { source: "tmdb" | "local", titles }. TMDB vacío o con error usa el catálogo local.
 * context: { favorites, genres, random } para las secciones personalizadas.
 */
export async function getCollection(name, limit = 10, context = {}) {
  const collection = COLLECTIONS[name];
  const exclude = collection.exclude?.(context) ?? [];
  const keep = (titles) => titles.filter((title) => !exclude.includes(title.id)).slice(0, limit);
  if (isTmdbEnabled()) {
    try {
      const loaders = collection.remote(context);
      const titles = keep(interleave(await Promise.all(loaders.map((load) => load()))));
      if (titles.length) return { source: "tmdb", titles };
    } catch {
      /* cae al catálogo local */
    }
  }
  return { source: "local", titles: keep(collection.local?.(MOVIES, context) ?? []) };
}

/**
 * Imagen de fondo del carrusel: la de TMDB si existe (también para las fichas locales, vía tmdbId);
 * si no hay, backdrop vacío y el carrusel muestra el póster nítido en lugar de un fondo roto.
 */
async function withHeroBackdrop(title) {
  if (title.backdrop) return title;
  if (!title.tmdbId || !isTmdbEnabled()) return title;
  const summary = await getTitleSummary(title.type ?? "movie", title.tmdbId).catch(() => null);
  const backdrop = tmdbImage(summary?.backdrop_path, "w1280");
  return backdrop ? { ...title, backdrop } : title;
}

/**
 * Diapositivas del carrusel del inicio. Primero las fijadas en el dashboard (en su orden, aunque no
 * estén en tendencias o aún no se estrenen: las eligió el editor); luego tendencias ya estrenadas.
 */
export async function getHeroSlides(limit = 6, featuredIds = getHeroPreferences().featuredIds) {
  const { titles } = await getCollection("trending", 16);
  const byId = new Map([...MOVIES, ...titles].map((title) => [title.id, title]));
  const pinned = (await Promise.all(featuredIds.map(async (id) => byId.get(id) ?? (await getMovieById(id))))).filter(Boolean);
  const rest = titles.filter((title) => title.status !== "PRÓXIMAMENTE" && !featuredIds.includes(title.id));
  const slides = [...pinned, ...rest].filter((title) => title.backdrop || title.poster).slice(0, Math.max(limit, pinned.length));
  return Promise.all(slides.map(withHeroBackdrop));
}

/* ---------- Perfil cinéfilo ---------- */

/** Estadísticas de gustos a partir de títulos vistos y favoritos. */
export function getTasteStats(titles) {
  const count = (keys) => keys.reduce((totals, key) => ({ ...totals, [key]: (totals[key] ?? 0) + 1 }), {});
  const ranking = (totals) => Object.entries(totals).sort((a, b) => b[1] - a[1]);

  const genres = ranking(count(titles.flatMap((title) => title.genreKeys ?? []))).map(([key, total]) => ({
    label: GENRES.find((genre) => genre.key === key)?.label ?? key,
    count: total,
  }));
  const runtimes = titles.map((title) => title.runtime).filter(Boolean);
  const decades = ranking(count(titles.map((title) => Number(title.year)).filter(Boolean).map((year) => Math.floor(year / 10) * 10)));

  return {
    total: titles.length,
    genres,
    topGenre: genres[0]?.label ?? null,
    avgRuntime: runtimes.length ? Math.round(runtimes.reduce((a, b) => a + b, 0) / runtimes.length) : null,
    favoriteDecade: decades.length ? `Años ${decades[0][0]}` : null,
  };
}

/* ---------- Detalle enriquecido ---------- */

const KEY_JOBS = ["Screenplay", "Writer", "Producer", "Original Music Composer", "Director of Photography"];

const languageNames = new Intl.DisplayNames(["es"], { type: "language" });
const regionNames = new Intl.DisplayNames(["es"], { type: "region" });
const capitalize = (text) => (text ? text[0].toUpperCase() + text.slice(1) : text);
const languageName = (code) => (code ? capitalize(languageNames.of(code) ?? code) : null);
const countryName = (code) => {
  try {
    return regionNames.of(code) ?? code;
  } catch {
    return code;
  }
};

function pickCertification(raw, region) {
  if (raw.content_ratings) {
    const ratings = raw.content_ratings.results ?? [];
    return (ratings.find((item) => item.iso_3166_1 === region) ?? ratings.find((item) => item.iso_3166_1 === "US"))?.rating || null;
  }
  const releases = raw.release_dates?.results ?? [];
  const forRegion = releases.find((item) => item.iso_3166_1 === region) ?? releases.find((item) => item.iso_3166_1 === "US");
  return forRegion?.release_dates.find((item) => item.certification)?.certification ?? null;
}

const toPersonCard = (person, role) => ({
  id: `${person.id}-${role}`,
  name: person.name,
  role,
  photo: tmdbImage(person.profile_path, "w185"),
});

/**
 * Reparto, dirección, equipo, géneros, keywords, fecha, duración, idioma, país,
 * colección, certificación, recomendaciones + similares, tráiler y dónde verla.
 * null si el título no tiene id de TMDB o no hay token.
 */
export async function getTitleExtras(movie, region = "CO") {
  if (!movie?.tmdbId || !isTmdbEnabled()) return null;
  const type = movie.type ?? "movie";
  const [raw, watch] = await Promise.all([
    getTitleDetails(type, movie.tmdbId),
    getTitleWatchProviders(type, movie.tmdbId, region).catch(() => null),
  ]);
  const runtime = raw.runtime ?? raw.episode_run_time?.[0] ?? null;
  const directors = [
    ...(raw.created_by ?? []).map((person) => toPersonCard(person, "Creación")),
    ...(raw.credits?.crew ?? []).filter((person) => person.job === "Director").map((person) => toPersonCard(person, "Dirección")),
  ];
  const related = (list) => (list?.results ?? []).slice(0, 10).map((item) => fromTmdb(item, type));
  const countries = raw.production_countries?.map((country) => country.iso_3166_1) ?? raw.origin_country ?? [];

  return {
    cast: (raw.credits?.cast ?? []).slice(0, 12).map((person) => ({
      id: person.id,
      name: person.name,
      role: person.character,
      photo: tmdbImage(person.profile_path, "w185"),
    })),
    directors,
    crew: (raw.credits?.crew ?? [])
      .filter((person) => KEY_JOBS.includes(person.job))
      .slice(0, 8)
      .map((person) => ({ id: `${person.id}-${person.job}`, name: person.name, role: person.job })),
    genres: (raw.genres ?? []).map((item) => item.name),
    keywords: (raw.keywords?.keywords ?? raw.keywords?.results ?? []).slice(0, 14).map((keyword) => keyword.name),
    certification: pickCertification(raw, region),
    releaseDate: raw.release_date ?? raw.first_air_date ?? null,
    runtime: runtime ? formatRuntime(runtime) : null,
    language: languageName(raw.original_language),
    countries: [...new Set(countries)].map(countryName),
    collection: raw.belongs_to_collection
      ? { name: raw.belongs_to_collection.name, poster: tmdbImage(raw.belongs_to_collection.poster_path, "w185") }
      : null,
    seasons: raw.number_of_seasons ?? null,
    // "También te puede gustar": recomendaciones y similares intercaladas, sin repetir.
    related: interleave([related(raw.recommendations), related(raw.similar)]).slice(0, 12),
    trailerKey: pickTrailer(raw.videos),
    watch,
  };
}

/** Cines, próximos `days` días y horarios para elegir una función. */
export function getShowtimes(from = new Date(), days = 4) {
  const dates = Array.from({ length: days }, (_, i) => {
    const date = new Date(from.getFullYear(), from.getMonth(), from.getDate() + i);
    const weekday = WEEKDAYS[date.getDay()];
    const month = MONTHS[date.getMonth()];
    return {
      iso: toISODate(date),
      weekday: weekday.slice(0, 3).toUpperCase(),
      day: String(date.getDate()),
      month: month.slice(0, 3).toUpperCase(),
      label: `${weekday} ${date.getDate()} de ${month}`,
    };
  });
  return { cinemas: CINEMAS, dates, times: SHOW_TIMES };
}
