/* =========================================================
   duoService — de dónde salen los candidatos de Duo y los votos.
   El algoritmo (filtros, puntuación, dado, maratón) vive en recommender.js.

   Con TMDB: /discover del tipo elegido (nunca se mezclan) con los filtros
   obligatorios ya aplicados en el servidor (géneros, rechazados, duración,
   estado, plataformas), de varias fuentes para tener variedad: populares,
   joyas poco vistas, internacionales y con sus actores. Los mejores se
   completan con disponibilidad por región y detalle (duración exacta,
   temporadas, estado, saga, keywords). Si con eso menos de MIN_RESULTS
   cumplen todo, una segunda ronda más amplia (más páginas, imprescindibles
   "cualquiera", +NEAR_MINUTES) trae material para las alternativas.
   Sin token o ante un error: el catálogo local de movieService.
   ========================================================= */

import { FORMAT_GENRES, SERIES_STATUS } from "../data/duo.js";
import { PLATFORMS } from "../data/platforms.js";
import { GENRES } from "../data/tmdb.js";
import { fromTmdb, getMovies, toISODate } from "./movieService.js";
import { MIN_RESULTS, NEAR_MINUTES, rankTitles } from "./recommender.js";
import {
  discoverMovies,
  discoverTv,
  getCollectionParts,
  getTitleSummary,
  getTitleWatchProviders,
  isTmdbEnabled,
} from "./tmdbClient.js";

const ENRICH = 40; // candidatos que consultan disponibilidad y detalle (cubre el tablero de MIN_RESULTS)
const MAX_CAST_SOURCES = 4;
const MAX_PAIR_SOURCES = 4;
const MAX_SAGAS = 3;
const INTERNATIONAL = "ko|ja|fr|es|it|de|pt|hi|da|sv";

const genreIds = (keys, type) => [...new Set(GENRES.filter((genre) => keys.includes(genre.key)).map((genre) => genre[type]).filter(Boolean))];
const uniqueById = (titles) => [...new Map(titles.map((title) => [title.id, title])).values()];

/** Filtros obligatorios que TMDB puede aplicar en el servidor. */
function discoverParams(profile) {
  const { type, relax } = profile;
  const providerIds = relax.platforms ? [] : PLATFORMS.filter((platform) => profile.providers.includes(platform.id)).flatMap((p) => p.tmdbIds);
  const must = genreIds(profile.must, type);
  const cap = profile.maxRuntime ? profile.maxRuntime + (Number(relax.runtime) || 0) : undefined;
  const date = type === "tv" ? "first_air_date" : "primary_release_date";
  return {
    watch_region: profile.region,
    with_watch_providers: providerIds.join("|") || undefined,
    with_watch_monetization_types: providerIds.length ? "flatrate|free|ads" : undefined,
    // "," = todos los imprescindibles; "|" = cualquiera de los que les gustan.
    with_genres: must.length ? must.join(",") : genreIds(profile.liked, type).join("|") || undefined,
    // Rechazados + animación/documental si nadie los eligió.
    without_genres:
      genreIds([...profile.rejected, ...FORMAT_GENRES.filter((key) => !profile.liked.includes(key))], type).join("|") || undefined,
    "with_runtime.gte": cap ? 1 : undefined, // descarta duraciones desconocidas (0)
    "with_runtime.lte": cap,
    with_status: type === "tv" ? SERIES_STATUS[profile.seriesStatus]?.code : undefined,
    [`${date}.lte`]: toISODate(new Date()), // solo estrenados
  };
}

/**
 * Combinaciones de géneros (with_genres con ",", todos a la vez) para que haya títulos que encajen con los dos:
 * con imprescindibles, imprescindibles + un gusto de cada persona; con gustos distintos, un género de cada una.
 */
