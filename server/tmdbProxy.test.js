/* Proxy de TMDB: lista blanca, validación, errores sin secretos, caché y límite. Sin red: fetch falso. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { createTmdbProxy, nodeHandler } from "./tmdbProxy.js";

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
  assert.equal((await get(proxy, "/search/multi", { query: "spider-man: un nuevo universo", include_adult: "true", page: "2" })).status, 200);
  const sent = new URL(calls.at(-1).url);
  assert.equal(sent.origin, "https://api.themoviedb.org", "el host siempre es TMDB");
  assert.equal(sent.searchParams.get("include_adult"), "false", "nunca adulto");
  assert.equal(calls.at(-1).options.headers.authorization, `Bearer ${TOKEN}`, "el token lo pone el servidor");
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
