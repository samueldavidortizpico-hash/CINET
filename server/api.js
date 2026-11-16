/* =========================================================
   API REST de CINET: /api/v1/* (Vercel la reescribe a /api/v1?path=…).
   - Identidad: JWT de Supabase Auth en "Authorization: Bearer <token>". Supabase Auth lo valida
     (GET /auth/v1/user: firma, caducidad y sesión cuando el token la referencia); luego se lee app_role
     ('user' | 'admin') que pone public.custom_access_token_hook. Sin claim → 'user' (mínimo privilegio).
   - Autorización en dos capas: la ruta exige rol (403) y Postgres vuelve a decidir con RLS, porque
     cada consulta viaja con el token de quien llama (nunca con service_role).
   - Contrato HTTP: 200/201/202/204 éxito; 400 JSON inválido; 401 sin token o token inválido;
     403 rol insuficiente; 404 ruta o recurso inexistente; 405 método no permitido (cabecera Allow);
     408/413 cuerpo lento o grande; 415 no es JSON; 422 validación; 429 cuota (Retry-After);
     502/503/504 dependencias. Error: { error: { code, message, requestId } }, sin SQL ni tokens.
   - Registro: una línea JSON por petición con requestId, ruta (el patrón, no la URL), estado y ms.
     Sin IP, correo, token ni cuerpo.
   ========================================================= */
import { randomUUID } from "node:crypto";
import { validateForm, validateLogin } from "../src/utils/validation.js";
import { decodeCursor, encodeCursor } from "../src/services/dataPagination.js";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ROLES = ["user", "admin"];
const UPSTREAM_TIMEOUT_MS = 5_000;
const MESSAGES = {
  bad_json: "El cuerpo debe ser JSON válido.",
  unsupported_media_type: "Envía el cuerpo como application/json.",
  unauthorized: "Inicia sesión: falta un token válido.",
  forbidden: "Tu rol no tiene permiso para esta operación.",
  not_found: "No existe.",
  method_not_allowed: "Método no permitido en esta ruta.",
  rate_limited: "Demasiadas peticiones. Espera y vuelve a intentarlo.",
  rate_limit_unavailable: "El servicio no está disponible temporalmente.",
  unconfigured: "La API no está configurada en el servidor.",
  upstream: "No pudimos completar la operación. Inténtalo más tarde.",
  timeout: "El servicio tardó demasiado en responder.",
  payload_too_large: "Cuerpo demasiado grande.",
  invalid_credentials: "Correo o contraseña incorrectos.",
  validation: "Algún dato no es válido.",
  internal: "Error interno.",
};

export class HttpError extends Error {
  constructor(status, code, message = MESSAGES[code] ?? MESSAGES.upstream, extra = {}) {
    super(message);
    Object.assign(this, { status, code, ...extra });
  }
}

/** Payload de un JWT YA validado por Supabase Auth (solo para leer claims, nunca para decidir validez). */
export function jwtClaims(token) {
  try {
    const value = JSON.parse(Buffer.from(String(token).split(".")[1] ?? "", "base64url").toString("utf8"));
    return value && typeof value === "object" && !Array.isArray(value) ? value : {};
  } catch {
    return {};
  }
}
export const appRole = (claims) => (claims?.app_role === "admin" ? "admin" : "user");

const ok = (status, body, headers = {}) => ({ status, body, headers });
const text = (value) => (typeof value === "string" ? value : "");
const invalid = (details) => new HttpError(422, "validation", MESSAGES.validation, { details });

function validationError(fields) {
  const details = Object.fromEntries(Object.entries(fields).filter(([, message]) => message));
  if (Object.keys(details).length) throw invalid(details);
}
function captcha(body) {
  const token = text(body.captchaToken).slice(0, 2048);
  return token ? { gotrue_meta_security: { captcha_token: token } } : {};
}

