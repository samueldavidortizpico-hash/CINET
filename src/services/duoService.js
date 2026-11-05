/* =========================================================
   duoService — de dónde salen los candidatos de Duo y los votos.
   El algoritmo (filtros, puntuación, dado, maratón) vive en recommender.js.

   Con TMDB: /discover del tipo elegido (nunca se mezclan) con los filtros
   obligatorios ya aplicados en el servidor (géneros, rechazados, duración,
   estado, plataformas), de varias fuentes para tener variedad: populares,
   estrenos del último año, joyas poco vistas, internacionales y con sus actores.
   Cada candidato lleva qué comprobó discover (runtimeCap, filtered.*) para que
   el motor distinga un dato comprobado de uno desconocido.
   Si menos de MIN_RESULTS cumplen todo, una segunda ronda trae MÁS PÁGINAS con
   los MISMOS límites (nunca se amplían para rellenar).
   Enriquecimiento (disponibilidad + detalle) progresivo y con presupuesto:
   primero se descartan duplicados, vistos y quitados; luego tandas de
   ENRICH_BATCH de los mejor puestos hasta tener suficientes válidos o llegar a
   ENRICH_BUDGET. Si la consulta queda obsoleta (signal), no se lanzan más tandas.
   Sin token o ante un error: el catálogo local de movieService.
   ========================================================= */

import { FORMAT_GENRES, SERIES_STATUS, VOTE_POINTS } from "../data/duo.js";
import { PLATFORMS } from "../data/platforms.js";
import { GENRES } from "../data/tmdb.js";
import { fromTmdb, getMovies, toISODate } from "./movieService.js";
import { MIN_RESULTS, rankTitles } from "./recommender.js";
import {
  discoverMovies,
  discoverTv,
  getCollectionParts,
  getTitleSummary,
  getTitleWatchProviders,
  isTmdbEnabled,
  tmdbCounts,
} from "./tmdbClient.js";

const ENRICH_BATCH = 8; // títulos por tanda (≈16 consultas; el cliente limita la concurrencia a 6)
const ENRICH_BUDGET = 40; // máximo de títulos enriquecidos por búsqueda
const ENRICH_ENOUGH = 12; // con tantos válidos ya comprobados hay tablero y finalistas
const MAX_CAST_SOURCES = 4;
const MAX_PAIR_SOURCES = 4;
const MAX_SAGAS = 3;
const INTERNATIONAL = "ko|ja|fr|es|it|de|pt|hi|da|sv";

const genreIds = (keys, type) => [...new Set(GENRES.filter((genre) => keys.includes(genre.key)).map((genre) => genre[type]).filter(Boolean))];
export const mergeTitlesById = (titles) => {
  const merged = new Map();
  for (const title of titles) {
    const current = merged.get(title.id);
    if (!current) {
      merged.set(title.id, { ...title, castMatch: [...new Set(title.castMatch ?? [])] });
      continue;
    }
    merged.set(title.id, {
      ...current,
      ...title,
      castMatch: [...new Set([...(current.castMatch ?? []), ...(title.castMatch ?? [])])],
    });
  }
  return [...merged.values()];
};
const uniqueById = mergeTitlesById;

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
    // Modo familia: lista exacta ("G|PG"); un título sin clasificación en ese país no coincide.
    certification_country: profile.family ? profile.family.country : undefined,
    certification: profile.family ? profile.family.certifications.join("|") : undefined,
    [`${date}.lte`]: toISODate(new Date()), // solo estrenados
  };
}

/**
 * Combinaciones de géneros (with_genres con ",", todos a la vez) para títulos que encajen con varias personas:
 * con imprescindibles, imprescindibles + un gusto de cada persona; con gustos distintos, un género de cada
 * pareja de personas. Primero las combinaciones con géneros que gustan a más gente del grupo.
 */
