/* Aliados: verificación por operador, aislamiento por organización, vigencia, auditoría y ventas solo por servidor (PGlite). */
import { test } from "node:test";
import assert from "node:assert/strict";
import { as, asAdmin, createDb, createUsers, errorCode, rpc } from "./db.js";

const id = (n) => `${String(n).padStart(8, "0")}-3333-4000-8000-${String(n).padStart(12, "0")}`;
const OP = id(1); // operador de CINET
const A = id(2); // administra «Cine Andes»
const A2 = id(3); // editor de «Cine Andes»
const B = id(4); // administra «Cine Bolívar»
const C = id(5); // público con cuenta

const db = await createDb();
await createUsers(db, [{ id: OP }, { id: A }, { id: A2 }, { id: B }, { id: C }]);
await asAdmin(db);
await db.query("update public.profiles set role = 'admin' where id = $1", [OP]);

const rows = async (sql, args) => (await db.query(sql, args)).rows;
const json = (value) => JSON.stringify(value);
const listing = (org, venue, extra = {}) =>
  db.query(
    `insert into public.listings (org_id, venue_id, kind, title_id, title, starts_at, valid_until, format, language, price_cop, official_url, source)
     values ($1, $2, 'showtime', 'tmdb-movie-1', $3, $4, $5, '2D', 'Subtitulada', 18000, 'https://andes.example/funcion', $6) returning id, created_by, source`,
    [org, venue, json({ title: "Uno" }), extra.starts ?? "2030-05-01T01:00:00Z", extra.until ?? "2030-05-01T01:00:00Z", extra.source ?? "manual"]
  );

let orgA;
let orgB;
let venueA;
let listingA;

test("solicitar y verificar: pendiente no publica; solo un operador verifica", async () => {
  await as(db, A);
  orgA = (await rpc(db, "request_organization", ["Cine Andes", "cinema", "https://andes.example"])).request_organization;
  assert.equal(await errorCode(rpc(db, "request_organization", ["X", "cinema", "http://inseguro.example"])), "CN422", "solo https");
  assert.equal(await errorCode(db.query("insert into public.venues (org_id, name, city) values ($1, 'Sede', 'Bogotá')", [orgA])), "42501", "pendiente no publica");
  await as(db);
  assert.deepEqual(await rows("select id from public.organizations"), [], "una pendiente no es pública");
  await as(db, C);
  assert.equal(await errorCode(rpc(db, "verify_organization", [orgA, "verified"])), "CN403");
  await as(db, OP);
  await rpc(db, "verify_organization", [orgA, "verified"]);
  await as(db, B);
  orgB = (await rpc(db, "request_organization", ["Cine Bolívar", "cinema", "https://bolivar.example"])).request_organization;
  await as(db, OP);
  await rpc(db, "verify_organization", [orgB, "verified"]);
});

test("publicar: la función queda sellada con autor y fuente, y es pública mientras esté vigente", async () => {
  await as(db, A);
  venueA = (await rows("insert into public.venues (org_id, name, city) values ($1, 'Andes Centro', 'Bogotá') returning id", [orgA]))[0].id;
  const created = (await listing(orgA, venueA, { source: "partner_api" })).rows[0];
  listingA = created.id;
  assert.deepEqual([created.created_by, created.source], [A, "manual"], "no se puede falsear autor ni fuente");
  await listing(orgA, venueA, { starts: "2020-01-01T01:00:00Z", until: "2020-01-01T01:00:00Z" }); // vencida
  await as(db);
  const visible = await rows("select id from public.listings");
  assert.deepEqual(visible.map((row) => row.id), [listingA], "el público no ve la vencida");
  await as(db, A);
  assert.equal((await rows("select id from public.listings")).length, 2, "la organización ve también lo vencido");
  await db.query("update public.listings set status = 'cancelled' where id = $1", [listingA]);
  await as(db, C);
  assert.deepEqual(await rows("select id from public.listings"), [], "cancelada deja de mostrarse");
  await as(db, A);
  await db.query("update public.listings set status = 'scheduled' where id = $1", [listingA]);
});

