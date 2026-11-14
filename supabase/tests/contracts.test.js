/* Auditoría 2026-11-07 · V01–V08: contrato de planes, zonas horarias y cupo de miembros.
   Atraviesa RPC (PGlite) → adaptador (toUiPlan/toShowtimes) → texto que pinta la vista. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { applyMigrations, as, asAdmin, createDb, createUsers, errorCode, rpc } from "./db.js";
import { toUiPlan, toUiPlans } from "../../src/services/planRepository.js";
import { getShareText, marathonTitles } from "../../src/services/planService.js";
import { SUPPORTED_TIME_ZONES } from "../../src/services/planContract.js";
import { toShowtimes } from "../../src/services/showtimeService.js";
import { planToIcs } from "../../src/utils/calendar.js";

const id = (n) => `${String(n).padStart(8, "0")}-2222-4000-8000-${String(n).padStart(12, "0")}`;
const A = id(1); // organiza
const CONTRACT = "20261107100000_plan_data_contracts.sql";

// Base ANTES de la corrección: se guardan datos que la versión anterior aceptaba (corpus de la auditoría).
const db = await createDb({ before: CONTRACT });
const many = Array.from({ length: 60 }, (_, index) => id(100 + index));
await createUsers(db, [{ id: A, name: "Ana" }, ...many.map((userId) => ({ id: userId }))]);
const rows = async (sql, args) => (await db.query(sql, args)).rows;
const plan = (ref, { title = { title: "Uno", year: "2001" }, place = { name: "Cinemark", location: "Andino" }, details = {}, zone = "America/Bogota", date = "2030-10-17", time = "20:30" } = {}) => [
  ref, "Viernes de cine", "", "cinema", "tmdb-movie-1", JSON.stringify(title), JSON.stringify(place), date, time, zone, JSON.stringify(details), "Ana",
];

await as(db, A);
const legacy = {};
legacy.marathonObject = (await rpc(db, "create_plan", plan("legacy-0001", { details: { marathon: { bad: "object" }, budget: 45000 } }))).create_plan;
legacy.marathonNull = (await rpc(db, "create_plan", plan("legacy-0002", { details: { marathon: [null, { id: 7, title: "Dos", minutes: 90 }] } }))).create_plan;
legacy.titleObject = (await rpc(db, "create_plan", plan("legacy-0003", { title: { title: { corrupt: true }, year: "1999", genres: ["Drama", { x: 1 }] } }))).create_plan;
legacy.placeObject = (await rpc(db, "create_plan", plan("legacy-0004", { place: { name: { corrupt: true }, location: "Centro", url: "javascript:alert(1)" } }))).create_plan;
legacy.factory = (await rpc(db, "create_plan", plan("legacy-0005", { zone: "Factory" }))).create_plan;
legacy.valid = (await rpc(db, "create_plan", plan("legacy-0006", { details: { marathon: [{ id: 1, title: "Uno", minutes: 120 }] } }))).create_plan;
await asAdmin(db);
const factoryInstantBefore = (await rows("select starts_at from public.plans where id = $1", [legacy.factory]))[0].starts_at.toISOString();
await applyMigrations(db, { from: CONTRACT });

test("V01–V04 históricos: se reparan sin perder lo válido y el original queda en cuarentena", async () => {
  await asAdmin(db);
  const byId = Object.fromEntries((await rows("select id, title, place, details, time_zone, starts_at from public.plans")).map((row) => [row.id, row]));
  assert.deepEqual(byId[legacy.marathonObject].details, { budget: 45000 }, "marathon objeto se descarta; el presupuesto válido se conserva");
  assert.deepEqual(byId[legacy.marathonNull].details.marathon, [{ id: 7, title: "Dos", minutes: 90 }], "solo se quita el null");
  assert.deepEqual(byId[legacy.titleObject].title, { year: "1999", genres: ["Drama"] });
  assert.deepEqual(byId[legacy.placeObject].place, { location: "Centro" }, "nombre objeto y URL javascript: fuera");
  assert.equal(byId[legacy.factory].time_zone, "UTC");
  assert.equal(byId[legacy.factory].starts_at.toISOString(), factoryInstantBefore, "el instante no cambia");
  assert.deepEqual(byId[legacy.valid].details, { marathon: [{ id: 1, title: "Uno", minutes: 120 }] }, "una fila válida no se toca");
  const quarantine = await rows("select plan_id, field, original from public.plan_data_quarantine order by id");
  assert.equal(quarantine.length, 5);
  assert.deepEqual(quarantine.find((row) => row.plan_id === legacy.marathonObject).original.marathon, { bad: "object" }, "copia íntegra del original");
  assert.equal(quarantine.find((row) => row.field === "time_zone").original, "Factory");
  await as(db, A);
  assert.equal(await errorCode(db.query("select * from public.plan_data_quarantine")), "42501", "la cuarentena no es legible por usuarios");
});

test("V01–V03 nuevas escrituras: el RPC rechaza con CN422 y la tabla con CHECK", async () => {
  await as(db, A);
  const bad = [
    { details: { marathon: { bad: "object" } } },
    { details: { marathon: "texto" } },
    { details: { marathon: [null] } },
    { details: { marathon: [{ id: 1 }] } },
    { details: { budget: 1.5 } },
    { details: { extra: true } },
    { title: { title: { corrupt: true } } },
    { title: { title: "Ok", genres: "Drama" } },
    { place: { name: { corrupt: true } } },
    { place: { name: "Cine", url: "javascript:alert(1)" } },
  ];
  for (const [index, variant] of bad.entries()) {
    assert.equal(await errorCode(rpc(db, "create_plan", plan(`bad-variant-${index}`, variant))), "CN422", JSON.stringify(variant));
  }
  // Control: lista vacía y valores de los tipos correctos.
  assert.ok((await rpc(db, "create_plan", plan("good-variant-1", { details: { marathon: [], budget: 30000, ambience: "😂 Divertido" } }))).create_plan);
  await asAdmin(db);
  assert.equal(await errorCode(db.query("update public.plans set details = '{\"marathon\":[null]}' where id = $1", [legacy.valid])), "23514", "CHECK de la tabla");
});

test("V04/V05 zonas: Factory e inventadas se rechazan; Bogotá, UTC y Nueva York funcionan con cambio de día e ICS", async () => {
  await as(db, A);
  assert.equal(await errorCode(rpc(db, "create_plan", plan("zone-factory", { zone: "Factory" }))), "CN422");
  assert.equal(await errorCode(rpc(db, "create_plan", plan("zone-mars", { zone: "Mars/Olympus" }))), "CN422");
  const bogota = (await rpc(db, "create_plan", plan("zone-bogota", { zone: "America/Bogota", date: "2030-03-09", time: "23:30" }))).create_plan;
  const utc = (await rpc(db, "create_plan", plan("zone-utc", { zone: "UTC", date: "2030-03-09", time: "23:30" }))).create_plan;
  // 10 mar 2030: Nueva York pasa a horario de verano a las 02:00.
  const ny = (await rpc(db, "create_plan", plan("zone-new-york", { zone: "America/New_York", date: "2030-03-10", time: "03:30" }))).create_plan;
  const read = async (planId) => {
    const [row] = await rows("select * from public.plans where id = $1", [planId]);
    return { ...row, starts_at: row.starts_at.toISOString(), plan_members: [] };
  };
  const [rowBogota, rowUtc, rowNy] = [await read(bogota), await read(utc), await read(ny)];
  assert.equal(rowBogota.starts_at, "2030-03-10T04:30:00.000Z", "23:30 en Bogotá ya es el día siguiente en UTC");
  assert.equal(rowUtc.starts_at, "2030-03-09T23:30:00.000Z");
  assert.equal(rowNy.starts_at, "2030-03-10T07:30:00.000Z", "EDT (UTC−4) después del cambio");
  const uiBogota = toUiPlan(rowBogota, A);
  assert.deepEqual([uiBogota.dateISO, uiBogota.time, uiBogota.zoneFallback], ["2030-03-09", "23:30", false], "se muestra en la zona del plan");
  assert.match(planToIcs(uiBogota), /DTSTART:20300310T043000Z/);
  assert.equal(toUiPlan(rowNy, A).time, "03:30");
});

test("V04 lectura: una fila con zona o JSON dañados no tumba la lista ni la vista", () => {
  const base = { id: "p", owner_id: A, name: "Plan", message: "", mode: "home", title_id: "x", starts_at: "2030-01-01T01:00:00Z", status: "active", version: 1, plan_members: [] };
  const damaged = [
    { ...base, id: "factory", time_zone: "Factory" },
    { ...base, id: "marathon-object", time_zone: "UTC", details: { marathon: { bad: "object" } } },
    { ...base, id: "marathon-null", time_zone: "UTC", details: { marathon: [null] } },
    { ...base, id: "title-object", time_zone: "UTC", title: { title: { corrupt: true } }, place: { name: { x: 1 } } },
    { ...base, id: "members-object", time_zone: "UTC", plan_members: { not: "a list" } },
  ];
  const plans = toUiPlans(damaged, A);
  assert.equal(plans.length, 5, "ninguna fila bloquea a las demás");
  const factory = plans.find((item) => item.id === "factory");
  assert.deepEqual([factory.dateISO, factory.time, factory.zoneFallback], ["2030-01-01", "01:00 UTC", true], "UTC informado, mismo instante");
  assert.equal(planToIcs(factory).includes("DTSTART:20300101T010000Z"), true, "el .ics conserva el instante");
  for (const item of plans) {
    assert.equal(typeof item.movie.title, "string");
    assert.equal(typeof item.cinema.name, "string");
    assert.doesNotThrow(() => getShareText(item));
    assert.doesNotThrow(() => marathonTitles(item));
  }
});

test("V06 cartelera: una función con zona inválida no oculta las válidas", () => {
  const future = "2030-05-01T01:00:00Z";
  const row = (rowId, extra = {}) => ({ id: rowId, org_id: "o", venue_id: "v", kind: "showtime", title_id: "t", title: { title: "T" }, starts_at: future, time_zone: "America/Bogota", official_url: "https://cine.example/x", status: "scheduled", valid_until: future, updated_at: future, ...extra });
  const { items, skipped } = toShowtimes(
    [row("ok-1"), row("bad-zone", { time_zone: "Factory" }), row("bad-url", { official_url: "javascript:alert(1)" }), row("bad-title", { title: { title: { x: 1 } } }), row("ok-2")],
    new Map([["v", { name: "Sala", city: "Bogotá" }]]),
    new Map([["o", { name: "Cine" }]]),
    new Date("2029-01-01")
  );
  assert.deepEqual(items.map((item) => item.id), ["ok-1", "bad-zone", "bad-title", "ok-2"], "zona y título dañados se recuperan; URL insegura se omite");
  assert.equal(skipped, 1);
  assert.equal(items.find((item) => item.id === "bad-zone").zoneFallback, true);
  assert.equal(items.find((item) => item.id === "bad-title").title, "");
});

test("Contrato de zonas idéntico en SQL e Intl", async () => {
  await asAdmin(db);
  for (const zone of SUPPORTED_TIME_ZONES) {
    assert.ok((await rows("select public.is_supported_time_zone($1) as ok", [zone]))[0].ok, `${zone} falta en SQL`);
    assert.ok((await rows("select exists (select 1 from pg_timezone_names where name = $1) as ok", [zone]))[0].ok, `${zone} no existe en PostgreSQL`);
    assert.doesNotThrow(() => new Intl.DateTimeFormat("en", { timeZone: zone }), `${zone} no existe en Intl`);
  }
  const sqlCount = (await rows("select count(*)::int as n from pg_timezone_names where public.is_supported_time_zone(name)"))[0].n;
  assert.equal(sqlCount, SUPPORTED_TIME_ZONES.length, "SQL no admite zonas que JS no conozca");
  assert.equal((await rows("select public.is_supported_time_zone('Factory') as ok"))[0].ok, false);
});

// ---------- N03: cupo de 30 en la unión por UUID ----------

async function fixturePlanWithGroup(ref, planMembers, groupMembers) {
  await as(db, A);
  const planId = (await rpc(db, "create_plan", plan(ref))).create_plan;
  const groupId = (await rpc(db, "create_group", [`Grupo ${ref}`, "Ana"])).create_group;
  // Fixture con privilegios (como la auditoría): estados válidos de hasta 30; la acción se ejecuta como usuario.
  await asAdmin(db);
  for (const userId of planMembers) await db.query("insert into public.plan_members (plan_id, user_id, role, display_name, rsvp) values ($1, $2, 'member', 'P', 'yes')", [planId, userId]);
  for (const userId of groupMembers) await db.query("insert into public.group_members (group_id, user_id, display_name) values ($1, $2, 'G')", [groupId, userId]);
  await db.query("update public.plans set group_id = $2 where id = $1", [planId, groupId]);
  return { planId, groupId };
}

test("V07 repetir con conjuntos disjuntos 30 + 30 → CN429 sin crear nada (antes: 59 miembros)", async () => {
  const { planId } = await fixturePlanWithGroup("disjoint-1", many.slice(0, 29), many.slice(29, 58));
  await as(db, A);
  const before = (await rows("select count(*)::int as n from public.plans"))[0].n;
  assert.equal(await errorCode(rpc(db, "repeat_plan", [planId, "repeat-disjoint", "2030-11-01", "20:00", "America/Bogota"])), "CN429");
  assert.equal((await rows("select count(*)::int as n from public.plans"))[0].n, before, "atómico: ni plan ni miembros");
});

test("V08 repetir con coincidencias: unión exacta por UUID, sin RSVP copiadas, idempotente", async () => {
  // 20 en el plan + 20 en el grupo, 15 en común → 25 + Ana = 26.
  const { planId } = await fixturePlanWithGroup("overlap-1", many.slice(0, 20), many.slice(5, 25));
  await as(db, A);
  const copy = (await rpc(db, "repeat_plan", [planId, "repeat-overlap", "2030-11-01", "20:00", "America/Bogota"])).repeat_plan;
  assert.equal((await rpc(db, "repeat_plan", [planId, "repeat-overlap", "2030-11-01", "20:00", "America/Bogota"])).repeat_plan, copy, "mismo client_ref, mismo plan");
  const members = await rows("select user_id, rsvp from public.plan_members where plan_id = $1", [copy]);
  assert.equal(members.length, 26);
  assert.equal(new Set(members.map((member) => member.user_id)).size, 26);
  assert.deepEqual(members.filter((member) => member.rsvp).map((member) => member.user_id), [A], "solo quien repite confirma");
});

test("V07 schedule_next_plan y share_plan_with_group aplican la misma regla", async () => {
  const { planId, groupId } = await fixturePlanWithGroup("share-group-1", many.slice(0, 20), many.slice(30, 41));
  await as(db, A);
  assert.equal(await errorCode(rpc(db, "share_plan_with_group", [planId, groupId])), "CN429", "21 + 11 > 30");
  await asAdmin(db);
  await db.query("update public.billing_config set sandbox = true");
  await as(db, A);
  await rpc(db, "activate_plus_sandbox");
  await rpc(db, "set_plan_repeat", [planId, "week"]);
  assert.equal(await errorCode(rpc(db, "schedule_next_plan", [planId, "next-share-1"])), "CN429");
});
