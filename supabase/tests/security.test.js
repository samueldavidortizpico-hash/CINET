/* Auditoría 2026-11-13: perfiles privados, rol en el JWT e invariantes de permisos de TODO el esquema.
   Las invariantes fallan si una migración futura crea una tabla sin RLS, una función SECURITY DEFINER
   sin search_path fijo o ejecutable por PUBLIC, o concede lectura anónima a una tabla nueva. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { as, asAdmin, createDb, createUsers, errorCode } from "./db.js";

const A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const C = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";

// Catálogo público por diseño: aliados verificados, sus sedes/funciones/ofertas y la config de cobros.
const ANON_READABLE = ["billing_config", "listings", "offers", "organizations", "venues"];

test("H-01: profiles solo es legible por su dueño; anon no lee nada", async () => {
  const db = await createDb();
  try {
    await createUsers(db, [{ id: A, name: "Ana" }, { id: B, name: "Bea" }]);
    await as(db, A);
    assert.deepEqual((await db.query("select id from public.profiles")).rows.map((row) => row.id), [A]);
    assert.equal((await db.query("select id from public.profiles where id = $1", [B])).rows.length, 0);
    await as(db, null);
    assert.equal(await errorCode(db.query("select id from public.profiles")), "42501");
    await as(db, B);
    assert.equal((await db.query("select role from public.profiles where id = $1", [B])).rows[0].role, "user");
  } finally {
    await db.close();
  }
});

test("JWT: el hook pone app_role desde profiles.role y nadie de la API puede invocarlo", async () => {
  const db = await createDb();
  try {
    await createUsers(db, [{ id: A }, { id: B }, { id: C }]);
    await asAdmin(db);
    await db.query("update public.profiles set role = 'admin' where id = $1", [A]);
    await db.query("update public.profiles set role = 'moderator' where id = $1", [C]);
    const claimsFor = async (id, extra = {}) => {
      await db.exec("set role supabase_auth_admin");
      const event = { user_id: id, claims: { sub: id, role: "authenticated", aud: "authenticated", ...extra } };
      const { rows } = await db.query("select public.custom_access_token_hook($1::jsonb) as out", [JSON.stringify(event)]);
      await db.exec("reset role");
      return rows[0].out.claims;
    };
    assert.equal((await claimsFor(A)).app_role, "admin");
    assert.equal((await claimsFor(B)).app_role, "user");
    assert.equal((await claimsFor(C)).app_role, "user", "moderator no es un rol de la app");
    // Un app_role inyectado en el evento se sobrescribe: lo decide la base.
    const forged = await claimsFor(B, { app_role: "admin" });
    assert.equal(forged.app_role, "user");
    assert.equal(forged.role, "authenticated", "el rol de Postgres no cambia");
    for (const who of [B, null]) {
      await as(db, who);
      assert.equal(await errorCode(db.query("select public.custom_access_token_hook('{}'::jsonb)")), "42501");
    }
  } finally {
    await db.close();
  }
});

test("Invariantes: RLS en todas las tablas, SECURITY DEFINER blindadas y lectura anónima solo en el catálogo", async () => {
  const db = await createDb();
  try {
    const noRls = await db.query(`select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity`);
    assert.deepEqual(noRls.rows, [], "tablas sin RLS");

    const definers = await db.query(`select p.proname,
        coalesce(array_to_string(p.proconfig, ','), '') like '%search_path=%' as pinned,
        exists (select 1 from aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a where a.grantee = 0 and a.privilege_type = 'EXECUTE') as public_exec
      from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.prosecdef`);
    assert.ok(definers.rows.length > 0);
    assert.deepEqual(definers.rows.filter((row) => !row.pinned).map((row) => row.proname), [], "SECURITY DEFINER sin search_path");
    assert.deepEqual(definers.rows.filter((row) => row.public_exec).map((row) => row.proname), [], "SECURITY DEFINER ejecutable por PUBLIC");

    const anonTables = await db.query(`select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relkind in ('r', 'v', 'm') and has_table_privilege('anon', c.oid, 'select') order by 1`);
    assert.deepEqual(anonTables.rows.map((row) => row.relname), ANON_READABLE);

    const anonWrites = await db.query(`select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relkind = 'r'
        and (has_table_privilege('anon', c.oid, 'insert') or has_table_privilege('anon', c.oid, 'update') or has_table_privilege('anon', c.oid, 'delete'))`);
    assert.deepEqual(anonWrites.rows, [], "anon no escribe en ninguna tabla");
  } finally {
    await db.close();
  }
});