function pairSources(profile, pages = [1]) {
  const must = genreIds(profile.must, profile.type);
  const lists = profile.people.map((person) =>
    genreIds(person.genres.filter((key) => !profile.rejected.includes(key) && !profile.must.includes(key)), profile.type).filter(
      (id) => !must.includes(id)
    )
  );
  const fans = (id) => lists.filter((list) => list.includes(id)).length;
  const combos = must.length
    ? lists.flatMap((list) => list.slice(0, 2)).map((id) => [...must, id])
    : profile.shared.length
      ? []
      : lists.flatMap((first, i) =>
          lists.slice(i + 1).flatMap((second) => first.slice(0, 2).flatMap((a) => second.slice(0, 2).filter((b) => b !== a).map((b) => [a, b])))
        );
  const score = (ids) => ids.reduce((total, id) => total + fans(id), 0);
  return [...new Map(combos.sort((a, b) => score(b) - score(a)).map((ids) => [ids.join(","), ids])).keys()]
    .slice(0, MAX_PAIR_SOURCES)
    .map((genres) => ({ origin: "pair", pages, params: { sort_by: "popularity.desc", "vote_count.gte": 50, with_genres: genres } }));
}

/** Segunda ronda: más páginas y lo mejor valorado, con los mismos límites. */
function wideSources(profile) {
  return [
    { origin: "popular", pages: [4, 5, 6], params: { sort_by: "popularity.desc", "vote_count.gte": 50 } },
    { origin: "top", pages: [1, 2], params: { sort_by: "vote_average.desc", "vote_count.gte": 500 } },
    { origin: "gem", pages: [2], params: { sort_by: "vote_average.desc", "vote_count.gte": 150, "vote_count.lte": 2500 } },
    ...pairSources(profile, [2]),
  ];
}

/** Hace un año (AAAA-MM-DD): desde ahí cuenta como estreno. */
const yearAgo = () => toISODate(new Date(Date.now() - 365 * 86_400_000));

