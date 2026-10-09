/** PostgreSQL aislado en memoria. NO usa .env, credenciales ni una base remota.
 * Uso: node scripts/check-avatar-policies.mjs <carpeta-temporal-con-pglite>
 * Ver supabase/AVATARS.md. Los helpers de Storage/Auth se simulan aquí;
 * las expresiones RLS se ejecutan en PostgreSQL real mediante PGlite.
 */
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

if (!process.argv[2]) throw new Error("Indica la carpeta temporal donde instalaste @electric-sql/pglite.");
const { PGlite } = await import(pathToFileURL(resolve(process.argv[2], "node_modules/@electric-sql/pglite/dist/index.js")).href);
const db = new PGlite();
const migration = await readFile(new URL("../supabase/migrations/20260929040000_harden_avatar_storage.sql", import.meta.url), "utf8");
const original = await readFile(new URL("../supabase/migrations/20260929030953_avatars_storage.sql", import.meta.url), "utf8");
const A = "11111111-1111-4111-8111-111111111111";
const B = "22222222-2222-4222-8222-222222222222";
let checks = 0;
async function check(label, action) {
  await action();
  checks += 1;
  console.log(`OK ${label}`);
}
async function as(role, id = "") {
  await db.exec("reset role");
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [id]);
  await db.exec(`set role ${role}`); // Los únicos roles de este script son literales.
}
const denied = (sql, params) => assert.rejects(db.query(sql, params), (error) => error.code === "42501");

try {
  await db.exec(`
    create role anon;
    create role authenticated;
    create schema auth;
    create schema storage;
    create function auth.uid() returns uuid language sql stable as
      $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    create function storage.foldername(name text) returns text[] language sql immutable as
      $$ select (string_to_array(name, '/'))[1:cardinality(string_to_array(name, '/')) - 1] $$;
    create function storage.extension(name text) returns text language sql immutable as
      $$ select reverse(split_part(reverse(name), '.', 1)) $$;
    create table storage.buckets (id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
    create table storage.objects (bucket_id text not null, name text not null, primary key(bucket_id, name));
    alter table storage.objects enable row level security;
    grant usage on schema auth, storage to anon, authenticated;
    grant select, insert, update, delete on storage.objects to anon, authenticated;
    insert into storage.buckets values ('avatars', 'avatars', true, 5242880, array['image/jpeg','image/png','image/webp']);
  `);
  await check("migración sobre bucket manual, sin políticas anteriores", () => db.exec(migration));
  await check("se puede repetir sin duplicar políticas", async () => {
    await db.exec(migration);
    const result = await db.query("select count(*)::int as count from pg_policies where schemaname='storage' and tablename='objects'");
    assert.equal(result.rows[0].count, 7);
  });
  await check("compatible con las cuatro políticas de Claude", async () => {
    const policies = await db.query("select policyname from pg_policies where schemaname='storage' and tablename='objects'");
    for (const { policyname } of policies.rows) await db.exec(`drop policy "${policyname.replaceAll('"', '""')}" on storage.objects`);
    await db.exec(original);
    await db.exec(migration);
    const result = await db.query("select count(*)::int as count from pg_policies where schemaname='storage' and tablename='objects'");
    assert.equal(result.rows[0].count, 7);
  });
  await db.query("insert into storage.objects values ('avatars', $1)", [`${B}/avatar.png`]);
  await as("authenticated", A);
  await check("A puede subir y cambiar su propio avatar", async () => {
    await db.query("insert into storage.objects values ('avatars', $1)", [`${A}/avatar.png`]);
    const changed = await db.query("update storage.objects set name=$1 where bucket_id='avatars' and name=$2 returning name", [`${A}/avatar.webp`, `${A}/avatar.png`]);
    assert.equal(changed.rows.length, 1);
  });
  await check("A solo lista su carpeta por la API autenticada", async () => {
    const result = await db.query("select name from storage.objects");
    assert.deepEqual(result.rows.map((r) => r.name), [`${A}/avatar.webp`]);
  });
  await check("A no puede subir en B ni mover un avatar a B", async () => {
    await denied("insert into storage.objects values ('avatars', $1)", [`${B}/otro.png`]);
    await denied("update storage.objects set name=$1 where name=$2", [`${B}/robado.webp`, `${A}/avatar.webp`]);
  });
  await check("A no puede editar ni borrar el objeto existente de B", async () => {
    assert.equal((await db.query("delete from storage.objects where name=$1 returning name", [`${B}/avatar.png`])).rows.length, 0);
    assert.equal((await db.query("update storage.objects set name=$1 where name=$2 returning name", [`${A}/robado.png`, `${B}/avatar.png`])).rows.length, 0);
  });
  await check("rechaza SVG, raíz del bucket y subcarpetas", async () => {
    for (const name of [`${A}/avatar.svg`, "avatar.png", `${A}/extra/avatar.png`]) {
      await denied("insert into storage.objects values ('avatars', $1)", [name]);
    }
  });
  await as("postgres");
  // Simula una policy antigua demasiado amplia: los límites siguen protegiendo avatars.
  await db.exec("create policy legacy_allow_everything on storage.objects for all to anon, authenticated using (true) with check (true)");
  await as("authenticated", A);
  await check("las guardas vencen una policy permisiva global", async () => {
    await denied("insert into storage.objects values ('avatars', $1)", [`${B}/forzado.jpg`]);
    await denied("update storage.objects set name=$1 where name=$2", [`${B}/movido.webp`, `${A}/avatar.webp`]);
    assert.equal((await db.query("delete from storage.objects where name=$1 returning name", [`${B}/avatar.png`])).rows.length, 0);
    assert.equal((await db.query("update storage.objects set name=$1 where name=$2 returning name", [`${A}/forzado.png`, `${B}/avatar.png`])).rows.length, 0);
  });
  await check("las guardas no cambian permisos de otros buckets", async () => {
    await db.exec("insert into storage.objects values ('otro', 'example.png')");
    assert.equal((await db.exec("delete from storage.objects where bucket_id='otro' returning name"))[0].rows.length, 1);
  });
  await check("A puede borrar su avatar", async () => {
    assert.equal((await db.query("delete from storage.objects where name=$1 returning name", [`${A}/avatar.webp`])).rows.length, 1);
  });
  await as("anon");
  await check("anónimo no escribe aunque exista la policy global", async () => {
    await denied("insert into storage.objects values ('avatars', $1)", [`${A}/avatar.png`]);
    assert.equal((await db.query("delete from storage.objects where bucket_id='avatars' returning name")).rows.length, 0);
    assert.equal((await db.query("update storage.objects set name=$1 where bucket_id='avatars' returning name", [`${B}/otro.png`])).rows.length, 0);
  });
  await as("postgres");
  await check("el bucket sigue público y conserva sus límites", async () => {
    const bucket = (await db.query("select * from storage.buckets where id='avatars'")).rows[0];
    assert.equal(bucket.public, true);
    assert.equal(Number(bucket.file_size_limit), 5242880);
    assert.deepEqual(bucket.allowed_mime_types, ["image/jpeg", "image/png", "image/webp"]);
  });
  await check("configuración insegura del bucket aborta sin modificarla", async () => {
    await db.exec("update storage.buckets set public=false where id='avatars'");
    await assert.rejects(db.exec(migration), /Revisa avatars/);
    await db.exec("rollback");
    assert.equal((await db.query("select public from storage.buckets where id='avatars'")).rows[0].public, false);
  });
  console.log(`${checks} comprobaciones SQL correctas. Ninguna conexión remota.`);
} finally {
  await db.close();
}