function pairSources(profile, pages = [1]) {
  const must = genreIds(profile.must, profile.type);
  const [a = [], b = []] = profile.people.map((person) =>
    genreIds(person.genres.filter((key) => !profile.rejected.includes(key) && !profile.must.includes(key)), profile.type).filter(
      (id) => !must.includes(id)
    )
  );
  const combos = must.length
    ? [...a.slice(0, 2), ...b.slice(0, 2)].map((id) => [...must, id].join(","))
    : profile.shared.length
      ? []
      : a.flatMap((first) => b.filter((second) => second !== first).map((second) => `${first},${second}`));
  return [...new Set(combos)]
    .slice(0, MAX_PAIR_SOURCES)
    .map((genres) => ({ origin: "pair", pages, params: { sort_by: "popularity.desc", "vote_count.gte": 50, with_genres: genres } }));
}

/** Segunda ronda: más páginas y lo mejor valorado, con los filtros ampliados de wideParams. */
function wideSources(profile) {
  return [
    { origin: "popular", pages: [4, 5, 6], params: { sort_by: "popularity.desc", "vote_count.gte": 50 } },
    { origin: "top", pages: [1, 2], params: { sort_by: "vote_average.desc", "vote_count.gte": 500 } },
    { origin: "gem", pages: [2], params: { sort_by: "vote_average.desc", "vote_count.gte": 150, "vote_count.lte": 2500 } },
    ...pairSources(profile, [2]),
  ];
}

/** Imprescindibles "cualquiera" en vez de "todos" y NEAR_MINUTES más: material para alternativas. */
function wideParams(profile, base) {
  const must = genreIds(profile.must, profile.type);
  const cap = base["with_runtime.lte"];
  return { ...base, with_genres: must.length > 1 ? must.join("|") : base.with_genres, "with_runtime.lte": cap && cap + NEAR_MINUTES };
}

/** Fuentes de candidatos: variedad de popularidad, origen e intérpretes. */
function sources(profile) {
  const cast =
    profile.type === "movie" // TMDB solo filtra por reparto en películas
      ? profile.actors.slice(0, MAX_CAST_SOURCES).map((actor) => ({
          origin: "cast",
          pages: [1],
          params: { sort_by: "popularity.desc", with_cast: actor.id },
          castMatch: [actor.name],
        }))
      : [];
  return [
    { origin: "popular", pages: [1, 2, 3], params: { sort_by: "popularity.desc", "vote_count.gte": 50 } },
    { origin: "gem", pages: [1], params: { sort_by: "vote_average.desc", "vote_count.gte": 150, "vote_count.lte": 2500 } },
    {
      origin: "international",
      pages: [1],
      params: { sort_by: "vote_average.desc", "vote_count.gte": 200, with_original_language: INTERNATIONAL },
    },
    ...pairSources(profile),
    ...cast,
  ];
}

/** Disponibilidad en la región + duración exacta, temporadas, estado, saga y keywords. */
function enrich(titles, region) {
  return Promise.all(
    titles.map(async (title) => {
      const [watch, summary] = await Promise.all([
        getTitleWatchProviders(title.type, title.tmdbId, region).catch(() => null),
        getTitleSummary(title.type, title.tmdbId).catch(() => null),
      ]);
      const detail = summary ? fromTmdb(summary, title.type) : {};
      return {
        ...title,
        providers: watch?.providers ?? null,
        region,
        runtime: detail.runtime ?? title.runtime,
        seasons: detail.seasons ?? title.seasons,
        episodes: detail.episodes ?? title.episodes,
        seriesStatus: detail.seriesStatus ?? title.seriesStatus,
        // La saga de TMDB manda (una película del catálogo local trae solo su "universo").
        collection: summary?.belongs_to_collection
          ? { id: summary.belongs_to_collection.id, name: summary.belongs_to_collection.name }
          : (detail.collection ?? title.collection),
        keywords: detail.keywords?.length ? detail.keywords : title.keywords,
      };
    })
  );
}

/**
 * Maratón por saga: todas las películas de las sagas que ya aparecen entre los candidatos,
 * con la colección de TMDB (también las que ya eran candidatas o están en el catálogo local).
 */