/* ---------- Handlers ---------- */
async function register({ body, sb }) {
  const name = text(body.name).trim();
  const email = text(body.email).trim().toLowerCase();
  const password = text(body.password);
  const errors = validateForm(name, email, password);
  if (name.length > 60) errors.name = "El nombre admite hasta 60 caracteres.";
  if (email.length > 254) errors.email = "El correo es demasiado largo.";
  if (password.length > 72) errors.password = "La contraseña admite hasta 72 caracteres.";
  validationError(errors);
  const response = await sb.auth("/signup", { method: "POST", body: { email, password, data: { name }, ...captcha(body) } });
  if (response.status === 400 || response.status === 422) {
    const payload = await response.json().catch(() => ({}));
    if (payload.error_code === "weak_password") throw invalid({ password: "La contraseña es demasiado débil." });
    if (payload.error_code === "signup_disabled") throw new HttpError(403, "signup_disabled", "El registro está cerrado ahora mismo.");
    if (payload.error_code !== "user_already_exists") throw new HttpError(422, "validation"); // p. ej. captcha_failed
  } else sb.assertOk(response);
  // Igual exista o no la cuenta (H-04): no revela qué correos están registrados.
  return ok(202, { status: "pending_confirmation", message: "Si el correo es válido, te enviamos un enlace para confirmar la cuenta." });
}

function sessionBody(payload) {
  if (!payload || typeof payload.access_token !== "string" || typeof payload.refresh_token !== "string") throw new HttpError(502, "upstream");
  const claims = jwtClaims(payload.access_token);
  return {
    access_token: payload.access_token,
    refresh_token: payload.refresh_token,
    token_type: "bearer",
    expires_in: payload.expires_in,
    role: appRole(claims),
    user: { id: claims.sub ?? payload.user?.id ?? null },
  };
}

async function login({ body, sb }) {
  const email = text(body.email).trim().toLowerCase();
  const password = text(body.password);
  validationError(validateLogin(email, password));
  const response = await sb.auth("/token?grant_type=password", { method: "POST", body: { email, password, ...captcha(body) } });
  if (response.status === 400 || response.status === 422) {
    const payload = await response.json().catch(() => ({}));
    if (payload.error_code === "email_not_confirmed") throw new HttpError(403, "email_not_confirmed", "Confirma tu correo antes de iniciar sesión.");
    throw new HttpError(401, "invalid_credentials"); // mismo mensaje exista o no la cuenta
  }
  sb.assertOk(response);
  return ok(200, sessionBody(await upstreamJson(response)));
}

async function refresh({ body, sb }) {
  const token = text(body.refresh_token);
  if (!token || token.length > 512) throw invalid({ refresh_token: "Falta refresh_token." });
  const response = await sb.auth("/token?grant_type=refresh_token", { method: "POST", body: { refresh_token: token } });
  if (response.status === 400 || response.status === 401) throw new HttpError(401, "unauthorized", "La sesión caducó. Inicia sesión de nuevo.");
  sb.assertOk(response);
  return ok(200, sessionBody(await upstreamJson(response)));
}

async function me({ caller, sb }) {
  const rows = dataRows(await sb.rest(`/profiles?select=id,username,display_name,avatar_url,bio&id=eq.${caller.id}`, { token: caller.token }));
  return ok(200, { id: caller.id, role: caller.role, guest: caller.guest, profile: rows[0] ?? null });
}

const PLAN_COLUMNS = "id,name,mode,title,starts_at,time_zone,status,owner_id,created_at";

function dataRows(value) {
  if (!Array.isArray(value) || value.some((row) => !row || typeof row !== "object" || Array.isArray(row))) throw new HttpError(502, "upstream");
  return value;
}

function pageRequest(query, { ascending = false, defaultLimit = 20 } = {}) {
  for (const name of ["limit", "before", "cursor"]) {
    if (query.getAll(name).length > 1) throw invalid({ [name]: "No repitas este parámetro." });
  }
  const limit = query.get("limit") ?? String(defaultLimit);
  if (!/^\d{1,2}$/.test(limit) || Number(limit) < 1 || Number(limit) > 50) throw invalid({ limit: "Entero entre 1 y 50." });
  const before = query.get("before");
  const cursor = query.get("cursor");
  if (before !== null && cursor !== null) throw invalid({ cursor: "Usa cursor o before, no ambos." });
  if (before !== null && (before.length > 64 || Number.isNaN(Date.parse(before)))) throw invalid({ before: "Fecha ISO 8601." });
  let filter = before ? `&created_at=lt.${encodeURIComponent(new Date(before).toISOString())}` : "";
  if (cursor !== null) {
    let last;
    try { last = decodeCursor(cursor); } catch { throw invalid({ cursor: "Cursor no válido." }); }
    const cmp = ascending ? "gt" : "lt";
    filter = `&or=${encodeURIComponent(`(created_at.${cmp}.${last.createdAt},and(created_at.eq.${last.createdAt},id.${cmp}.${last.id}))`)}`;
  }
  return { limit: Number(limit), filter };
}

