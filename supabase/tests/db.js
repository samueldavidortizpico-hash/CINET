/* =========================================================
   Banco de pruebas de base de datos: PostgreSQL REAL en memoria (PGlite).
   Aplica TODAS las migraciones de supabase/migrations en orden y simula lo
   mínimo de Supabase: roles anon/authenticated/service_role, auth.users,
   auth.uid()/auth.jwt() leyendo los claims como hace PostgREST, y el esquema
   de Storage. Las políticas RLS y las funciones se ejecutan de verdad.
   No usa .env, credenciales ni ninguna base remota.
   ========================================================= */
import { readdir, readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";

const MIGRATIONS = new URL("../migrations/", import.meta.url);

const BOOTSTRAP = `
  create role anon nologin;
  create role authenticated nologin;
  create role service_role nologin bypassrls;
  create schema auth;
  create schema storage;
  create table auth.users (
    id uuid primary key,
    email text,
    raw_user_meta_data jsonb not null default '{}'::jsonb,
    is_anonymous boolean not null default false
  );
  create function auth.jwt() returns jsonb language sql stable as
    $$ select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb $$;
  create function auth.uid() returns uuid language sql stable as
    $$ select nullif(auth.jwt() ->> 'sub', '')::uuid $$;
  create function storage.foldername(name text) returns text[] language sql immutable as
    $$ select (string_to_array(name, '/'))[1:cardinality(string_to_array(name, '/')) - 1] $$;
  create function storage.extension(name text) returns text language sql immutable as
    $$ select reverse(split_part(reverse(name), '.', 1)) $$;
  create table storage.buckets (id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
  create table storage.objects (bucket_id text not null, name text not null, primary key (bucket_id, name));
  alter table storage.objects enable row level security;
  create publication supabase_realtime;
  grant usage on schema public, auth, storage to anon, authenticated, service_role;
  grant execute on function auth.uid(), auth.jwt() to anon, authenticated, service_role;
`;

/** Base nueva con todas las migraciones aplicadas. */
export async function createDb() {
  const db = new PGlite();
  await db.exec(BOOTSTRAP);
  const files = (await readdir(MIGRATIONS)).filter((name) => name.endsWith(".sql")).sort();
  for (const file of files) {
    try {
      await db.exec(await readFile(new URL(file, MIGRATIONS), "utf8"));
    } catch (error) {
      throw new Error(`La migración ${file} falló: ${error.message}`, { cause: error });
    }
  }
  return db;
}

/** Crea usuarios en auth.users (el trigger de perfiles corre como en Supabase). */
export async function createUsers(db, users) {
  await asAdmin(db);
  for (const { id, name = "", anonymous = false } of users) {
    await db.query("insert into auth.users (id, email, raw_user_meta_data, is_anonymous) values ($1, $2, $3, $4)", [
      id,
      anonymous ? null : `${id.slice(0, 8)}@example.test`,
      JSON.stringify({ name }),
      anonymous,
    ]);
  }
}

/** Actúa como el usuario `id` con el rol authenticated (o anon sin id), igual que una petición de la API. */
export async function as(db, id = null, { anonymous = false } = {}) {
  await db.exec("reset role");
  const claims = id ? { sub: id, role: "authenticated", is_anonymous: anonymous } : { role: "anon" };
  await db.query("select set_config('request.jwt.claims', $1, false)", [JSON.stringify(claims)]);
  await db.exec(id ? "set role authenticated" : "set role anon");
}

export async function asAdmin(db) {
  await db.exec("reset role");
  await db.query("select set_config('request.jwt.claims', '', false)");
}

/** Llama a una función RPC con parámetros posicionales y devuelve la primera fila. */
export async function rpc(db, name, args = []) {
  const placeholders = args.map((_, index) => `$${index + 1}`).join(", ");
  const result = await db.query(`select * from public.${name}(${placeholders})`, args);
  return result.rows[0];
}

/** SQLSTATE del error (CN403, 42501…) o null si no falló. */
export async function errorCode(promise) {
  try {
    await promise;
    return null;
  } catch (error) {
    return error.code ?? error.message;
  }
}
