/* =========================================================
   Supabase de pruebas para E2E (solo CI/local, nunca producción).
   - Base de datos: PostgreSQL real (PGlite) con TODAS las migraciones: la RLS
     y las RPC son las mismas que en Supabase.
   - Protocolo: un adaptador mínimo de PostgREST (GET de tablas con eq/order/limit
     y POST /rpc) y de Auth (contraseña, anónimo, refresco). Sin Realtime: la app
     relee al volver a la pestaña, y las pruebas lo disparan.
   Uso: node e2e/support/fake-supabase.mjs <carpeta del build, p. ej. node_modules/.cache/cinet-e2e-rooms>  (puerto 4176)
   ========================================================= */

import { randomUUID } from "node:crypto";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, resolve } from "node:path";
import { as, createDb } from "../../supabase/tests/db.js";

const PORT = Number(process.env.FAKE_SUPABASE_PORT ?? 4176);
const ROOT = resolve(process.argv[2] ?? "node_modules/.cache/cinet-e2e-rooms");
const PASSWORD = "cinet-e2e-123";
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".json": "application/json", ".jpg": "image/jpeg", ".png": "image/png", ".webp": "image/webp", ".woff2": "font/woff2" };

const db = await createDb();
const users = new Map(); // id → { id, email, name, anonymous }
const passwords = new Map(); // id → contraseña cambiada en la prueba (si no, PASSWORD)
const recoveries = new Set(); // correos que pidieron enlace de recuperación

async function addUser({ id = randomUUID(), email = null, name = "", anonymous = false }) {
  await db.exec("reset role");
  await db.query("select set_config('request.jwt.claims', '', false)");
  await db.query("insert into auth.users (id, email, raw_user_meta_data, is_anonymous) values ($1, $2, $3, $4)", [id, email, JSON.stringify({ name }), anonymous]);
  const user = { id, email, name, anonymous };
  users.set(id, user);
  return user;
}
await addUser({ email: "ana@cinet.test", name: "Ana" });
await addUser({ email: "bea@cinet.test", name: "Bea" });
await addUser({ email: "cleo@cinet.test", name: "Cleo" }); // solo auth-entry: cambia su contraseña
// Operador de CINET (verifica aliados): rol admin en profiles, como se asignaría desde el SQL Editor.
const operator = await addUser({ email: "op@cinet.test", name: "Operación" });
await db.query("update public.profiles set role = 'admin' where id = $1", [operator.id]);
// Sandbox de Plus encendido, como lo haría un operador. Sigue sin pasarela ni cobros (el estado apagado lo prueba supabase/tests/plus.test.js).
await db.query("update public.billing_config set sandbox = true");

// PGlite es una sola conexión: cada petición (rol + consulta) va en exclusiva.
let queue = Promise.resolve();
const exclusive = (task) => {
  const run = queue.then(task, task);
  queue = run.catch(() => {});
  return run;
};

const b64 = (value) => Buffer.from(JSON.stringify(value)).toString("base64url");
const authUser = (user) => ({
  id: user.id,
  aud: "authenticated",
  role: "authenticated",
  email: user.email ?? "",
  is_anonymous: user.anonymous,
  user_metadata: { name: user.name },
  app_metadata: { provider: user.anonymous ? "anonymous" : "email", providers: [] },
  identities: [],
  created_at: "2026-10-10T00:00:00.000Z",
});
function session(user) {
  const exp = Math.floor(Date.now() / 1000) + 3600;
  const claims = { sub: user.id, role: "authenticated", aud: "authenticated", exp, email: user.email ?? "", is_anonymous: user.anonymous };
  return { access_token: `${b64({ alg: "HS256", typ: "JWT" })}.${b64(claims)}.e2e`, token_type: "bearer", expires_in: 3600, expires_at: exp, refresh_token: user.id, user: authUser(user) };
}
function requester(req) {
  const token = (req.headers.authorization ?? "").replace(/^Bearer /, "");
  try {
    const claims = JSON.parse(Buffer.from(token.split(".")[1] ?? "", "base64url").toString());
    return users.get(claims.sub) ?? null;
  } catch {
    return null;
  }
}