function pageResponse(rows, limit) {
  dataRows(rows);
  const items = rows.slice(0, limit);
  const hasMore = rows.length > limit;
  const last = items.at(-1);
  return { items, hasMore, nextCursor: hasMore ? encodeCursor({ createdAt: last.created_at, id: last.id }) : null };
}

async function listPlans({ caller, query, sb }) {
  const { limit, filter } = pageRequest(query);
  // RLS: solo vuelven los planes de los que quien llama es miembro (ser admin no abre planes ajenos).
  const rows = await sb.rest(`/plans?select=${PLAN_COLUMNS}${filter}&order=created_at.desc,id.desc&limit=${limit + 1}`, { token: caller.token });
  const page = pageResponse(rows, limit);
  // Compatibilidad de respuesta: before queda como filtro inicial legado; continuar con nextCursor.
  return ok(200, { ...page, nextBefore: page.hasMore ? page.items.at(-1).created_at : null });
}

async function getPlan({ caller, params, sb }) {
  if (!UUID.test(params.id)) throw new HttpError(404, "not_found", "El plan no existe o no tienes acceso.");
  const rows = dataRows(await sb.rest(`/plans?select=${PLAN_COLUMNS}&id=eq.${params.id}`, { token: caller.token }));
  if (!rows.length) throw new HttpError(404, "not_found", "El plan no existe o no tienes acceso.");
  return ok(200, rows[0]);
}

async function pendingOrganizations({ caller, query, sb }) {
  const { limit, filter } = pageRequest(query, { ascending: true, defaultLimit: 50 });
  const rows = await sb.rest(`/organizations?select=id,name,kind,official_url,status,created_at&status=eq.pending${filter}&order=created_at.asc,id.asc&limit=${limit + 1}`, { token: caller.token });
  return ok(200, pageResponse(rows, limit));
}

async function setOrganizationStatus({ caller, params, body, sb }) {
  if (!UUID.test(params.id)) throw new HttpError(404, "not_found", "No encontramos la organización.");
  if (!["verified", "suspended", "pending"].includes(body.status)) throw invalid({ status: "verified, suspended o pending." });
  // La RPC vuelve a exigir is_platform_admin() en la base: un claim viejo no basta.
  await sb.rest("/rpc/verify_organization", { token: caller.token, method: "POST", body: { p_org: params.id, p_status: body.status } });
  return ok(200, { id: params.id, status: body.status });
}

/* ---------- Rutas ---------- */
// roles: null = pública. limit = peticiones por minuto e IP (las de Auth, más estrictas).
const ROUTES = [
  { method: "GET", path: "/health", roles: null, run: () => ok(200, { status: "ok" }) },
  { method: "POST", path: "/auth/register", roles: null, limit: 10, body: true, run: register },
  { method: "POST", path: "/auth/login", roles: null, limit: 10, body: true, run: login },
  { method: "POST", path: "/auth/refresh", roles: null, limit: 30, body: true, run: refresh },
  { method: "GET", path: "/me", roles: ROLES, run: me },
  { method: "GET", path: "/plans", roles: ROLES, run: listPlans },
  { method: "GET", path: "/plans/:id", roles: ROLES, run: getPlan },
  { method: "GET", path: "/admin/organizations", roles: ["admin"], run: pendingOrganizations },
  { method: "PATCH", path: "/admin/organizations/:id", roles: ["admin"], body: true, run: setOrganizationStatus },
].map((route) => ({ ...route, regex: new RegExp(`^${route.path.replace(/:(\w+)/g, "(?<$1>[^/]+)")}$`) }));


