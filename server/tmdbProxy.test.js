/* Proxy de TMDB: lista blanca, validación, errores sin secretos, caché y límite. Sin red: fetch falso. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { createTmdbProxy, createUpstashRateLimiter, nodeHandler } from "./tmdbProxy.js";

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

test("Upstash eval aplica límites atómicos compartidos y falla cerrado si Redis no responde", async () => {
  let command;
  const limiter = createUpstashRateLimiter({
    url: "https://redis.example", token: "secret", perIpMax: 1, globalMax: 1, now: () => 60_000,
    fetchImpl: async (_url, options) => {
      command = JSON.parse(options.body);
      return Response.json({ result: [2, 2, 1500, 900] });
    },
  });
  assert.deepEqual(await limiter("203.0.113.7"), { allowed: false, retryAfter: 2 });
  assert.equal(command[0], "EVAL");
  assert.equal(command[2], "2");
  assert.match(command[3], /^cinet:tmdb:ip:[a-f0-9]{64}:1$/);
  const down = createUpstashRateLimiter({ url: "https://redis.example", token: "secret", fetchImpl: async () => { throw Error("offline"); } });
  assert.deepEqual(await down("203.0.113.7"), { unavailable: true });
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