async function sagaParts(enriched, all, region) {
  const counts = new Map();
  for (const title of enriched) {
    if (typeof title.collection?.id === "number") counts.set(title.collection.id, (counts.get(title.collection.id) ?? 0) + 1);
  }
  const ids = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, MAX_SAGAS).map(([id]) => id);
  const known = new Map([...all, ...enriched].map((title) => [title.id, title])); // la versión enriquecida gana
  const sagas = await Promise.all(ids.map((id) => getCollectionParts(id).then((saga) => ({ id, ...saga }), () => null)));
  const parts = sagas.filter(Boolean).flatMap(({ id, name, parts: list }) =>
    list.map((raw) => {
      const title = fromTmdb(raw, "movie");
      return { ...(known.get(title.id) ?? title), collection: { id, name } };
    })
  );
  const fresh = uniqueById(parts.filter((title) => !known.has(title.id)));
  return [...parts.filter((title) => known.has(title.id)), ...(await enrich(fresh, region))];
}

async function fetchSources(list, base, profile, required = false) {
  const discover = profile.type === "tv" ? discoverTv : discoverMovies;
  const batches = await Promise.all(
    list.flatMap(({ origin, pages, params, castMatch }) =>
      pages.map((page) =>
        discover({ ...base, ...params }, page).then(
          ({ results }) =>
            results.map((raw) => ({ ...fromTmdb(raw, profile.type), origin, runtimeCap: base["with_runtime.lte"], castMatch })),
          // Solo la primera página de populares es obligatoria; las demás pueden fallar sin romper Duo.
          (error) => {
            if (required && origin === "popular" && page === 1) throw error;
            return [];
          }
        )
      )
    )
  );
  return batches.flat();
}

async function discoverForDuo(profile, saga) {
  const base = discoverParams(profile);
  // Sin historial ni plataformas: aún no se conocen.
  const rank = (list) => rankTitles(list, { ...profile, providers: [] }, {});
  let titles = uniqueById(await fetchSources(sources(profile), base, profile, true));
  if (rank(titles).strict < MIN_RESULTS) {
    const wide = await fetchSources(wideSources(profile), wideParams(profile, base), profile);
    titles = uniqueById([...wide, ...titles]); // con ids repetidos gana la primera ronda (su tope de duración es el pedido)
  }
  // Se enriquecen los que mejor encajan: primero los que cumplen todo.
  const { items } = rank(titles);
  const top = new Set(items.slice(0, ENRICH).map(({ title }) => title.id));
  const enriched = await enrich(titles.filter((title) => top.has(title.id)), profile.region);
  const rest = titles.filter((title) => !top.has(title.id));
  const parts = saga && profile.type === "movie" ? await sagaParts(enriched, titles, profile.region) : [];
  return [...enriched, ...rest, ...parts]; // las partes van al final: con ids repetidos gana su colección de TMDB
}

/** → { source: "tmdb" | "local", notice?, titles }. Sin token, sin red o con error: catálogo local. */
export async function getDuoCandidates(profile, { saga = false } = {}) {
  if (isTmdbEnabled()) {
    try {
      return { source: "tmdb", titles: await discoverForDuo(profile, saga) };
    } catch (error) {
      return { source: "local", notice: `${error.message} Usamos el catálogo de CINET.`, titles: await getMovies() };
    }
  }
  return { source: "local", titles: await getMovies() };
}

/* ---------- Votación ---------- */

/** Voto de una persona (0 o 1); repetir el mismo voto lo quita. No muta. */
export function setVote(votes, titleId, person, vote) {
  const pair = [...(votes?.[titleId] ?? [])];
  pair[person] = pair[person] === vote ? null : vote;
  return { ...votes, [titleId]: pair };
}

/** Ids que ambos votaron "Sí". */
export const bothLiked = (votes = {}) =>
  Object.entries(votes)
    .filter(([, pair]) => pair?.[0] === "yes" && pair?.[1] === "yes")
    .map(([id]) => id);
