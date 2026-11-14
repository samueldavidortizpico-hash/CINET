// Concurrencia con PostgreSQL REAL (embedded-postgres 17) y conexiones reales (pg). Uso: node concurrency.mjs [before|after]
import EmbeddedPostgres from "embedded-postgres";
import pg from "pg";
import { readdir, readFile, rm } from "node:fs/promises";
import { BOOTSTRAP } from "./bootstrap.mjs";
const MIG = "C:/Users/samue/OneDrive/Escaneos/Documentos/GIT/CINET/supabase/migrations/";
const mode = process.argv[2] ?? "after";
const FIX = "20261107120000_billing_order_and_quotas.sql";
const dir = `./pgdata-${mode}`;
await rm(dir, { recursive: true, force: true });
const server = new EmbeddedPostgres({ databaseDir: dir, user: "postgres", password: "pw", port: mode === "after" ? 54331 : 54330, persistent: false, onLog: () => {}, onError: () => {}, initdbFlags: ["--encoding=UTF8", "--locale=C"] });
await server.initialise(); await server.start(); await server.createDatabase("cinet");
const conn = () => new pg.Client({ host: "localhost", port: mode === "after" ? 54331 : 54330, user: "postgres", password: "pw", database: "cinet" });
const admin = conn(); await admin.connect();
await admin.query(BOOTSTRAP);
for (const f of (await readdir(MIG)).filter((n) => n.endsWith(".sql")).sort()) {
  if (mode === "before" && f >= "20261107") continue; // estado auditado: sin ninguna migración de esta corrección
  await admin.query(await readFile(MIG + f, "utf8"));
}
const id = (n) => `${String(n).padStart(8, "0")}-9999-4000-8000-${String(n).padStart(12, "0")}`;
for (let n = 1; n <= 170; n++) await admin.query("insert into auth.users (id, email) values ($1, $2)", [id(n), `u${n}@example.test`]);
const results = {};

// Una "petición de API": transacción con rol authenticated y claims, como PostgREST.
async function asUser(user, sql, args = []) {
  const c = conn(); await c.connect();
  try {
    await c.query("begin"); await c.query("set local role authenticated");
    await c.query("select set_config('request.jwt.claims', $1, true)", [JSON.stringify({ sub: user, role: "authenticated" })]);
    const r = await c.query(sql, args); await c.query("commit"); return { ok: true, rows: r.rows };
  } catch (e) { await c.query("rollback").catch(() => {}); return { ok: false, code: e.code }; } finally { await c.end(); }
}
const tally = (list) => list.reduce((a, r) => { const k = r.ok ? "ok" : r.code; a[k] = (a[k] ?? 0) + 1; return a; }, {});

// V44: cuotas con N creaciones simultáneas por el mismo dueño (límites reales: 5 salas, 20 grupos, 3 solicitudes).
const U = id(1);
let r = await Promise.all(Array.from({ length: 12 }, (_, i) => asUser(U, "select public.create_duo_room('Ana')")));
results.rooms = { attempts: 12, ...tally(r), stored: (await admin.query("select count(*)::int n from public.duo_rooms where host_id=$1", [U])).rows[0].n, limit: 5 };
r = await Promise.all(Array.from({ length: 30 }, () => asUser(U, "select public.create_group('G','Ana')")));
results.groups = { attempts: 30, ...tally(r), stored: (await admin.query("select count(*)::int n from public.groups where owner_id=$1", [U])).rows[0].n, limit: 20 };
r = await Promise.all(Array.from({ length: 10 }, (_, i) => asUser(U, "select public.request_organization($1,'cinema','https://x.example')", [`Org ${i}`])));
results.orgs = { attempts: 10, ...tally(r), stored: (await admin.query("select count(*)::int n from public.organizations where created_by=$1", [U])).rows[0].n, limit: 3 };

// V43: aceptar y revocar/borrar el MISMO grupo e invitación a la vez, 60 veces. Se cuentan abortos 40P01.
let deadlocks = 0, revokedButJoined = 0;
for (let i = 0; i < 60; i++) {
  const owner = id(100 + i); const g = (await asUser(owner, "select public.create_group('Race','Own') as id")).rows[0].id;
  const token = (await asUser(owner, "select public.create_group_invite($1, 7) as t", [g])).rows[0].t;
  const joiner = id(10 + (i % 20));
  const [a, b] = await Promise.all([
    asUser(joiner, "select public.accept_group_invite($1,'Joiner')", [token]),
    i % 2 ? asUser(owner, "select public.revoke_group_invite((select id from public.group_invites where group_id=$1))", [g])
          : asUser(owner, "select public.delete_group($1)", [g]),
  ]);
  for (const x of [a, b]) if (x.code === "40P01") deadlocks++;
  if (i % 2 && b.ok && a.ok) { // revocada y aun así entró: solo es válido si aceptó ANTES de revocar (orden serial)
    const joined = (await admin.query("select 1 from public.group_members where group_id=$1 and user_id=$2", [g, joiner])).rowCount;
    const revokedAt = (await admin.query("select revoked_at from public.group_invites where group_id=$1", [g])).rows[0]?.revoked_at;
    if (!joined && revokedAt) { /* aceptó como idempotente tras revocar: no debería ser ok */ revokedButJoined++; }
  }
}
results.groupInviteRace = { iterations: 60, deadlocks40P01: deadlocks };


