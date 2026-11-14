import { Buffer } from "node:buffer";
import { expect, test } from "@playwright/test";

/* JWT con dos roles de extremo a extremo: el Supabase de pruebas firma tokens HS256 cuyos claims salen de
   public.custom_access_token_hook (la migración real), y /api/v1 es server/api.js sin cambios. */
const PASSWORD = "cinet-e2e-123";
const json = { "content-type": "application/json" };

async function login(request, email) {
  const response = await request.post("/api/v1/auth/login", { headers: json, data: { email, password: PASSWORD } });
  expect(response.status()).toBe(200);
  return response.json();
}
const bearer = (token) => ({ authorization: `Bearer ${token}` });
const claims = (token) => JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString());

test("POST/GET por URL: registro, login, rol en el JWT y permisos por rol", async ({ request }) => {
  // Crear cuenta por HTTP: 202 neutro, también para un correo ya registrado.
  const created = await request.post("/api/v1/auth/register", { headers: json, data: { name: "Eva", email: "eva@cinet.test", password: "eva-segura-1" } });
  const again = await request.post("/api/v1/auth/register", { headers: json, data: { name: "Ana", email: "ana@cinet.test", password: "otra-clave-1" } });
  expect(created.status()).toBe(202);
  expect(again.status()).toBe(202);
  expect(await again.json()).toEqual(await created.json());
  // Sin confirmar el correo no hay sesión.
  const pending = await request.post("/api/v1/auth/login", { headers: json, data: { email: "eva@cinet.test", password: "eva-segura-1" } });
  expect(pending.status()).toBe(403);
  expect((await pending.json()).error.code).toBe("email_not_confirmed");

  // Métodos: GET a una ruta POST → 405 con Allow; ruta inexistente → 404 JSON.
  const wrongVerb = await request.get("/api/v1/auth/register");
  expect(wrongVerb.status()).toBe(405);
  expect(wrongVerb.headers().allow).toBe("POST, OPTIONS");
  expect((await request.get("/api/v1/no-existe")).status()).toBe(404);
  expect((await request.post("/api/v1/auth/login", { headers: { "content-type": "text/plain" }, data: "x" })).status()).toBe(415);

  // Sin token → 401.
  const noToken = await request.get("/api/v1/me");
  expect(noToken.status()).toBe(401);
  expect(noToken.headers()["www-authenticate"]).toMatch(/^Bearer/);

  // Rol user.
  const ana = await login(request, "ana@cinet.test");
  expect(ana.role).toBe("user");
  expect(claims(ana.access_token)).toMatchObject({ role: "authenticated", app_role: "user" });
  const me = await request.get("/api/v1/me", { headers: bearer(ana.access_token) });
  expect(me.status()).toBe(200);
  expect((await me.json()).role).toBe("user");
  expect((await request.get("/api/v1/plans?limit=5", { headers: bearer(ana.access_token) })).status()).toBe(200);
  expect((await request.get("/api/v1/admin/organizations", { headers: bearer(ana.access_token) })).status()).toBe(403);

  // app_role forjado en el payload: la firma ya no valida → 401.
  const [header, payload, signature] = ana.access_token.split(".");
  const forgedPayload = Buffer.from(JSON.stringify({ ...claims(ana.access_token), app_role: "admin" })).toString("base64url");
  expect(payload).not.toBe(forgedPayload);
  const forged = await request.get("/api/v1/admin/organizations", { headers: bearer(`${header}.${forgedPayload}.${signature}`) });
  expect(forged.status()).toBe(401);

  // Rol admin (profiles.role = 'admin' → app_role = 'admin' por el hook).
  const op = await login(request, "op@cinet.test");
  expect(op.role).toBe("admin");
  const orgs = await request.get("/api/v1/admin/organizations", { headers: bearer(op.access_token) });
  expect(orgs.status()).toBe(200);
  expect(Array.isArray((await orgs.json()).items)).toBe(true);
  const badStatus = await request.patch("/api/v1/admin/organizations/00000000-0000-4000-8000-000000000000", { headers: { ...json, ...bearer(op.access_token) }, data: { status: "borrar" } });
  expect(badStatus.status()).toBe(422);
  const missingOrg = await request.patch("/api/v1/admin/organizations/00000000-0000-4000-8000-000000000000", { headers: { ...json, ...bearer(op.access_token) }, data: { status: "verified" } });
  expect(missingOrg.status()).toBe(404);
});
