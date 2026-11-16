/* Proxy de TMDB: lista blanca, validación, errores sin secretos, caché y límite. Sin red: fetch falso. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { clientIp, clientIpOptions, createTmdbAccess, createTmdbProxy, createUpstashRateLimiter, nodeHandler, PREVIEW_BUDGET, RATE_SCRIPT } from "./tmdbProxy.js";
import { ogFor } from "./ogMeta.js";

const TOKEN = "server-only-token-1234567890";
const calls = [];
const okFetch = (status = 200, body = { ok: true }, headers = {}) => async (url, options) => {
  calls.push({ url: String(url), options });
  return new Response(JSON.stringify(body), { status, headers });
};
const get = (proxy, path, params = {}, extra = {}) => proxy({ method: "GET", path, query: new URLSearchParams(params), ip: "1.1.1.1", ...extra });

test("solo GET, solo rutas de la lista blanca", async () => {
  const proxy = createTmdbProxy({ token: TOKEN, fetchImpl: okFetch() });
  assert.equal((await proxy({ method: "POST", path: "/movie/1", query: new URLSearchParams() })).status, 405);
  for (const path of ["/account/1", "/movie/abc", "/movie/1/../../account", "/authentication/token/new", "//evil.com/x", "/list/1", "/movie/1/rating"]) {
    assert.equal((await get(proxy, path)).status, 404, path);
  }
  for (const path of ["/discover/movie", "/search/multi", "/movie/550", "/tv/1399/watch/providers", "/collection/10", "/watch/providers/tv", "/trending/all/day"]) {
    assert.equal((await get(proxy, path, path.startsWith("/search") ? { query: "dune" } : {})).status, 200, path);
  }
});

test("parámetros validados: desconocidos, page, búsqueda, append y contenido adulto", async () => {
  calls.length = 0;
  const proxy = createTmdbProxy({ token: TOKEN, fetchImpl: okFetch() });
  assert.equal((await get(proxy, "/discover/movie", { api_key: "x" })).status, 400, "no se aceptan credenciales del cliente");
  assert.equal((await get(proxy, "/discover/movie", { page: "501" })).status, 400);
  assert.equal((await get(proxy, "/discover/movie", { with_genres: "28<script>" })).status, 400);
  assert.equal((await get(proxy, "/search/multi", { query: "x".repeat(101) })).status, 400);
  assert.equal((await get(proxy, "/movie/1", { append_to_response: "credits,account_states" })).status, 400);
  assert.equal((await get(proxy, "/find/tt0816692", { external_source: "imdb_id" })).status, 200, "importar CSV de IMDb");
  assert.equal((await get(proxy, "/find/tt0816692", { external_source: "facebook_id" })).status, 400);
  assert.equal((await get(proxy, "/find/nm0000123", { external_source: "imdb_id" })).status, 404, "solo títulos");
  assert.equal((await get(proxy, "/search/multi", { query: "spider-man: un nuevo universo", include_adult: "true", page: "2" })).status, 200);
  const sent = new URL(calls.at(-1).url);
  assert.equal(sent.origin, "https://api.themoviedb.org", "el host siempre es TMDB");
  assert.equal(sent.searchParams.get("include_adult"), "false", "nunca adulto");
  assert.equal(calls.at(-1).options.headers.authorization, `Bearer ${TOKEN}`, "el token lo pone el servidor");
});

test("la política adulta también filtra los resultados devueltos por TMDB", async () => {
  const proxy = createTmdbProxy({
    token: TOKEN,
    fetchImpl: okFetch(200, { results: [{ id: 1, adult: false }, { id: 2, adult: true }, { id: 3 }] }),
  });
  const result = await get(proxy, "/search/multi", { query: "prueba", include_adult: "true" });
  assert.deepEqual(JSON.parse(result.body).results.map((item) => item.id), [1, 3]);
});

test("Upstash EVAL: identidad primero, global de trabajo admitido, Retry-After y fallo cerrado (N06)", async () => {
  let command;
  let result;
  const limiter = createUpstashRateLimiter({
    url: "https://redis.example", token: "secret", perIpMax: 1, globalMax: 3, now: () => 60_000,
    fetchImpl: async (_url, options) => {
      command = JSON.parse(options.body);
      return Response.json({ result });
    },
  });
  result = [1, 0, 0];
  assert.deepEqual(await limiter("203.0.113.7"), { allowed: true });
  assert.equal(command[0], "EVAL");
  assert.equal(command[1], RATE_SCRIPT);
  assert.equal(command[2], "3");
  assert.match(command[3], /^cinet:tmdb:id:[a-f0-9]{64}:1$/);
  assert.deepEqual(command.slice(4), ["cinet:tmdb:global:1", "cinet:tmdb:rejected:1", "60000", "1", "3"]);
  assert.ok(!command[3].includes("203.0.113.7"), "sin IP en claro");
  result = [0, 1, 1500];
  assert.deepEqual(await limiter("203.0.113.7"), { allowed: false, reason: "identity", retryAfter: 2 });
  result = [0, 2, -1];
  assert.deepEqual(await limiter("198.51.100.1"), { allowed: false, reason: "global", retryAfter: 60 }, "sin TTL: ventana completa, nunca antes");
  for (const broken of [undefined, [1, 0], ["1", 0, 0], [7, 0, 0], { a: 1 }]) {
    result = broken;
    assert.deepEqual(await limiter("203.0.113.7"), { unavailable: true }, `respuesta corrupta ${JSON.stringify(broken)} (V18)`);
  }
  result = [1, 0, 0];
  await limiter("preview-bots", { max: 120 });
  assert.equal(command.at(-2), "120", "cupo propio de una identidad");
  const down = createUpstashRateLimiter({ url: "https://redis.example", token: "secret", fetchImpl: async () => { throw Error("offline"); } });
  assert.deepEqual(await down("203.0.113.7"), { unavailable: true });
});

test("la clave de identidad es HMAC con secreto: no se puede revertir por fuerza bruta sin él (N16)", async () => {
  const keyFor = async (token) => {
    let key;
    await createUpstashRateLimiter({ url: "https://r", token, fetchImpl: async (_u, o) => { key = JSON.parse(o.body)[3]; return Response.json({ result: [1, 0, 0] }); } })("203.0.113.7");
    return key;
  };
  assert.notEqual(await keyFor("secret-a"), await keyFor("secret-b"));
});

test("el script Lua comprueba la identidad antes que el global y solo cuenta trabajo admitido", () => {
  const order = ["GET', KEYS[1]", "GET', KEYS[2]", "INCR', KEYS[1]", "INCR', KEYS[2]"].map((part) => RATE_SCRIPT.indexOf(part));
  assert.ok(order.every((position) => position > 0));
  assert.deepEqual([...order].sort((a, b) => a - b), order, "orden: leer identidad, leer global, sumar identidad, sumar global");
  assert.match(RATE_SCRIPT, /INCR', KEYS\[3\]/, "los rechazos van a un contador aparte");
});

test("V17: sin Redis, /api/tmdb y /api/og fallan cerrados y no consultan TMDB (N07)", async () => {
  calls.length = 0;
  const access = createTmdbAccess({ TMDB_READ_TOKEN: TOKEN }, { fetchImpl: okFetch(200, { title: "Secreto" }) });
  assert.equal((await get(access, "/movie/999123")).status, 503);
  const meta = await ogFor("/movie/tmdb-movie-999123", { tmdb: access });
  assert.equal(meta.title, "CINET — Buenas historias. Mejores planes.", "vista genérica");
  assert.equal(calls.length, 0, "cero llamadas al proveedor");
});

test("V16/V17: API y Open Graph comparten la misma cuota; los bots usan su identidad y presupuesto", async () => {
  calls.length = 0;
  const seen = [];
  const redis = async (url, options) => {
    const body = JSON.parse(options.body ?? "null");
    if (body?.[0] !== "EVAL") return okFetch(200, { title: "Dune", release_date: "2021-01-01" })(url, options);
    seen.push({ max: body.at(-2), global: body[4] });
    return Response.json({ result: [1, 0, 0] });
  };
  const env = { TMDB_READ_TOKEN: TOKEN, UPSTASH_REDIS_REST_URL: "https://redis.example", UPSTASH_REDIS_REST_TOKEN: "r" };
  const instanceA = createTmdbAccess(env, { fetchImpl: redis });
  const instanceB = createTmdbAccess(env, { fetchImpl: redis });
  assert.equal((await get(instanceA, "/movie/1")).status, 200);
  assert.equal((await ogFor("/movie/tmdb-movie-1", { tmdb: instanceB })).title, "Dune (2021) · CINET");
  assert.deepEqual(seen.map((item) => item.global), [seen[0].global, seen[0].global], "un solo contador global para ambas entradas e instancias");
  assert.deepEqual(seen.map((item) => item.max), ["600", String(PREVIEW_BUDGET)]);
});

test("errores de TMDB sin filtrar el token ni su detalle", async () => {
  for (const [status, expected] of [[401, 502], [404, 404], [429, 429], [500, 502]]) {
    const proxy = createTmdbProxy({ token: TOKEN, fetchImpl: okFetch(status, { status_message: `secreto ${TOKEN}` }, { "retry-after": "7" }) });
    const result = await get(proxy, "/movie/1");
    assert.equal(result.status, expected, String(status));
    assert.ok(!result.body.includes(TOKEN) && !JSON.stringify(result.headers).includes(TOKEN), "nada del token en la respuesta");
    if (status === 429) assert.equal(result.headers["retry-after"], "7");
  }
  const timeout = createTmdbProxy({ token: TOKEN, fetchImpl: async () => { throw Object.assign(new Error("t"), { name: "TimeoutError" }); } });
  assert.equal((await get(timeout, "/movie/1")).status, 504);
  const noToken = await get(createTmdbProxy({ token: "", fetchImpl: okFetch() }), "/movie/1");
  assert.equal(noToken.status, 503);
  assert.equal(JSON.parse(noToken.body).error.code, "no-token");
});

test("caché por tipo de dato y límite por IP (por instancia)", async () => {
  let time = 0;
  const proxy = createTmdbProxy({ token: TOKEN, fetchImpl: okFetch(), limit: { max: 2, windowMs: 1000 }, now: () => time });
  assert.match((await get(proxy, "/movie/1")).headers["cache-control"], /s-maxage=86400/);
  assert.match((await get(proxy, "/movie/1/watch/providers")).headers["cache-control"], /s-maxage=21600/);
  const blocked = await get(proxy, "/movie/1");
  assert.equal(blocked.status, 429);
  assert.equal((await get(proxy, "/movie/1", {}, { ip: "2.2.2.2" })).status, 200, "otra IP no se ve afectada");
  time = 1000;
  assert.equal((await get(proxy, "/movie/1")).status, 200, "la ventana se reinicia");
  assert.equal(blocked.headers["cache-control"], "no-store", "los errores no se cachean");
});

test("superar 10.000 IP no reinicia una cuota activa", async () => {
  const proxy = createTmdbProxy({ token: TOKEN, fetchImpl: okFetch(), limit: { max: 1, windowMs: 60_000 }, now: () => 10 });
  assert.equal((await get(proxy, "/movie/1", {}, { ip: "activa" })).status, 200);
  assert.equal((await get(proxy, "/movie/1", {}, { ip: "activa" })).status, 429);
  for (let index = 0; index < 10_001; index += 1) {
    assert.equal((await get(proxy, "/movie/1", {}, { ip: `sintetica-${index}` })).status, 200);
  }
  assert.equal((await get(proxy, "/movie/1", {}, { ip: "activa" })).status, 429);
});

test("normaliza el fallo al leer el cuerpo de TMDB", async () => {
  const proxy = createTmdbProxy({
    token: TOKEN,
    fetchImpl: async () => ({ ok: true, status: 200, text: async () => { throw new Error(`body ${TOKEN}`); } }),
  });
  const result = await get(proxy, "/movie/1");
  assert.equal(result.status, 502);
  assert.equal(JSON.parse(result.body).error.code, "upstream-body");
  assert.equal(result.headers["cache-control"], "no-store");
  assert.ok(!result.body.includes(TOKEN));
});

test("el adaptador Node normaliza un rechazo inesperado antes de enviar headers", async () => {
  const handler = nodeHandler(async () => { throw new Error(`unexpected ${TOKEN}`); });
  const res = { headers: {}, setHeader(key, value) { this.headers[key] = value; }, end(body) { this.body = body; } };
  await handler({ url: "/api/tmdb/movie/1", method: "GET", headers: {} }, res);
  assert.equal(res.statusCode, 500);
  assert.equal(JSON.parse(res.body).error.code, "internal");
  assert.equal(res.headers["cache-control"], "no-store");
  assert.ok(!res.body.includes(TOKEN));
});

test("adaptador Node: ruta por /api/tmdb/... o por ?path=... (reescritura de Vercel)", async () => {
  calls.length = 0;
  const handler = nodeHandler(createTmdbProxy({ token: TOKEN, fetchImpl: okFetch() }));
  const response = () => ({ headers: {}, setHeader(key, value) { this.headers[key] = value; }, end(body) { this.body = body; } });
  const a = response();
  await handler({ url: "/api/tmdb/movie/550?language=es-MX", method: "GET", headers: {} }, a);
  const b = response();
  await handler({ url: "/api/tmdb?path=movie/550&language=es-MX", method: "GET", headers: { "x-forwarded-for": "3.3.3.3, 10.0.0.1" } }, b);
  assert.equal(a.statusCode, 200);
  assert.equal(b.statusCode, 200);
  assert.deepEqual(calls.map((call) => new URL(call.url).pathname), ["/3/movie/550", "/3/movie/550"]);
  assert.ok(!calls[1].url.includes("path="), "el parámetro de reescritura no llega a TMDB");
});

test("el adaptador ignora X-Forwarded-For salvo que se configure un proxy confiable", async () => {
  const observed = [];
  const make = (hops) => nodeHandler(async ({ ip }) => { observed.push(ip); return { status: 200, headers: {}, body: "{}" }; }, { trustedProxyHops: hops });
  const response = () => ({ setHeader() {}, end() {} });
  await make(0)({ url: "/api/tmdb/movie/1", method: "GET", headers: { "x-forwarded-for": "spoofed, 198.51.100.8" }, socket: { remoteAddress: "10.0.0.2" } }, response());
  await make(1)({ url: "/api/tmdb/movie/1", method: "GET", headers: { "x-forwarded-for": "spoofed, 198.51.100.8" }, socket: { remoteAddress: "10.0.0.2" } }, response());
  assert.deepEqual(observed, ["10.0.0.2", "198.51.100.8"]);
});

test("V20: una cabecera de IP aportada por el cliente no cambia la identidad salvo la configurada como confiable", () => {
  const req = { headers: { "x-forwarded-for": "6.6.6.6", "x-real-ip": "7.7.7.7", "x-vercel-forwarded-for": "not-an-ip" }, socket: { remoteAddress: "10.0.0.2" } };
  assert.equal(clientIp(req), "10.0.0.2", "por defecto: socket");
  assert.equal(clientIp(req, clientIpOptions({ TRUSTED_IP_HEADER: "X-Real-IP" })), "7.7.7.7");
  assert.equal(clientIp(req, clientIpOptions({ TRUSTED_IP_HEADER: "x-vercel-forwarded-for" })), "10.0.0.2", "valor que no es IP: se ignora");
  assert.equal(clientIp(req, clientIpOptions({ TRUSTED_IP_HEADER: "bad header!" })), "10.0.0.2", "nombre inválido: se ignora");
});

test("cada fallo deja un log sin secretos: Redis ausente, sin token, token rechazado, límite de TMDB, red; el éxito no registra", async () => {
  const logs = [];
  const log = (entry) => logs.push(entry);
  const redisOk = async () => new Response(JSON.stringify({ result: [1, 0, 0] }));
  const env = { TMDB_READ_TOKEN: TOKEN, UPSTASH_REDIS_REST_URL: "https://redis.example", UPSTASH_REDIS_REST_TOKEN: "redis-token-123456" };
  const withTmdb = (tmdb) => async (url, options) => (String(url).startsWith("https://redis.example") ? redisOk() : tmdb(url, options));
  const cases = [
    [{ TMDB_READ_TOKEN: TOKEN }, okFetch(), 503, { code: "rate-limit-unavailable", reason: "redis-not-configured" }],
    [{ ...env, TMDB_READ_TOKEN: "" }, withTmdb(okFetch()), 503, { code: "no-token" }],
    [env, withTmdb(okFetch(401, { status_message: "Invalid API key" })), 502, { code: "upstream", reason: "tmdb-401" }],
    [env, withTmdb(okFetch(429, {}, { "retry-after": "3" })), 429, { code: "rate-limit", reason: "tmdb-429" }],
    [env, withTmdb(async () => { throw new TypeError("fetch failed"); }), 502, { code: "network" }],
    [env, withTmdb(okFetch(200, { images: {} })), 200, null],
  ];
  for (const [caseEnv, fetchImpl, status, expected] of cases) {
    logs.length = 0;
    const result = await get(createTmdbAccess(caseEnv, { fetchImpl, log }), "/configuration");
    assert.equal(result.status, status, JSON.stringify(expected));
    assert.equal(result.body.includes("redis-not-configured"), false, "el motivo interno no sale en la respuesta");
    if (!expected) { assert.equal(logs.length, 0); continue; }
    assert.equal(logs.length, 1);
    assert.deepEqual({ ...logs[0], path: undefined }, { ...expected, status, path: undefined });
    assert.equal(JSON.stringify(logs).includes(TOKEN), false, "el token nunca va al log");
  }
});
