/* Perfiles y roles (PGlite): el rol lo decide la base, nunca el cliente, y cada cuenta ve solo su perfil.
   Cubre lo que sostiene a ProtectedRoute, al menú de administración y a verify_organization. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { as, asAdmin, createDb, createUsers, errorCode, rpc } from "./db.js";

const USER = "00000001-7777-4000-8000-000000000001";
const OTHER = "00000002-7777-4000-8000-000000000002";
const ADMIN = "00000003-7777-4000-8000-000000000003";
const SNEAKY = "00000004-7777-4000-8000-000000000004";

const db = await createDb();
await createUsers(db, [{ id: USER, name: "Ana" }, { id: OTHER, name: "Beto" }, { id: ADMIN, name: "Operadora" }]);
await asAdmin(db);
await db.query("update public.profiles set role = 'admin' where id = $1", [ADMIN]);
// Una cuenta que intenta registrarse con role=admin en sus metadatos (raw_user_meta_data lo controla el propio usuario).
await db.query("insert into auth.users (id, email, raw_user_meta_data) values ($1, 'sneaky@example.test', $2)", [SNEAKY, JSON.stringify({ name: "Sneaky", role: "admin", is_admin: true })]);

const role = async (id) => {
  await asAdmin(db);
  return (await db.query("select role from public.profiles where id = $1", [id])).rows[0]?.role;
};

test("registrarse con role=admin en los metadatos no da el rol: el perfil nace como user", async () => {
  assert.equal(await role(SNEAKY), "user");
  assert.equal(await role(USER), "user");
});

test("nadie se cambia el rol desde la API (ni a sí mismo ni a otro)", async () => {
  await as(db, USER);
  assert.equal(await errorCode(db.query("update public.profiles set role = 'admin' where id = $1", [USER])), "42501");
  assert.equal(await errorCode(db.query("update public.profiles set role = 'moderator'")), "42501");
  assert.equal(await errorCode(db.query("update public.profiles set id = $1 where id = $2", [OTHER, USER])), "42501", "tampoco el id");
  assert.equal(await role(USER), "user");
});

test("ni siquiera mezclando una columna permitida con role", async () => {
  await as(db, USER);
  assert.equal(await errorCode(db.query("update public.profiles set display_name = 'x', role = 'admin' where id = $1", [USER])), "42501");
  assert.equal(await role(USER), "user");
});

test("cada cuenta edita solo su perfil y solo los campos permitidos", async () => {
  await as(db, USER);
  const own = await db.query("update public.profiles set display_name = 'Ana M.', bio = 'hola' where id = $1", [USER]);
  assert.equal(own.affectedRows, 1);
  const foreign = await db.query("update public.profiles set display_name = 'Hackeado' where id = $1", [OTHER]);
  assert.equal(foreign.affectedRows, 0, "el perfil de otra cuenta no se toca");
  assert.equal(await role(USER), "user", "editar el perfil no cambia el rol");
  await asAdmin(db);
  assert.equal((await db.query("select display_name from public.profiles where id = $1", [OTHER])).rows[0].display_name, "Beto");
});

test("el perfil no se crea ni se borra desde la API", async () => {
  await as(db, USER);
  assert.equal(await errorCode(db.query("insert into public.profiles (id) values ($1)", ["00000009-7777-4000-8000-000000000009"])), "42501");
  assert.equal(await errorCode(db.query("delete from public.profiles where id = $1", [USER])), "42501");
});

test("is_platform_admin: solo es verdadero para el operador", async () => {
  await as(db, ADMIN);
  assert.equal((await rpc(db, "is_platform_admin", [])).is_platform_admin, true);
  await as(db, USER);
  assert.equal((await rpc(db, "is_platform_admin", [])).is_platform_admin, false);
  await as(db);
  assert.equal((await rpc(db, "is_platform_admin", [])).is_platform_admin, false);
});

test("cada cuenta lee su propio perfil, con su rol", async () => {
  await as(db, ADMIN);
  const { rows } = await db.query("select id, role from public.profiles");
  assert.deepEqual(rows.map((row) => [row.id, row.role]), [[ADMIN, "admin"]]);
});

// La app solo lee su propio perfil (authService.getProfile). Antes cualquiera, sin sesión, podía listar
// nombres, avatares, biografías y qué cuentas son admin con la clave pública.
test("nadie lee perfiles ajenos: ni otra cuenta ni alguien sin sesión (no se puede listar a los admin)", async () => {
  await as(db, USER);
  const seen = (await db.query("select id from public.profiles")).rows.map((row) => row.id);
  assert.deepEqual(seen, [USER], "una cuenta normal solo ve su fila");
  assert.deepEqual((await db.query("select id from public.profiles where role = 'admin'")).rows, [], "no puede localizar a los admin");
  await as(db);
  assert.equal(await errorCode(db.query("select id, role from public.profiles")), "42501", "sin sesión no hay lectura");
});
