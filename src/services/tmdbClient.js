/* =========================================================
   tmdbClient — único punto de acceso a la API de TMDB.
   Centraliza autenticación (token de lectura v4), timeout, reintento
   ante límite de peticiones, concurrencia, cache con TTL, errores
   normalizados, respuestas paginadas y el estado de conexión.
   Sin token, todo rechaza con code "no-token" y los servicios usan
   el catálogo local. La carga por componente la expone useAsync.

   ⚠️ Variables VITE_* = visibles en el bundle del navegador.
   Futuro backend: apuntar VITE_TMDB_API_URL a un proxy propio que
   añada el token en el servidor y dejar VITE_TMDB_READ_TOKEN vacío.
   ========================================================= */

import { readStorage, writeStorage } from "../utils/storage.js";

const DEFAULT_URL = "https://api.themoviedb.org/3";

// Vite inyecta import.meta.env; en Node (scripts, `node --env-file=.env`) se usa process.env.
const env = import.meta.env ?? globalThis.process?.env ?? {};

const config = {
  token: env.VITE_TMDB_READ_TOKEN ?? "",
  baseUrl: env.VITE_TMDB_API_URL || DEFAULT_URL,
  language: "es-MX",
  timeout: 8000,
  retryDelay: 1000,
  fetch: (...args) => fetch(...args),
};

const IMAGE_URL = "https://image.tmdb.org/t/p";
const SHORT_TTL = 5 * 60 * 1000; // búsquedas, listas, discover
const LONG_TTL = 24 * 60 * 60 * 1000; // géneros, proveedores, detalles
const MAX_IN_FLIGHT = 6;

const cache = new Map();

export class TmdbError extends Error {
  constructor(code, message, status = null) {
    super(message);
    this.name = "TmdbError";
    this.code = code; // no-token | auth | not-found | rate-limit | timeout | network | empty | http
    this.status = status;
  }
}

/* ---------- Estado de conexión (lo muestra <TmdbStatus />) ---------- */

// Errores que indican que TMDB no está disponible (no los de un recurso concreto: 404, vacío).
const CONNECTION_ERRORS = ["auth", "rate-limit", "timeout", "network", "http"];
const usingProxy = () => config.baseUrl !== DEFAULT_URL;

export const isTmdbEnabled = () => Boolean(config.token) || usingProxy();

let status = { state: isTmdbEnabled() ? "checking" : "local", code: null, message: "" };
const listeners = new Set();

function setStatus(next) {
  if (next.state === status.state && next.code === status.code) return;
  status = next;
  listeners.forEach((listener) => listener());
}

/** { state: "checking" | "connected" | "local" | "saved" | "error", code, message } */
export const getTmdbStatus = () => status;