const send = (res, status, body, headers = {}) => {
  res.writeHead(status, { "content-type": "application/json", ...headers });
  res.end(body === undefined ? "" : JSON.stringify(body));
};
const readBody = (req) => new Promise((done) => {
  let raw = "";
  req.on("data", (chunk) => (raw += chunk));
  req.on("end", () => done(raw ? JSON.parse(raw) : {}));
});
const pgError = (error) => ({ code: error.code ?? "XX000", message: error.message, details: error.detail ?? null, hint: error.hint ?? null });
const ident = (name) => {
  if (!/^[a-z_][a-z0-9_]*$/.test(name)) throw Object.assign(new Error(`Identificador no válido: ${name}`), { code: "PGRST100" });
  return name;
};

/** "a,b,rel(c,d)" → { columns: ["a","b"], embedded: [{ name: "rel", select: "c,d" }] }. */
function parseSelect(select = "*") {
  const parts = [];
  let depth = 0;
  let current = "";
  for (const char of select) {
    if (char === "(") depth++;
    if (char === ")") depth--;
    if (char === "," && depth === 0) {
      parts.push(current);
      current = "";
    } else current += char;
  }
  parts.push(current);
  const embedded = parts
    .filter((part) => part.includes("("))
    .map((part) => ({ name: ident(part.slice(0, part.indexOf("(")).trim()), select: part.slice(part.indexOf("(") + 1, part.lastIndexOf(")")) }));
  const columns = parts.filter((part) => part && !part.includes("(")).map((part) => (part.trim() === "*" ? "*" : ident(part.trim())));
  return { columns: columns.length ? columns : ["*"], embedded };
}

/** Filtros de PostgREST soportados: col=eq.valor y col=in.(a,b). */
function filters(params, values = []) {
  const where = [];
  for (const [key, raw] of params) {
    if (["select", "order", "limit", "offset", "on_conflict", "columns"].includes(key)) continue;
    const eq = /^eq\.(.*)$/s.exec(raw);
    const list = /^in\.\((.*)\)$/s.exec(raw);
    if (eq) {
      values.push(eq[1]);
      where.push(`${ident(key)}::text = $${values.length}`);
    } else if (list) {
      values.push(list[1] ? list[1].split(",").map((item) => item.replace(/^"|"$/g, "")) : []);
      where.push(`${ident(key)}::text = any($${values.length})`);
    } else throw Object.assign(new Error(`Filtro no soportado: ${key}=${raw}`), { code: "PGRST100" });
  }
  return { where, values };
}

const asValue = (value) => (value !== null && typeof value === "object" ? JSON.stringify(value) : value);

/** POST / PATCH / DELETE sobre una tabla, con la RLS de quien pide. */
async function restWrite(req, res, table, params, user) {
  const representation = (req.headers.prefer ?? "").includes("return=representation");
  const rowsOut = await exclusive(async () => {
    await as(db, user?.id ?? null, { anonymous: Boolean(user?.anonymous) });
    if (req.method === "POST") {
      const body = await readBody(req);
      const out = [];
      for (const row of Array.isArray(body) ? body : [body]) {
        const keys = Object.keys(row).map(ident);
        const result = await db.query(
          `insert into public.${ident(table)} (${keys.join(", ")}) values (${keys.map((_, index) => `$${index + 1}`).join(", ")}) returning *`,
          keys.map((key) => asValue(row[key]))
        );
        out.push(...result.rows);
      }
      return out;
    }
    const values = [];
    let set = "";
    if (req.method === "PATCH") {
      const body = await readBody(req);
      const keys = Object.keys(body).map(ident);
      keys.forEach((key) => values.push(asValue(body[key])));
      set = keys.map((key, index) => `${key} = $${index + 1}`).join(", ");
    }
    const { where } = filters(params, values);
    if (!where.length) throw Object.assign(new Error("Sin filtros no se modifica nada"), { code: "PGRST106" });
    const sql = req.method === "PATCH"
      ? `update public.${ident(table)} set ${set} where ${where.join(" and ")} returning *`
      : `delete from public.${ident(table)} where ${where.join(" and ")} returning *`;
    return (await db.query(sql, values)).rows;
  });
  if (!representation) return send(res, req.method === "POST" ? 201 : 204);
  if ((req.headers.accept ?? "").includes("vnd.pgrst.object")) {
    if (rowsOut.length !== 1) return send(res, 406, { code: "PGRST116", message: "JSON object requested, multiple (or no) rows returned", details: null, hint: null });
    return send(res, req.method === "POST" ? 201 : 200, rowsOut[0]);
  }
  send(res, req.method === "POST" ? 201 : 200, rowsOut);
}