function match(method, path) {
  const candidates = ROUTES.filter((route) => route.regex.test(path));
  if (!candidates.length) throw new HttpError(404, "not_found", "Esta ruta de la API no existe.");
  const allow = [...new Set(candidates.map((route) => route.method)), "OPTIONS"].join(", ");
  if (method === "OPTIONS") return { allow };
  const route = candidates.find((item) => item.method === method || (method === "HEAD" && item.method === "GET"));
  if (!route) throw new HttpError(405, "method_not_allowed", undefined, { headers: { allow } });
  return { route, params: { ...route.regex.exec(path).groups } };
}

/* ---------- Supabase (Auth + PostgREST) con plazo ---------- */
async function upstreamJson(response) {
  try {
    return await response.json();
  } catch (error) {
    throw new HttpError(error?.name === "TimeoutError" ? 504 : 502, error?.name === "TimeoutError" ? "timeout" : "upstream");
  }
}

function supabaseClient({ url, key, fetchImpl }) {
  const call = async (path, { method = "GET", token, body } = {}) => {
    try {
      return await fetchImpl(`${url}${path}`, {
        method,
        headers: { apikey: key, authorization: `Bearer ${token ?? key}`, accept: "application/json", ...(body && { "content-type": "application/json" }) },
        body: body ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
      });
    } catch (error) {
      throw new HttpError(error?.name === "TimeoutError" ? 504 : 502, error?.name === "TimeoutError" ? "timeout" : "upstream");
    }
  };
  const assertOk = (response) => {
    if (response.status === 429) throw new HttpError(429, "rate_limited", undefined, { headers: { "retry-after": "60" } });
    if (!response.ok) throw new HttpError(502, "upstream");
  };
  return {
    assertOk,
    auth: (path, options) => call(`/auth/v1${path}`, options),
    async rest(path, options) {
      const response = await call(`/rest/v1${path}`, options);
      if (response.ok) return response.status === 204 ? [] : upstreamJson(response);
      const payload = await response.json().catch(() => ({}));
      // Códigos estables (cinet_fail, SQLSTATE) → HTTP. El mensaje SQL nunca se reenvía.
      if (payload.code === "CN403" || payload.code === "42501" || response.status === 403) throw new HttpError(403, "forbidden");
      if (payload.code === "CN404") throw new HttpError(404, "not_found");
      if (["CN422", "22P02", "23514"].includes(payload.code)) throw new HttpError(422, "validation");
      if (response.status === 401) throw new HttpError(401, "unauthorized");
      assertOk(response);
      throw new HttpError(502, "upstream");
    },
  };
}

/** Quién llama: Supabase Auth valida el token; el rol sale del claim app_role. */
async function authenticate(headers, sb) {
  const authorization = String(headers.authorization ?? "");
  const token = authorization.length <= 16_000 ? /^Bearer +([\w-]+\.[\w-]+\.[\w-]+)$/i.exec(authorization)?.[1] : null;
  if (!token) throw new HttpError(401, "unauthorized");
  const response = await sb.auth("/user", { token });
  if ([400, 401, 403, 422].includes(response.status)) throw new HttpError(401, "unauthorized");
  sb.assertOk(response);
  const user = await upstreamJson(response);
  const claims = jwtClaims(token);
  if (!user?.id || claims.sub !== user.id) throw new HttpError(401, "unauthorized");
  return { id: user.id, token, role: appRole(claims), guest: Boolean(user.is_anonymous) };
}

function parseBody(raw, headers) {
  if (!raw?.length) return {};
  if (!/^application\/json\b/i.test(String(headers["content-type"] ?? ""))) throw new HttpError(415, "unsupported_media_type");
  try {
    const value = JSON.parse(Buffer.isBuffer(raw) ? raw.toString("utf8") : raw);
    if (value && typeof value === "object" && !Array.isArray(value)) return value;
  } catch {
    // cae al 400
  }
  throw new HttpError(400, "bad_json");
}

/**
 * Manejador independiente del hosting: ({ method, path, query, headers, body, ip, bodyError }) → { status, headers, body }.
 * limiter(identity, { max }) → { allowed, retryAfter } | { unavailable } (el limitador Upstash de server/tmdbProxy.js).
 */