export function subscribeTmdbStatus(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Para pruebas: token, URL o fetch falsos. Vacía la cache y recalcula el estado. */
export function configureTmdb(overrides) {
  Object.assign(config, overrides);
  cache.clear();
  status = { state: isTmdbEnabled() ? "checking" : "local", code: null, message: "" };
}

export const tmdbImage = (path, size = "w500") => (path ? `${IMAGE_URL}/${size}${path}` : "");

/* ---------- Transporte ---------- */

let inFlight = 0;
const queue = [];

/** Como máximo MAX_IN_FLIGHT peticiones a la vez; el resto espera turno. */
function limited(task) {
  return new Promise((resolve, reject) => {
    const run = () => {
      inFlight += 1;
      task()
        .then(resolve, reject)
        .finally(() => {
          inFlight -= 1;
          queue.shift()?.();
        });
    };
    if (inFlight < MAX_IN_FLIGHT) run();
    else queue.push(run);
  });
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function send(url, retries = 1) {
  let response;
  try {
    response = await config.fetch(url, {
      headers: { accept: "application/json", ...(config.token && { Authorization: `Bearer ${config.token}` }) },
      signal: AbortSignal.timeout(config.timeout),
    });
  } catch (error) {
    if (error.name === "TimeoutError") throw new TmdbError("timeout", "TMDB tardó demasiado en responder.");
    throw new TmdbError("network", "No hay conexión con TMDB.");
  }

  if (response.status === 429 && retries > 0) {
    await wait(config.retryDelay);
    return send(url, retries - 1);
  }
  if (response.status === 401) throw new TmdbError("auth", "El token de TMDB no es válido (401).", 401);
  if (response.status === 404) throw new TmdbError("not-found", "TMDB no encontró ese recurso (404).", 404);
  if (response.status === 429) throw new TmdbError("rate-limit", "Demasiadas consultas a TMDB; intenta en unos segundos.", 429);
  if (!response.ok) throw new TmdbError("http", `TMDB respondió con error ${response.status}.`, response.status);

  const data = await response.json().catch(() => null);
  if (!data || typeof data !== "object") throw new TmdbError("empty", "TMDB devolvió una respuesta vacía.");
  return data;
}

/* ---------- Cache persistente (offline) ----------
   Cada respuesta correcta se guarda en localStorage (vía utils/storage: tolera
   JSON dañado, caché inexistente y almacenamiento bloqueado → memoria).
   Si TMDB falla por red/timeout/5xx/429, tmdbRequest devuelve la copia guardada
   y el estado pasa a "saved" ("Showing saved data").
   ponytail: sin límite de entradas; si llena la cuota, writeStorage cae a memoria. */

const OFFLINE_PREFIX = "cinehub-tmdb:";

function saveOffline(key, data) {
  writeStorage(OFFLINE_PREFIX + key, { savedAt: Date.now(), data });
}

/** Datos guardados de `key`, o null si no hay o están dañados. */
function loadOffline(key) {
  const entry = readStorage(OFFLINE_PREFIX + key, null);
  return entry && typeof entry === "object" && entry.data && typeof entry.data === "object" ? entry.data : null;
}

/** GET a TMDB con cache. Los parámetros vacíos se omiten; los errores no se cachean. */
export function tmdbRequest(path, params = {}, ttl = SHORT_TTL) {
  if (!isTmdbEnabled()) return Promise.reject(new TmdbError("no-token", "Falta VITE_TMDB_READ_TOKEN."));

  const url = new URL(`${config.baseUrl}${path}`);
  for (const [key, value] of Object.entries({ language: config.language, ...params })) {
    if (value !== undefined && value !== null && value !== "") url.searchParams.set(key, value);
  }

  const key = url.href;
  const hit = cache.get(key);
  if (hit && hit.expires > Date.now()) return hit.promise;

  const promise = (async () => {
    try {
      const data = await limited(() => send(url));
      setStatus({ state: "connected", code: null, message: "" });
      saveOffline(key, data);
      return data;
    } catch (error) {
      cache.delete(key);
      if (!CONNECTION_ERRORS.includes(error.code)) throw error;
      // TMDB caído o sin red: la última respuesta buena guardada, si existe.
      const saved = error.code !== "auth" && loadOffline(key);
      if (saved) {
        setStatus({ state: "saved", code: error.code, message: error.message });
        return saved;
      }
      setStatus({ state: "error", code: error.code, message: error.message });
      throw error;
    }
  })();
  cache.set(key, { promise, expires: Date.now() + ttl });
  return promise;
}

/** Valida token y conexión una vez (/authentication). Nunca rechaza: devuelve el estado. */
export async function checkTmdbConnection() {
  if (!isTmdbEnabled()) return getTmdbStatus();
  try {
    await tmdbRequest(usingProxy() ? "/configuration" : "/authentication", {}, LONG_TTL);
  } catch {
    /* el estado ya quedó actualizado */
  }
  return getTmdbStatus();
}

/* ---------- Endpoints ---------- */

/** Respuesta paginada normalizada. TMDB no sirve más allá de la página 500. */
const toPage = (data) => ({
  results: data.results ?? [],
  page: data.page ?? 1,
  totalPages: Math.min(data.total_pages ?? 1, 500),
  totalResults: data.total_results ?? 0,
});

export const discoverMovies = (params = {}, page = 1) =>
  tmdbRequest("/discover/movie", { include_adult: false, ...params, page }).then(toPage);

export const discoverTv = (params = {}, page = 1) =>
  tmdbRequest("/discover/tv", { include_adult: false, ...params, page }).then(toPage);

/** Películas, series y personas en una sola búsqueda. */
export const searchMulti = (query, page = 1) =>
  tmdbRequest("/search/multi", { query, include_adult: false, page }).then(toPage);

/** Personas (actores, directores) para autocompletar. */
export const searchPeople = (query) =>
  tmdbRequest("/search/person", { query, include_adult: false }).then((data) =>
    (data.results ?? []).map((person) => ({
      id: person.id,
      name: person.name,
      department: person.known_for_department ?? "",
      photo: tmdbImage(person.profile_path, "w185"),
    }))
  );

/** Búsqueda de un solo tipo (admite año); se usa cuando hay filtros. */
export const searchTitles = (type, query, params = {}, page = 1) =>
  tmdbRequest(`/search/${type}`, { query, include_adult: false, ...params, page }).then(toPage);

/** Listas fijas: /trending/all/day, /movie/popular, /tv/top_rated… */
export const getTitleList = (path, params = {}, page = 1) => tmdbRequest(path, { ...params, page }).then(toPage);

const toProvider = (provider) => ({
  id: provider.provider_id,
  name: provider.provider_name,
  logo: tmdbImage(provider.logo_path, "w92"),
});

const uniqueById = (list) => list.filter((item, index) => list.findIndex((other) => other.id === item.id) === index);

/** Proveedores de streaming que TMDB conoce en una región. */
export const getWatchProviders = (type = "movie", region = "CO") =>
  tmdbRequest(`/watch/providers/${type}`, { watch_region: region }, LONG_TTL).then((data) =>
    (data.results ?? []).map(toProvider)
  );

/**
 * Dónde ver un título en una región (datos de JustWatch vía TMDB).
 * → { type, tmdbId, region, link, providers, offers: { subscription, free, rent, buy } }
 * `providers` = suscripción + gratis (lo que Duo considera "lo tienen").
 */
export async function getTitleWatchProviders(type, tmdbId, region = "CO") {
  const data = await tmdbRequest(`/${type}/${tmdbId}/watch/providers`, {}, LONG_TTL);
  const offer = data.results?.[region] ?? {};
  const offers = {
    subscription: uniqueById((offer.flatrate ?? []).map(toProvider)),
    free: uniqueById([...(offer.free ?? []), ...(offer.ads ?? [])].map(toProvider)),
    rent: uniqueById((offer.rent ?? []).map(toProvider)),
    buy: uniqueById((offer.buy ?? []).map(toProvider)),
  };
  return {
    type,
    tmdbId,
    region,
    link: offer.link ?? null,
    providers: uniqueById([...offers.subscription, ...offers.free]),
    offers,
  };
}

/** Detalle básico + keywords (duración, temporadas, estado, saga): lo que Duo necesita, sin reparto ni videos. */
export const getTitleSummary = (type, tmdbId) =>
  tmdbRequest(`/${type}/${tmdbId}`, { append_to_response: "keywords" }, LONG_TTL);

/** Saga (/collection/{id}) → { name, parts }. Las partes no traen duración: se completa con getTitleSummary. */
export const getCollectionParts = (collectionId) =>
  tmdbRequest(`/collection/${collectionId}`, {}, LONG_TTL).then((data) => ({ name: data.name, parts: data.parts ?? [] }));

/** Detalle + reparto, videos, similares, recomendaciones, keywords y certificaciones (1 petición). */
export function getTitleDetails(type, tmdbId) {
  const ratings = type === "tv" ? "content_ratings" : "release_dates";
  return tmdbRequest(
    `/${type}/${tmdbId}`,
    {
      append_to_response: `credits,videos,similar,recommendations,keywords,${ratings}`,
      include_video_language: "es,en,null",
    },
    LONG_TTL
  );
}