async function restGet(req, res, table, params, user) {
  const { columns, embedded } = parseSelect(params.get("select") ?? "*");
  const { where, values } = filters(params);
  const order = params.get("order") ? params.get("order").split(",").map((item) => {
    const [column, direction = "asc"] = item.split(".");
    return `${ident(column)} ${direction === "desc" ? "desc" : "asc"}`;
  }) : [];
  const limit = params.get("limit") ? ` limit ${Number(params.get("limit"))}` : "";
  const sql = `select ${columns.join(", ")} from public.${ident(table)}${where.length ? ` where ${where.join(" and ")}` : ""}${order.length ? ` order by ${order.join(", ")}` : ""}${limit}`;
  // Embebidos uno-a-muchos por convención: plans → plan_members.plan_id (con la misma RLS de quien pide).
  const parentKey = `${table.replace(/s$/, "")}_id`;
  const data = await exclusive(async () => {
    await as(db, user?.id ?? null, { anonymous: Boolean(user?.anonymous) });
    const rows = (await db.query(sql, values)).rows;
    for (const { name, select } of embedded) {
      const childColumns = parseSelect(select).columns;
      const children = rows.length ? (await db.query(`select ${ident(parentKey)} as __parent, ${childColumns.join(", ")} from public.${name} where ${ident(parentKey)} = any($1)`, [rows.map((row) => row.id)])).rows : [];
      for (const row of rows) row[name] = children.filter((child) => child.__parent === row.id).map(({ __parent, ...child }) => child);
    }
    return rows;
  });
  if ((req.headers.accept ?? "").includes("vnd.pgrst.object")) {
    if (data.length !== 1) return send(res, 406, { code: "PGRST116", message: "JSON object requested, multiple (or no) rows returned", details: null, hint: null });
    return send(res, 200, data[0]);
  }
  send(res, 200, data);
}

async function rpc(res, name, args, user) {
  const keys = Object.keys(args).map(ident);
  const values = keys.map((key) => (args[key] !== null && typeof args[key] === "object" ? JSON.stringify(args[key]) : args[key]));
  const result = await exclusive(async () => {
    await as(db, user?.id ?? null, { anonymous: Boolean(user?.anonymous) });
    return db.query(`select * from public.${ident(name)}(${keys.map((key, index) => `${key} => $${index + 1}`).join(", ")})`, values);
  });
  const scalar = result.fields.length === 1 && result.fields[0].name === name;
  send(res, 200, scalar ? (result.rows[0]?.[name] ?? null) : result.rows);
}