/** Fuentes de candidatos: variedad de popularidad, estrenos, origen e intérpretes. */
function sources(profile) {
  const date = profile.type === "tv" ? "first_air_date" : "primary_release_date";
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
    // Estrenos del último año: el catálogo se renueva solo con lo que TMDB publica.
    { origin: "fresh", pages: [1, 2], params: { sort_by: "popularity.desc", "vote_count.gte": 20, [`${date}.gte`]: yearAgo() } },
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

/** Disponibilidad en la región + duración exacta, temporadas, estado, saga y keywords. stats.enrichFailed cuenta fallos. */
function enrich(titles, region, stats = {}) {
  return Promise.all(
    titles.map(async (title) => {
      const failed = () => {
        stats.enrichFailed = (stats.enrichFailed ?? 0) + 1;
        return null;
      };
      const [watch, summary] = await Promise.all([
        getTitleWatchProviders(title.type, title.tmdbId, region).catch(failed),
        getTitleSummary(title.type, title.tmdbId).catch(failed),
      ]);
      const detail = summary ? fromTmdb(summary, title.type) : {};
      return {
        ...title,
        providers: watch?.providers ?? null, // null = disponibilidad desconocida (no "no está")
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
  // Lo que discover ya comprobó en el servidor: cuenta como dato comprobado mientras no llegue el detalle.
  const filtered = { providers: Boolean(base.with_watch_providers), status: Boolean(base.with_status) };
  const batches = await Promise.all(
    list.flatMap(({ origin, pages, params, castMatch }) =>
      pages.map((page) =>
        discover({ ...base, ...params }, page).then(
          ({ results }) =>
            results.map((raw) => ({ ...fromTmdb(raw, profile.type), origin, runtimeCap: base["with_runtime.lte"], filtered, castMatch })),
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

async function discoverForDuo(profile, saga, { history, removed, signal, stats }) {
  const base = discoverParams(profile);
  // Antes del detalle: con historial y quitados (no se gasta detalle en lo que el ranking final excluye).
  const rank = (list) => rankTitles(list, profile, { history, removed });
  let titles = uniqueById(await fetchSources(sources(profile), base, profile, true));
  if (rank(titles).strict < MIN_RESULTS && !signal?.aborted) {
    const wide = await fetchSources(wideSources(profile), base, profile);
    titles = uniqueById([...titles, ...wide]);
  }
  stats.discovered = titles.length;

  // Enriquecimiento progresivo: tandas de los mejor puestos hasta tener suficientes válidos comprobados.
  const done = new Map();
  while (done.size < ENRICH_BUDGET && !signal?.aborted) {
    const current = titles.map((title) => done.get(title.id) ?? title);
    const ranked = rank(current);
    const verified = ranked.items.filter((item) => done.has(item.title.id) && !item.relaxed.length).length;
    if (verified >= ENRICH_ENOUGH) break;
    const next = ranked.items.map(({ title }) => title).filter((title) => !done.has(title.id)).slice(0, Math.min(ENRICH_BATCH, ENRICH_BUDGET - done.size));
    if (!next.length) break;
    (await enrich(next, profile.region, stats)).forEach((title) => done.set(title.id, title));
  }
  stats.enriched = done.size;
  const enriched = [...done.values()];
  const rest = titles.filter((title) => !done.has(title.id));
  // Las partes de una saga no pasan por el filtro de clasificación: en modo familia no se añaden.
  const parts = saga && profile.type === "movie" && !profile.family && !signal?.aborted ? await sagaParts(enriched, titles, profile.region) : [];
  return [...enriched, ...rest, ...parts]; // las partes van al final: con ids repetidos gana su colección de TMDB
}

/**
 * → { source: "tmdb" | "local" | "family", notice?, titles, stats }. Sin token, sin red o con error: catálogo local.
 * stats (sin datos personales): { discovered, enriched, enrichFailed, requests, reused, ms } — requests/reused son
 * aproximados: el contador del cliente TMDB es global.
 * signal: AbortSignal de una búsqueda que quedó obsoleta (no se lanzan más tandas de detalle).
 */
export async function getDuoCandidates(profile, { saga = false, history, removed = [], signal } = {}) {
  const started = Date.now();
  const before = tmdbCounts();
  const stats = { discovered: 0, enriched: 0, enrichFailed: 0 };
  const finish = (result) => {
    const after = tmdbCounts();
    return { ...result, stats: { ...stats, requests: after.requests - before.requests, reused: after.reused - before.reused, ms: Date.now() - started } };
  };
  // Modo familia: solo con clasificación comprobable. Sin ella no se muestra nada (desconocida ≠ apta).
  const unverifiable = (reason) => finish({ source: "family", notice: `${reason} En modo familia no mostramos títulos cuya clasificación no podemos comprobar.`, titles: [] });
  if (profile.family && profile.type === "tv") return unverifiable("TMDB no permite filtrar series por clasificación por edad.");
  if (isTmdbEnabled()) {
    try {
      return finish({ source: "tmdb", titles: await discoverForDuo(profile, saga, { history, removed, signal, stats }) });
    } catch (error) {
      if (profile.family) return unverifiable(error.message);
      return finish({ source: "local", notice: `${error.message} Usamos el catálogo de CINET.`, titles: await getMovies() });
    }
  }
  if (profile.family) return unverifiable("El catálogo local no trae clasificación por edad.");
  return finish({ source: "local", titles: await getMovies() });
}

/* ---------- Votación ---------- */

/** Voto de una persona (su índice); repetir el mismo voto lo quita. No muta. */
export function setVote(votes, titleId, person, vote) {
  const pair = [...(votes?.[titleId] ?? [])];
  pair[person] = pair[person] === vote ? null : vote;
  return { ...votes, [titleId]: pair };
}

/** Ids que votaron "Sí" todas las personas (size = personas de la sesión). */
export const groupLiked = (votes = {}, size = 2) =>
  Object.entries(votes)
    .filter(([, list]) => Array.from({ length: size }, (_, person) => list?.[person]).every((vote) => vote === "yes"))
    .map(([id]) => id);

/** ¿Todas las personas votaron "No"? (entonces sale del historial de recomendables). */
export const groupRejected = (list = [], size = 2) => Array.from({ length: size }, (_, person) => list[person]).every((vote) => vote === "no");

/**
 * Recuento de una ronda de votación: primero los "match" (todos dijeron sí), luego por puntos
 * (sí 2, quizá 1, no 0); empate = el orden de recomendación. → [{ item, list, points, match, order }]
 */
export function tallyVotes(items, votes = {}, size = 2) {
  return items
    .map((item, order) => {
      const list = Array.from({ length: size }, (_, person) => votes[item.title.id]?.[person] ?? null);
      const points = list.reduce((total, vote) => total + (VOTE_POINTS[vote] ?? 0), 0);
      return { item, list, points, match: list.every((vote) => vote === "yes"), order };
    })
    .sort((a, b) => Number(b.match) - Number(a.match) || b.points - a.points || a.order - b.order);
}