test("aislamiento: otra organización no toca ni publica en nombre de la primera", async () => {
  await as(db, B);
  const update = await db.query("update public.listings set price_cop = 1 where id = $1", [listingA]);
  assert.equal(update.affectedRows ?? 0, 0, "B no puede modificar funciones de A");
  assert.equal(await errorCode(listing(orgA, venueA)), "42501", "ni crear en nombre de A");
  const venueB = (await rows("insert into public.venues (org_id, name, city) values ($1, 'Bolívar', 'Medellín') returning id", [orgB]))[0].id;
  assert.ok(venueB);
  assert.equal(await errorCode(listing(orgB, venueA)), "42501", "ni usar una sede de A");
  await as(db, A);
  assert.equal((await rows("select org_id, price_cop from public.listings where id = $1", [listingA]))[0].price_cop, 18000);
  assert.deepEqual(await rows("select user_id from public.org_members where org_id = $1", [orgB]), [], "A no ve los miembros de B");
});

test("equipo y auditoría: el editor publica, solo administradores leen la auditoría", async () => {
  await as(db, A);
  const email = `${A2.slice(0, 8)}@example.test`; // correo de prueba que crea createUsers
  await rpc(db, "invite_org_member", [orgA, email, "editor"]);
  await as(db, A2);
  const [invite] = await rows("select id, org_id, role from public.list_my_org_invites()");
  assert.deepEqual([invite.org_id, invite.role], [orgA, "editor"]);
  assert.equal((await rpc(db, "accept_org_invite", [invite.id])).accept_org_invite, orgA);
  assert.equal((await rpc(db, "accept_org_invite", [invite.id])).accept_org_invite, orgA, "reintento idempotente");
  await listing(orgA, venueA, { starts: "2030-06-01T01:00:00Z", until: "2030-06-01T01:00:00Z" });
  assert.deepEqual(await rows("select id from public.org_audit"), [], "un editor no lee la auditoría");
  assert.equal(await errorCode(rpc(db, "invite_org_member", [orgA, email, "admin"])), "CN403");
  await as(db, A);
  const audit = await rows("select actor, action, entity from public.org_audit where org_id = $1 order by id", [orgA]);
  assert.ok(audit.some((entry) => entry.actor === A2 && entry.entity === "listings" && entry.action === "insert"), "queda quién publicó");
  assert.ok(audit.some((entry) => entry.entity === "organizations" && entry.action === "verified"));
  await as(db, B);
  assert.deepEqual(await rows("select id from public.org_audit where org_id = $1", [orgA]), []);
});

test("ofertas vigentes y separadas; ventas solo por el servidor e idempotentes", async () => {
  await as(db, A);
  await db.query("insert into public.offers (org_id, headline, url, valid_until) values ($1, 'Combo 2x1', 'https://andes.example/combo', '2030-01-01')", [orgA]);
  await db.query("insert into public.offers (org_id, headline, url, valid_until) values ($1, 'Ya pasó', 'https://andes.example/viejo', '2020-01-01')", [orgA]);
  await as(db);
  assert.deepEqual((await rows("select headline from public.offers")).map((row) => row.headline), ["Combo 2x1"]);
  await as(db, A);
  assert.equal(
    await errorCode(db.query("insert into public.attribution_events (org_id, external_id, kind, amount_cop, occurred_at) values ($1, 'v1', 'sale_confirmed', 1000, now())", [orgA])),
    "42501",
    "nadie registra ventas desde la app"
  );
  await asAdmin(db); // el webhook usa service_role
  await db.query("insert into public.attribution_events (org_id, external_id, kind, amount_cop, occurred_at) values ($1, 'v1', 'sale_confirmed', 1000, now())", [orgA]);
  assert.equal(
    await errorCode(db.query("insert into public.attribution_events (org_id, external_id, kind, amount_cop, occurred_at) values ($1, 'v1', 'sale_confirmed', 1000, now())", [orgA])),
    "23505",
    "el mismo evento no cuenta dos veces"
  );
  await as(db, B);
  assert.deepEqual(await rows("select id from public.attribution_events"), [], "B no ve ventas de A");
});