async function auth(req, res, path, params) {
  if (path === "/auth/v1/token" && params.get("grant_type") === "password") {
    const { email, password } = await readBody(req);
    const user = [...users.values()].find((item) => item.email === email);
    if (!user || password !== (passwords.get(user.id) ?? PASSWORD)) return send(res, 400, { code: "invalid_credentials", error_code: "invalid_credentials", msg: "Invalid login credentials" });
    return send(res, 200, session(user));
  }
  if (path === "/auth/v1/token" && params.get("grant_type") === "refresh_token") {
    const { refresh_token: id } = await readBody(req);
    const user = users.get(id);
    return user ? send(res, 200, session(user)) : send(res, 400, { code: "refresh_token_not_found", msg: "Invalid Refresh Token" });
  }
  if (path === "/auth/v1/signup") {
    const body = await readBody(req);
    if (body.email) return send(res, 422, { code: "signup_disabled", error_code: "signup_disabled", msg: "Solo cuentas sembradas en E2E" });
    const user = await exclusive(() => addUser({ name: body.data?.name ?? "", anonymous: true }));
    return send(res, 200, session(user));
  }
  if (path === "/auth/v1/user") {
    const user = requester(req);
    if (!user) return send(res, 401, { code: "bad_jwt", msg: "invalid JWT" });
    if (req.method === "PUT") {
      const { password } = await readBody(req);
      if (password === (passwords.get(user.id) ?? PASSWORD)) return send(res, 422, { code: "same_password", msg: "New password should be different" });
      passwords.set(user.id, password);
    }
    return send(res, 200, authUser(user));
  }
  // Recuperación: responde igual exista o no la cuenta, como Supabase. El "correo" se lee en /__e2e/recovery-link.
  if (path === "/auth/v1/recover") {
    const { email } = await readBody(req);
    recoveries.add(email);
    return send(res, 200, {});
  }
  if (path === "/auth/v1/logout") return send(res, 204);
  send(res, 404, { code: "not_found", msg: path });
}

async function serveStatic(res, path) {
  const file = join(ROOT, decodeURIComponent(path));
  try {
    if (!file.startsWith(ROOT)) throw new Error("fuera de la raíz");
    const body = await readFile(file);
    res.writeHead(200, { "content-type": TYPES[extname(file)] ?? "application/octet-stream" });
    res.end(body);
  } catch {
    res.writeHead(200, { "content-type": "text/html" });
    res.end(await readFile(join(ROOT, "index.html")));
  }
}

createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  if (process.env.FAKE_SUPABASE_LOG) {
    const started = Date.now();
    res.on("finish", () => url.pathname.match(/^\/(rest|auth)\//) && console.log(`${req.method} ${url.pathname} ${res.statusCode} ${Date.now() - started}ms`));
  }
  try {
    if (url.pathname.startsWith("/api/tmdb")) return send(res, 503, { error: { code: "no-token", message: "Sin catálogo en vivo en E2E." } });
    if (url.pathname.startsWith("/auth/v1/")) return await auth(req, res, url.pathname, url.searchParams);
    // Solo E2E: el enlace que llegaría por correo (fragmento con la sesión de recuperación, flujo implícito).
    if (url.pathname === "/__e2e/recovery-link") {
      const email = url.searchParams.get("email");
      const user = [...users.values()].find((item) => item.email === email);
      if (!user || !recoveries.has(email)) return send(res, 404, { error: "Sin solicitud de recuperación" });
      const { access_token, refresh_token, expires_in, expires_at } = session(user);
      return send(res, 200, { link: `/nueva-contrasena#${new URLSearchParams({ access_token, refresh_token, expires_in, expires_at, token_type: "bearer", type: "recovery" })}` });
    }
    if (url.pathname.startsWith("/rest/v1/rpc/") && req.method === "POST") return await rpc(res, url.pathname.slice(13), await readBody(req), requester(req));
    if (url.pathname.startsWith("/rest/v1/") && req.method === "GET") return await restGet(req, res, url.pathname.slice(9), url.searchParams, requester(req));
    if (url.pathname.startsWith("/rest/v1/") && ["POST", "PATCH", "DELETE"].includes(req.method)) return await restWrite(req, res, url.pathname.slice(9), url.searchParams, requester(req));
    if (url.pathname.startsWith("/rest/v1/") || url.pathname.startsWith("/realtime/") || url.pathname.startsWith("/storage/")) return send(res, 404, { code: "PGRST000", message: "No soportado en E2E" });
    return await serveStatic(res, url.pathname === "/" ? "index.html" : url.pathname);
  } catch (error) {
    send(res, error.code === "42501" ? 403 : 400, pgError(error));
  }
}).listen(PORT, () => console.log(`Supabase de pruebas en http://localhost:${PORT} (sirve ${ROOT})`));
