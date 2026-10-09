/* =========================================================
   tmdbProxy — proxy de SOLO LECTURA hacia TMDB.
   El token vive en el servidor (TMDB_READ_TOKEN); el navegador pide
   /api/tmdb/<ruta>?<parámetros> y nunca ve credenciales.

   - Lista blanca de rutas y de parámetros (lo que consume la app).
     Cualquier otra ruta o parámetro → 404/400: no es un proxy abierto.
   - Solo GET. Sin hosts, URLs ni credenciales aportadas por el cliente.
   - Caché HTTP por tipo de dato (s-maxage para la CDN) y errores sin secretos.
   - Límite de peticiones por IP EN MEMORIA de cada instancia.
     ponytail: no es un límite global en serverless (cada instancia cuenta
     por su lado); para uno global hace falta un almacén compartido
     (p. ej. Upstash Redis). Ver docs/IMPLEMENTACION-CINET.md.
   ========================================================= */

const TMDB_URL = "https://api.themoviedb.org/3";
const MINUTE = 60;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

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
];

const APPEND = new Set(["credits", "videos", "similar", "recommendations", "keywords", "release_dates", "content_ratings"]);
const SAFE_VALUE = /^[\w.,|:-]{1,120}$/; // ids, fechas, listas "28,12" o "8|119", códigos de idioma
const PARAMS = new Set([
  "language", "page", "query", "include_adult", "include_video_language", "region", "watch_region", "year",
  "primary_release_year", "first_air_date_year", "sort_by", "append_to_response", "with_genres", "without_genres",
  "with_original_language", "with_runtime.gte", "with_runtime.lte", "with_watch_providers",
  "with_watch_monetization_types", "with_status", "with_cast", "with_people", "with_companies",
  "vote_average.gte", "vote_count.gte", "vote_count.lte", "primary_release_date.gte", "primary_release_date.lte",
  "first_air_date.gte", "first_air_date.lte", "release_date.gte", "release_date.lte",
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
  now = Date.now,
} = {}) {
  const windows = new Map(); // ip → { start, count }

  function limited(ip) {
    const time = now();
    const key = ip || "unknown";
    const current = windows.get(key);
    if (!current || time - current.start >= limit.windowMs) {
      windows.set(key, { start: time, count: 1 });
      if (windows.size > 10_000) windows.clear(); // ponytail: tope de memoria simple
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
    const wait = limited(ip);
    if (wait) return fail(429, "rate-limit", "Demasiadas consultas; intenta en unos segundos.", { "retry-after": String(wait) });
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

    const body = await response.text();
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
export function nodeHandler(handle) {
  return async (req, res) => {
    const url = new URL(req.url ?? "/", "http://localhost");
    const fromQuery = url.searchParams.get("path");
    url.searchParams.delete("path");
    const path = fromQuery != null ? `/${fromQuery.replace(/^\/+/, "")}` : url.pathname.replace(/^\/api\/tmdb/, "") || "/";
    const forwarded = String(req.headers?.["x-forwarded-for"] ?? "").split(",")[0].trim();
    const result = await handle({ method: req.method, path, query: url.searchParams, ip: forwarded || req.socket?.remoteAddress || "" });
    res.statusCode = result.status;
    for (const [key, value] of Object.entries(result.headers)) res.setHeader(key, value);
    res.end(result.body);
  };
}
