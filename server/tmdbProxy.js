import { createHash } from "node:crypto";
import { isIP } from "node:net";

/* =========================================================
   tmdbProxy — proxy de SOLO LECTURA hacia TMDB.
   El token vive en el servidor (TMDB_READ_TOKEN); el navegador pide
   /api/tmdb/<ruta>?<parámetros> y nunca ve credenciales.

   - Lista blanca de rutas y de parámetros (lo que consume la app).
     Cualquier otra ruta o parámetro → 404/400: no es un proxy abierto.
   - Solo GET. Sin hosts, URLs ni credenciales aportadas por el cliente.
   - Caché HTTP por tipo de dato (s-maxage para la CDN) y errores sin secretos.
   - Límite local para desarrollo/pruebas; producción debe inyectar el
     limitador atómico compartido de Upstash Redis.
   ========================================================= */

const TMDB_URL = "https://api.themoviedb.org/3";
const MINUTE = 60;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const RATE_SCRIPT = `local a=redis.call('INCR',KEYS[1]); if a==1 then redis.call('PEXPIRE',KEYS[1],ARGV[1]); end; local b=redis.call('INCR',KEYS[2]); if b==1 then redis.call('PEXPIRE',KEYS[2],ARGV[1]); end; return {a,b,redis.call('PTTL',KEYS[1]),redis.call('PTTL',KEYS[2])}`;

function withoutAdultContent(value) {
  if (Array.isArray(value)) return value.map(withoutAdultContent).filter((item) => item !== null);
  if (!value || typeof value !== "object") return value;
  if (value.adult === true) return null;
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, withoutAdultContent(item)]));
}

/** Limitador fijo y atómico compartido por instancias mediante Upstash REST/EVAL. */
export function createUpstashRateLimiter({ url, token, fetchImpl = (...args) => fetch(...args), windowMs = 60_000, perIpMax = 600, globalMax = 12_000, now = Date.now } = {}) {
  if (!url || !token) throw new TypeError("Se requieren UPSTASH_REDIS_REST_URL y UPSTASH_REDIS_REST_TOKEN.");
  return async (ip) => {
    const bucket = Math.floor(now() / windowMs);
    const identity = createHash("sha256").update(ip || "unknown").digest("hex");
    const keys = [`cinet:tmdb:ip:${identity}:${bucket}`, `cinet:tmdb:global:${bucket}`];
    try {
      const response = await fetchImpl(url, {
        method: "POST",
        headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
        body: JSON.stringify(["EVAL", RATE_SCRIPT, "2", ...keys, String(windowMs)]),
        signal: AbortSignal.timeout(1500),
      });
      if (!response.ok) return { unavailable: true };
      const payload = await response.json();
      const [ipCount, globalCount, ipTtl, globalTtl] = payload.result ?? [];
      if (![ipCount, globalCount, ipTtl, globalTtl].every(Number.isFinite)) return { unavailable: true };
      if (ipCount > perIpMax || globalCount > globalMax) {
        return { allowed: false, retryAfter: Math.max(1, Math.ceil(Math.max(ipCount > perIpMax ? ipTtl : 0, globalCount > globalMax ? globalTtl : 0) / 1000)) };
      }
      return { allowed: true };
    } catch {
      return { unavailable: true };
    }
  };
}

/** Rutas permitidas y cuánto puede cachearlas la CDN (segundos). */
const ROUTES = [
  { pattern: /^\/(authentication|configuration)$/, ttl: HOUR },
  { pattern: /^\/discover\/(movie|tv)$/, ttl: 10 * MINUTE },
  { pattern: /^\/search\/(multi|person|movie|tv)$/, ttl: 10 * MINUTE },
  { pattern: /^\/trending\/(all|movie|tv)\/(day|week)$/, ttl: 30 * MINUTE },
  { pattern: /^\/movie\/(popular|upcoming|now_playing|top_rated)$/, ttl: 30 * MINUTE },
  { pattern: /^\/tv\/(popular|top_rated)$/, ttl: 30 * MINUTE },
  { pattern: /^\/(movie|tv)\/\d{1,9}$/, ttl: DAY },
  { pattern: /^\/(movie|tv)\/\d{1,9}\/(recommendations|similar)$/, ttl: DAY },
  // La disponibilidad cambia más que una ficha: menos tiempo en caché.
  { pattern: /^\/(movie|tv)\/\d{1,9}\/watch\/providers$/, ttl: 6 * HOUR },
  { pattern: /^\/watch\/providers\/(movie|tv)$/, ttl: DAY },
  { pattern: /^\/collection\/\d{1,9}$/, ttl: DAY },
  // Importar CSV de IMDb: id tt… → título de TMDB (solo con external_source=imdb_id).
  { pattern: /^\/find\/tt\d{7,10}$/, ttl: DAY },
];

