import { test } from "node:test";
import assert from "node:assert/strict";
import { createApi } from "./api.js";

const b64 = (value) => Buffer.from(JSON.stringify(value)).toString("base64url");
const jwt = (claims) => `${b64({ alg: "HS256" })}.${b64(claims)}.firma`;
const USER = { id: "11111111-1111-4111-8111-111111111111" };
const ADMIN = { id: "22222222-2222-4222-8222-222222222222" };
const USER_TOKEN = jwt({ sub: USER.id, role: "authenticated", app_role: "user" });
const ADMIN_TOKEN = jwt({ sub: ADMIN.id, role: "authenticated", app_role: "admin" });
// Mismo usuario que USER pero con app_role forjado: Supabase Auth rechaza la firma.
const FORGED = jwt({ sub: USER.id, role: "authenticated", app_role: "admin" });
const ORG = "33333333-3333-4333-8333-333333333333";

const reply = (status, body) => new Response(body === undefined ? null : JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

/** Supabase falso: Auth acepta solo los tokens emitidos; PostgREST responde según el token. */
function fakeSupabase({ adminInDb = true } = {}) {
  const calls = [];
  const valid = new Map([[USER_TOKEN, USER], [ADMIN_TOKEN, ADMIN]]);
  const fetchImpl = async (url, init) => {
    const { pathname, searchParams } = new URL(url);
    const token = init.headers.authorization.replace("Bearer ", "");
    const body = init.body ? JSON.parse(init.body) : null;
    calls.push({ pathname, method: init.method, token, body, redirect: init.redirect });
    if (pathname === "/auth/v1/user") return valid.has(token) ? reply(200, { id: valid.get(token).id, is_anonymous: false }) : reply(401, { code: "bad_jwt" });
    if (pathname === "/auth/v1/signup") return body.email === "ya@cinet.test" ? reply(200, { id: "x", identities: [] }) : reply(200, { id: "y", identities: [{}] });
    if (pathname === "/auth/v1/token" && searchParams.get("grant_type") === "password") {
      if (body.password !== "correcta-123") return reply(400, { error_code: "invalid_credentials" });
      return reply(200, { access_token: body.email.startsWith("op") ? ADMIN_TOKEN : USER_TOKEN, refresh_token: "r", expires_in: 3600 });
    }
    if (pathname === "/rest/v1/profiles") return reply(200, [{ id: USER.id, display_name: "Ana" }]);
    if (pathname === "/rest/v1/plans") return reply(200, searchParams.get("id") === "eq.44444444-4444-4444-8444-444444444444" ? [] : [{ id: "p1", created_at: "2026-11-01T00:00:00Z" }]);
    if (pathname === "/rest/v1/organizations") return reply(200, [{ id: ORG, status: "pending" }]);
    if (pathname === "/rest/v1/rpc/verify_organization") return adminInDb ? reply(204) : reply(400, { code: "CN403", message: "Solo un operador… (SQL interno)" });
    return reply(404, {});
  };
  return { calls, fetchImpl };
}

function setup({ limiter = async () => ({ allowed: true }), ...options } = {}) {
  const supa = fakeSupabase(options);
  const logs = [];
  const handle = createApi({ supabaseUrl: "https://x.supabase.co", supabaseKey: "pk", limiter, fetchImpl: supa.fetchImpl, log: (line) => logs.push(line), newId: () => "req-1" });
  const call = async ({ method = "GET", path, token, body, contentType = "application/json", query = "" }) => {
    const headers = { ...(token && { authorization: `Bearer ${token}` }), ...(body !== undefined && { "content-type": contentType }) };
    const result = await handle({ method, path, query: new URLSearchParams(query), headers, body: body === undefined ? null : Buffer.from(typeof body === "string" ? body : JSON.stringify(body)), ip: "203.0.113.9" });
    return { ...result, json: result.body ? JSON.parse(result.body) : null };
  };
  return { call, logs, calls: supa.calls };
}

test("API: rutas y métodos HTTP (404, 405 con Allow, OPTIONS, HEAD)", async () => {
  const { call } = setup();
  const missing = await call({ path: "/nada" });
  assert.equal(missing.status, 404);
  assert.deepEqual(Object.keys(missing.json.error).sort(), ["code", "message", "requestId"]);
  const wrongVerb = await call({ method: "GET", path: "/auth/register" });
  assert.equal(wrongVerb.status, 405);
  assert.equal(wrongVerb.headers.allow, "POST, OPTIONS");
  assert.equal((await call({ method: "DELETE", path: "/plans" })).status, 405);
  const options = await call({ method: "OPTIONS", path: "/admin/organizations/x" });
  assert.equal(options.status, 204);
  assert.equal(options.headers.allow, "PATCH, OPTIONS");
  const head = await call({ method: "HEAD", path: "/health" });
  assert.equal(head.status, 200);
  assert.equal(head.body, "");
  assert.equal(head.headers["x-request-id"], "req-1");
});

test("API: JWT con dos roles — 401 sin token o con firma inválida, 403 si el rol no alcanza", async () => {
  const { call } = setup();
  const anonymous = await call({ path: "/me" });
  assert.equal(anonymous.status, 401);
  assert.match(anonymous.headers["www-authenticate"], /^Bearer/);
  assert.equal((await call({ path: "/me", token: "no-es-un-jwt" })).status, 401);
  assert.equal((await call({ path: "/admin/organizations", token: FORGED })).status, 401, "app_role forjado no pasa la validación de Auth");
  assert.equal((await call({ path: "/admin/organizations", token: USER_TOKEN })).status, 403);
  assert.equal((await call({ method: "PATCH", path: `/admin/organizations/${ORG}`, token: USER_TOKEN, body: { status: "verified" } })).status, 403);

  const mine = await call({ path: "/me", token: USER_TOKEN });
  assert.equal(mine.status, 200);
  assert.equal(mine.json.role, "user");
  const admin = await call({ path: "/admin/organizations", token: ADMIN_TOKEN });
  assert.equal(admin.status, 200);
  assert.equal(admin.json.items.length, 1);
  assert.equal((await call({ path: "/me", token: ADMIN_TOKEN })).json.role, "admin");
});

test("API: cada consulta viaja con el JWT de quien llama (RLS), nunca con la clave del servidor", async () => {
  const { call, calls } = setup();
  await call({ path: "/plans", token: USER_TOKEN, query: "limit=5" });
  const rest = calls.filter((item) => item.pathname.startsWith("/rest/"));
  assert.ok(rest.length);
  assert.ok(rest.every((item) => item.token === USER_TOKEN));
  assert.ok(calls.every((item) => item.redirect === "error"), "Auth y PostgREST rechazan redirecciones");
});

test("API: la base tiene la última palabra — claim admin viejo pero sin rol en la base → 403 sin filtrar el SQL", async () => {
  const { call } = setup({ adminInDb: false });
  const result = await call({ method: "PATCH", path: `/admin/organizations/${ORG}`, token: ADMIN_TOKEN, body: { status: "verified" } });
  assert.equal(result.status, 403);
  assert.doesNotMatch(result.body, /SQL|Solo un operador/);
});

test("API: registro POST — 202 neutro exista o no el correo; validación, JSON y tipo de contenido", async () => {
  const { call } = setup();
  const fresh = await call({ method: "POST", path: "/auth/register", body: { name: "Ana", email: "nueva@cinet.test", password: "correcta-123" } });
  const existing = await call({ method: "POST", path: "/auth/register", body: { name: "Ana", email: "ya@cinet.test", password: "correcta-123" } });
  assert.equal(fresh.status, 202);
  assert.equal(existing.status, 202);
  assert.deepEqual(fresh.json, existing.json, "no revela si la cuenta existe");

  const invalid = await call({ method: "POST", path: "/auth/register", body: { name: "", email: "mal", password: "1" } });
  assert.equal(invalid.status, 422);
  assert.deepEqual(Object.keys(invalid.json.error.details).sort(), ["email", "name", "password"]);
  assert.equal((await call({ method: "POST", path: "/auth/register", body: "{roto" })).status, 400);
  assert.equal((await call({ method: "POST", path: "/auth/register", body: "[]" })).status, 400);
  assert.equal((await call({ method: "POST", path: "/auth/register", body: "a=1", contentType: "application/x-www-form-urlencoded" })).status, 415);
});

test("API: login — 401 con el mismo mensaje para cuenta inexistente; 200 devuelve el rol del JWT", async () => {
  const { call } = setup();
  const wrong = await call({ method: "POST", path: "/auth/login", body: { email: "ana@cinet.test", password: "mala" } });
  const ghost = await call({ method: "POST", path: "/auth/login", body: { email: "nadie@cinet.test", password: "mala" } });
  assert.equal(wrong.status, 401);
  assert.equal(wrong.json.error.message, ghost.json.error.message);
  const admin = await call({ method: "POST", path: "/auth/login", body: { email: "op@cinet.test", password: "correcta-123" } });
  assert.equal(admin.status, 200);
  assert.equal(admin.json.role, "admin");
  assert.equal(admin.json.user.id, ADMIN.id);
});

test("API: cuotas y dependencias — 429 con Retry-After, 503 sin Redis o sin configuración, 413 cuerpo grande", async () => {
  const limited = setup({ limiter: async () => ({ allowed: false, retryAfter: 42 }) });
  const blocked = await limited.call({ method: "POST", path: "/auth/login", body: { email: "a@b.co", password: "x" } });
  assert.equal(blocked.status, 429);
  assert.equal(blocked.headers["retry-after"], "42");
  assert.equal((await setup({ limiter: async () => ({ unavailable: true }) }).call({ path: "/health" })).status, 503);
  const unconfigured = createApi({ supabaseUrl: "", supabaseKey: "", limiter: null, log: () => {} });
  assert.equal((await unconfigured({ path: "/health" })).status, 503);
  const { call } = setup();
  const handle = createApi({ supabaseUrl: "https://x", supabaseKey: "pk", limiter: async () => ({ allowed: true }), log: () => {} });
  assert.equal((await handle({ method: "POST", path: "/auth/login", headers: {}, bodyError: { status: 413 } })).status, 413);
  assert.equal((await call({ path: "/plans", token: USER_TOKEN, query: "limit=500" })).status, 422);
  assert.equal((await call({ path: "/plans/no-uuid", token: USER_TOKEN })).status, 404);
  assert.equal((await call({ path: "/plans/44444444-4444-4444-8444-444444444444", token: USER_TOKEN })).status, 404);
});

test("API: el registro de peticiones no contiene correo, contraseña, token ni IP", async () => {
  const { call, logs } = setup();
  await call({ method: "POST", path: "/auth/login", body: { email: "op@cinet.test", password: "correcta-123" } });
  await call({ path: "/me", token: USER_TOKEN });
  assert.equal(logs.length, 2);
  for (const line of logs) {
    assert.doesNotMatch(line, /cinet\.test|correcta-123|203\.0\.113|eyJ|firma/);
    assert.deepEqual(Object.keys(JSON.parse(line)), ["api", "requestId", "method", "route", "status", "ms"]);
  }
});