export function createApi({ supabaseUrl, supabaseKey, limiter, fetchImpl = (...args) => fetch(...args), log = (line) => console.info(line), newId = randomUUID }) {
  const sb = supabaseUrl && supabaseKey ? supabaseClient({ url: supabaseUrl.replace(/\/+$/, ""), key: supabaseKey, fetchImpl }) : null;

  return async function handle({ method = "GET", path = "/", query = new URLSearchParams(), headers = {}, body = null, ip = "unknown", bodyError = null }) {
    const requestId = newId();
    const startedAt = Date.now();
    let routeName = "unmatched";
    const respond = (status, payload, extra = {}) => {
      log(JSON.stringify({ api: "v1", requestId, method, route: routeName, status, ms: Date.now() - startedAt }));
      return {
        status,
        headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", "x-request-id": requestId, ...extra },
        body: payload === undefined || method === "HEAD" ? "" : JSON.stringify(payload),
      };
    };
    try {
      const found = match(method, path.replace(/\/+$/, "") || "/");
      if (found.allow) return respond(204, undefined, { allow: found.allow });
      const { route, params } = found;
      routeName = `${route.method} ${route.path}`;
      if (!sb || !limiter) throw new HttpError(503, "unconfigured");

      const quota = await limiter(`api:${route.limit ? route.path : "all"}:${ip}`, { max: route.limit ?? 120 });
      if (quota?.unavailable) throw new HttpError(503, "rate_limit_unavailable", undefined, { headers: { "retry-after": "5" } });
      if (!quota?.allowed) throw new HttpError(429, "rate_limited", undefined, { headers: { "retry-after": String(quota?.retryAfter ?? 60) } });

      const caller = route.roles ? await authenticate(headers, sb) : null;
      if (caller && !route.roles.includes(caller.role)) throw new HttpError(403, "forbidden");
      // app_role es una foto del momento de emisión. Para operar como admin se exige el rol actual,
      // también en lecturas: una democión no espera a que caduque el JWT. La RPC conserva RLS y token.
      if (route.roles?.length === 1 && route.roles[0] === "admin") {
        const currentAdmin = await sb.rest("/rpc/is_platform_admin", { token: caller.token, method: "POST", body: {} });
        if (currentAdmin !== true) throw new HttpError(403, "forbidden");
      }
      if (bodyError) throw new HttpError(bodyError.status === 413 ? 413 : bodyError.status === 408 ? 408 : 400, bodyError.status === 413 ? "payload_too_large" : bodyError.status === 408 ? "timeout" : "bad_json");
      const parsed = route.body ? parseBody(body, headers) : {};
      const result = await route.run({ caller, params, query, body: parsed, sb });
      return respond(result.status, result.body, result.headers);
    } catch (error) {
      const known = error instanceof HttpError ? error : new HttpError(500, "internal");
      const extra = { ...known.headers, ...(known.status === 401 && { "www-authenticate": 'Bearer realm="cinet"' }) };
      return respond(known.status, { error: { code: known.code, message: known.message, requestId, ...(known.details && { details: known.details }) } }, extra);
    }
  };
}

/** Adaptador Node (req, res) para Vercel y el servidor de E2E. Acepta /api/v1/<ruta> o ?path=<ruta>. */
export function apiNodeHandler(handle, { readBody, clientIp }) {
  return async (req, res) => {
    const url = new URL(req.url ?? "/", "http://localhost");
    const fromQuery = url.searchParams.get("path");
    url.searchParams.delete("path");
    const path = fromQuery != null ? `/${fromQuery.replace(/^\/+/, "")}` : url.pathname.replace(/^\/api\/v1/, "") || "/";
    let body = null;
    let bodyError = null;
    if (["POST", "PUT", "PATCH"].includes(req.method)) {
      try {
        body = await readBody(req, { limit: 16_000, timeoutMs: 5_000 });
      } catch (error) {
        bodyError = error;
      }
    }
    const result = await handle({ method: req.method, path, query: url.searchParams, headers: req.headers, body, bodyError, ip: clientIp(req) });
    res.writeHead(result.status, result.headers);
    res.end(result.body);
  };
}