const APPEND = new Set(["credits", "videos", "similar", "recommendations", "keywords", "release_dates", "content_ratings"]);
const SAFE_VALUE = /^[\w.,|:-]{1,120}$/; // ids, fechas, listas "28,12" o "8|119", códigos de idioma
const PARAMS = new Set([
  "language", "page", "query", "include_adult", "include_video_language", "region", "watch_region", "year",
  "primary_release_year", "first_air_date_year", "sort_by", "append_to_response", "with_genres", "without_genres",
  "with_original_language", "with_runtime.gte", "with_runtime.lte", "with_watch_providers",
  "with_watch_monetization_types", "with_status", "with_cast", "with_people", "with_companies",
  "vote_average.gte", "vote_count.gte", "vote_count.lte", "primary_release_date.gte", "primary_release_date.lte",
  "first_air_date.gte", "first_air_date.lte", "release_date.gte", "release_date.lte", "external_source",
  "certification_country", "certification", // modo familia
  "with_origin_country", // «Hecho en Colombia»
]);

const json = (status, body, headers = {}) => ({
  status,
  headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...headers },
  body: JSON.stringify(body),
});
const fail = (status, code, message, headers) => json(status, { error: { code, message } }, headers);

/** Parámetros de la petición → URLSearchParams validados, o un error 400. */
function validParams(query) {
  const out = new URLSearchParams();
  for (const [key, raw] of query) {
    if (!PARAMS.has(key)) return { error: `Parámetro no permitido: ${key.slice(0, 40)}` };
    const value = String(raw);
    if (key === "query") {
      const text = [...value].filter((char) => char >= " " && char !== "\u007f").join("").trim(); // sin caracteres de control
      if (!text || text.length > 100) return { error: "La búsqueda debe tener entre 1 y 100 caracteres." };
      out.set(key, text);
    } else if (key === "page") {
      const page = Number(value);
      if (!Number.isInteger(page) || page < 1 || page > 500) return { error: "page debe ser un entero entre 1 y 500." };
      out.set(key, String(page));
    } else if (key === "include_adult") {
      out.set(key, "false"); // nunca contenido adulto, pida lo que pida el cliente
    } else if (key === "external_source") {
      if (value !== "imdb_id") return { error: "external_source solo admite imdb_id." };
      out.set(key, value);
    } else if (key === "append_to_response") {
      const parts = value.split(",");
      if (parts.length > APPEND.size || parts.some((part) => !APPEND.has(part))) return { error: "append_to_response no permitido." };
      out.set(key, parts.join(","));
    } else if (key === "include_video_language") {
      if (!/^(es|en|null)(,(es|en|null)){0,2}$/.test(value)) return { error: "include_video_language no permitido." };
      out.set(key, value);
    } else {
      if (!SAFE_VALUE.test(value)) return { error: `Valor no permitido en ${key}.` };
      out.set(key, value);
    }
  }
  return { params: out };
}

/**
 * Crea el manejador del proxy. Independiente del hosting: recibe { method, path, query, ip } y
 * devuelve { status, headers, body }. Ver nodeHandler para Vercel y el servidor de Vite.
 */