// ---- Intercalaciones deterministas con barreras (dos conexiones reales, transacciones abiertas) ----
async function open(user) {
  const c = conn(); await c.connect(); await c.query("begin"); await c.query("set local role authenticated");
  await c.query("select set_config('request.jwt.claims', $1, true)", [JSON.stringify({ sub: user, role: "authenticated" })]);
  return c;
}
const settle = (p) => p.then((r) => ({ ok: true, rows: r.rows }), (e) => ({ ok: false, code: e.code }));
const pause = (ms) => new Promise((r) => setTimeout(r, ms));

// V44: A deja su sala SIN confirmar; B intenta crear la suya a la vez. Con 4 salas previas el máximo es 5.
{
  const u = id(3);
  for (let i = 0; i < 4; i++) await asUser(u, "select public.create_duo_room('Ana')");
  const a = await open(u), b = await open(u);
  await a.query("select public.create_duo_room('Ana')");                 // A: 5.ª sala, sin commit
  const pb = settle(b.query("select public.create_duo_room('Ana')"));    // B: cuenta mientras A no confirmó
  await pause(400);
  await a.query("commit");
  const rb = await pb; await b.query(rb.ok ? "commit" : "rollback");
  await a.end(); await b.end();
  results.barrierRooms = { previous: 4, limit: 5, secondCreate: rb.ok ? "ok (EXCEDE el cupo)" : rb.code, stored: (await admin.query("select count(*)::int n from public.duo_rooms where host_id=$1", [u])).rows[0].n };
}
// V43: B (revocar) toma el grupo; A (aceptar) entra; B toca la invitación. Mismo orden de locks que las funciones reales.
{
  const o = id(4), j = id(5);
  const g = (await asUser(o, "select public.create_group('Bar','Own') as id")).rows[0].id;
  const token = (await asUser(o, "select public.create_group_invite($1, 7) as t", [g])).rows[0].t;
  const inviteId = (await admin.query("select id from public.group_invites where group_id=$1", [g])).rows[0].id;
  const a = await open(j); const b = conn(); await b.connect(); await b.query("begin"); // B actúa como la función security definer (propietario)
  await b.query("select * from public.groups where id=$1 for update", [g]);              // B: grupo (primer lock de revoke_group_invite)
  const pa = settle(a.query("select public.accept_group_invite($1,'Joiner')", [token])); // A: aceptar
  await pause(500);
  const rb = await settle(b.query("update public.group_invites set revoked_at = now() where id=$1", [inviteId])); // B: invitación
  await b.query(rb.ok ? "commit" : "rollback");
  const ra = await pa; await a.query(ra.ok ? "commit" : "rollback");
  await a.end(); await b.end();
  const joined = (await admin.query("select count(*)::int n from public.group_members where group_id=$1 and user_id=$2", [g, j])).rows[0].n;
  results.barrierGroupInvite = { accept: ra.ok ? "ok" : ra.code, revoke: rb.ok ? "ok" : rb.code, joinedAfterRevoke: joined };
}

// V13: primeros eventos de facturación simultáneos para usuarios sin fila previa (2 conexiones por usuario).
if (mode === "after") {
  const svc = async (sql, args) => { const c = conn(); await c.connect(); try { await c.query("begin; set local role service_role"); const x = await c.query(sql, args); await c.query("commit"); return { ok: true, rows: x.rows }; } catch (e) { await c.query("rollback").catch(() => {}); return { ok: false, code: e.code }; } finally { await c.end(); } };
  let diverged = 0; const finals = new Set();
  for (let i = 0; i < 25; i++) {
    const u = id(20 + i);
    const ev = (eid, kind, at, end) => svc("select public.apply_billing_event('p',$1,$2,$3,$4,$5,null)", [`${u}:${eid}`, kind, u, at, end]);
    await Promise.all([ev("x-exp", "expired", "2030-02-01T00:00:00Z", null), ev("x-act", "activated", "2030-01-01T00:00:00Z", "2030-01-20T00:00:00Z"), ev("x-ren", "renewed", "2030-01-10T00:00:00Z", "2030-03-01T00:00:00Z")]);
    const s = (await admin.query("select status, to_char(current_period_end at time zone 'UTC','YYYY-MM-DD') e from public.entitlements where user_id=$1", [u])).rows[0];
    finals.add(JSON.stringify(s));
  }
  results.billingConcurrentFirstEvents = { users: 25, distinctFinalStates: [...finals] };
}
console.log(JSON.stringify({ mode, postgres: (await admin.query("show server_version")).rows[0].server_version, ...results }, null, 2));
await admin.end(); await server.stop(); await rm(dir, { recursive: true, force: true });