test("suspender oculta la cartelera y bloquea publicar", async () => {
  await as(db, OP);
  await rpc(db, "verify_organization", [orgA, "suspended"]);
  await as(db);
  assert.deepEqual(await rows("select id from public.listings where org_id = $1", [orgA]), []);
  await as(db, A);
  assert.equal(await errorCode(listing(orgA, venueA)), "42501");
});

// ---------- Auditoría 2026-11-07 · N04 (V09, V10): invitaciones sin oráculo ni altas forzadas ----------

test("V09/V10: correo existente e inexistente dan la misma respuesta y nadie entra sin aceptar", async () => {
  await as(db, B); // administra «Cine Bolívar» (verificada)
  const existing = `${C.slice(0, 8)}@example.test`; // cuenta real de prueba
  const missing = "nadie-registrado@example.test";
  const a = await rpc(db, "invite_org_member", [orgB, existing, "editor"]);
  const b = await rpc(db, "invite_org_member", [orgB, missing, "editor"]);
  assert.deepEqual(a, b, "misma respuesta visible");
  const legacy = [await rpc(db, "add_org_member", [orgB, existing, "editor"]), await rpc(db, "add_org_member", [orgB, missing, "editor"])];
  assert.deepEqual(legacy.map((row) => row.add_org_member), [null, null], "el nombre antiguo ya no revela UUID ni CN404");
  assert.equal(await errorCode(rpc(db, "invite_org_member", [orgB, "no-es-correo", "editor"])), "CN422");
  assert.deepEqual(await rows("select user_id from public.org_members where org_id = $1 and user_id = $2", [orgB, C]), [], "C no es miembro antes de aceptar");
  await as(db, C);
  assert.deepEqual(await rows("select user_id from public.org_members where org_id = $1", [orgB]), [], "ni lo ve");
  const [mine] = await rows("select id from public.list_my_org_invites()");
  assert.equal(await errorCode(rpc(db, "accept_org_invite", [mine.id])), null);
  assert.equal((await rows("select 1 from public.org_members where org_id = $1 and user_id = $2", [orgB, C])).length, 1, "miembro solo tras aceptar");
});

test("invitaciones: otra cuenta no acepta la ajena, revocar y vencer las anula, pendiente no invita, hay cupos", async () => {
  await as(db, B);
  const target = `${A2.slice(0, 8)}@example.test`;
  await rpc(db, "invite_org_member", [orgB, target, "editor"]);
  await as(db, A); // otra persona con cuenta
  assert.deepEqual(await rows("select id from public.list_my_org_invites()"), [], "no ve invitaciones de otro correo");
  await as(db, A2);
  const [invite] = await rows("select id from public.list_my_org_invites()");
  await as(db, A);
  assert.equal(await errorCode(rpc(db, "accept_org_invite", [invite.id])), "CN404", "no es para A");
  assert.equal(await errorCode(rpc(db, "revoke_org_invite", [invite.id])), "CN404", "A no administra Bolívar");
  await as(db, B);
  await rpc(db, "revoke_org_invite", [invite.id]);
  await as(db, A2);
  assert.equal(await errorCode(rpc(db, "accept_org_invite", [invite.id])), "CN410", "revocada");
  await as(db, B);
  await rpc(db, "invite_org_member", [orgB, target, "editor"]);
  await asAdmin(db);
  await db.query("update public.org_invites set expires_at = now() - interval '1 minute' where org_id = $1", [orgB]);
  await as(db, A2);
  assert.deepEqual(await rows("select id from public.list_my_org_invites()"), [], "vencidas no se listan");

  // Una organización pendiente no puede sumar gente.
  await as(db, C);
  const pending = (await rpc(db, "request_organization", ["Pendiente SAS", "organizer", "https://pendiente.example"])).request_organization;
  assert.equal(await errorCode(rpc(db, "invite_org_member", [pending, target, "editor"])), "CN403");

  // Cupo de 20 abiertas por organización.
  await as(db, B);
  for (let n = 0; n < 20; n += 1) await rpc(db, "invite_org_member", [orgB, `cupo${n}@example.test`, "editor"]);
  assert.equal(await errorCode(rpc(db, "invite_org_member", [orgB, "uno-mas@example.test", "editor"])), "CN429");
});