export function createTmdbProxy({
  token,
  fetchImpl = (...args) => fetch(...args),
  timeoutMs = 8000,
  limit = { max: 600, windowMs: 60_000 },
  sharedLimiter,
  now = Date.now,
} = {}) {
  const windows = new Map(); // ip → { start, count }

  function limited(ip) {
    const time = now();
    const key = ip || "unknown";
    const current = windows.get(key);
    if (!current || time - current.start >= limit.windowMs) {
      windows.set(key, { start: time, count: 1 });
      if (windows.size > 10_000) {
        for (const [expiredKey, window] of windows) {
          if (time - window.start >= limit.windowMs) windows.delete(expiredKey);
        }
      }
      return 0;
    }
    current.count += 1;
    return current.count > limit.max ? Math.ceil((current.start + limit.windowMs - time) / 1000) : 0;
  }

  return async function handle({ method = "GET", path = "", query = new URLSearchParams(), ip = "" }) {
    if (method !== "GET") return fail(405, "method", "Solo se permite GET.", { allow: "GET" });
    const route = ROUTES.find(({ pattern }) => pattern.test(path));
    if (!route) return fail(404, "route", "Ruta no disponible.");
    const { params, error } = validParams(query);
    if (error) return fail(400, "params", error);
    if (sharedLimiter) {
      const result = await sharedLimiter(ip);
      if (result?.unavailable) return fail(503, "rate-limit-unavailable", "El catálogo no está disponible temporalmente.");
      if (!result?.allowed) return fail(429, "rate-limit", "Demasiadas consultas; intenta en unos segundos.", { "retry-after": String(result.retryAfter ?? 1) });
    } else {
      const wait = limited(ip);
      if (wait) return fail(429, "rate-limit", "Demasiadas consultas; intenta en unos segundos.", { "retry-after": String(wait) });
    }
    if (!token) return fail(503, "no-token", "El catálogo en vivo no está configurado en el servidor.");

    let response;
    try {
      response = await fetchImpl(`${TMDB_URL}${path}?${params}`, {
        headers: { accept: "application/json", authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch (cause) {
      return cause?.name === "TimeoutError"
        ? fail(504, "timeout", "TMDB tardó demasiado en responder.")
        : fail(502, "network", "No hay conexión con TMDB.");
    }
    if (response.status === 404) return fail(404, "not-found", "TMDB no encontró ese recurso.");
    if (response.status === 429) return fail(429, "rate-limit", "TMDB limitó las consultas; intenta en unos segundos.", { "retry-after": response.headers.get("retry-after") ?? "2" });
    // 401/403 de TMDB = problema del token del servidor: no se reenvía su detalle.
    if (!response.ok) return fail(502, "upstream", `TMDB respondió con error ${response.status}.`);

    let body;
    try {
      const raw = await response.text();
      const data = withoutAdultContent(JSON.parse(raw));
      if (data === null) return fail(404, "not-found", "TMDB no encontró ese recurso.");
      body = JSON.stringify(data);
    } catch {
      return fail(502, "upstream-body", "TMDB devolvió una respuesta inválida o interrumpida.");
    }
    return {
      status: 200,
      headers: {
        "content-type": "application/json; charset=utf-8",
        "cache-control": `public, max-age=60, s-maxage=${route.ttl}, stale-while-revalidate=${route.ttl}`,
      },
      body,
    };
  };
}

/** Adaptador Node (req, res) para Vercel y el servidor de Vite. Acepta /api/tmdb/<ruta> o ?path=<ruta>. */
export function nodeHandler(handle, { trustedProxyHops = 0 } = {}) {
  return async (req, res) => {
    const url = new URL(req.url ?? "/", "http://localhost");
    const fromQuery = url.searchParams.get("path");
    url.searchParams.delete("path");
    const path = fromQuery != null ? `/${fromQuery.replace(/^\/+/, "")}` : url.pathname.replace(/^\/api\/tmdb/, "") || "/";
    const forwarded = String(req.headers?.["x-forwarded-for"] ?? "").split(",").map((part) => part.trim()).filter(Boolean);
    const forwardedHop = Number.isInteger(trustedProxyHops) && trustedProxyHops > 0
      ? forwarded[Math.max(0, forwarded.length - trustedProxyHops)]
      : "";
    const hop = forwardedHop && isIP(forwardedHop) ? forwardedHop : "";
    try {
      const result = await handle({ method: req.method, path, query: url.searchParams, ip: hop || req.socket?.remoteAddress || "unknown" });
      res.statusCode = result.status;
      for (const [key, value] of Object.entries(result.headers)) res.setHeader(key, value);
      res.end(result.body);
    } catch {
      if (res.headersSent) return;
      res.statusCode = 500;
      res.setHeader("content-type", "application/json; charset=utf-8");
      res.setHeader("cache-control", "no-store");
      res.end(JSON.stringify({ error: { code: "internal", message: "No se pudo completar la consulta." } }));
    }
  };
}
