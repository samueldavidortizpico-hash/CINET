/* Chequeo mínimo de la lógica pura: `npm test` (node:test, sin dependencias). */
import { test } from "node:test";
import assert from "node:assert/strict";
import { findMovie, getMovies, getShowtimes, queryMovies } from "./movieService.js";
import { buildPlan, describeStart, filterPlans, getPlanStats, getRsvpStatus, isUpcoming, recommendedStart, setRsvp, to24h, toStartParts, validatePlan } from "./planService.js";
import { isRemoteId, toPlanError, toUiPlan } from "./planRepository.js";
import { hasErrors, normalizeProfile, validateForm, validateProfile } from "../utils/validation.js";

test("catálogo: buscar, filtrar y ordenar", async () => {
  const movies = await getMovies();
  assert.equal(movies.length, 40);
  assert.deepEqual(queryMovies(movies), movies, "sin filtros conserva el orden original");
  assert.ok(queryMovies(movies, { genre: "marvel" }).every((m) => m.universe.includes("Marvel")));
  assert.ok(queryMovies(movies, { genre: "dc" }).every((m) => m.universe === "DC"));
  assert.deepEqual(queryMovies(movies, { query: "  BATMAN " }).map((m) => m.id), ["the-batman"]);
  const byTitle = queryMovies(movies, { sort: "title" }).map((m) => m.title);
  assert.deepEqual(byTitle, [...byTitle].sort((a, b) => a.localeCompare(b, "es")));
  const byRating = queryMovies(movies, { sort: "rating" });
  assert.ok(byRating[0].rating >= byRating.at(-1).rating);
  assert.equal(findMovie("SpiderMan").id, "spider-man-no-way-home", "alias legacy");
  assert.equal(findMovie("no-existe"), null);
});

test("funciones: próximos días con etiqueta en español", () => {
  const { dates } = getShowtimes(new Date(2026, 7, 21), 2);
  assert.deepEqual(dates.map((d) => d.label), ["Viernes 21 de agosto", "Sábado 22 de agosto"]);
  assert.equal(dates[1].weekday, "SÁB");
});

test("planes: RSVP, fechas, filtros y estadísticas", () => {
  const plan = { id: "p1", dateISO: "2026-09-20", rsvp: { yes: ["Ana"], maybe: [], no: [] } };
  const moved = setRsvp(plan, "Ana", "no");
  assert.deepEqual(moved.rsvp, { yes: [], maybe: [], no: ["Ana"] });
  assert.equal(getRsvpStatus(moved, "Ana"), "no");
  assert.deepEqual(plan.rsvp.yes, ["Ana"], "no muta el plan original");

  const today = new Date(2026, 8, 25);
  const future = { id: "p2", dateISO: "2026-09-26", rsvp: { yes: ["Luis"], maybe: ["Eva"], no: [] } };
  assert.equal(isUpcoming(plan, today), false);
  assert.equal(isUpcoming({ id: "legacy" }, today), true, "planes legacy sin fecha ISO");
  assert.deepEqual(filterPlans([plan, future], "upcoming", today).map((p) => p.id), ["p2"]);
  assert.deepEqual(filterPlans([plan, future], "all", today).map((p) => p.id), ["p2", "p1"]);
  assert.deepEqual(getPlanStats([moved, future]), { total: 2, yes: 1, maybe: 1, no: 1 });
  assert.equal(validatePlan({ name: " ", organizer: "x" }).field, "name");
  assert.equal(validatePlan({ name: "Cine", organizer: "Ana" }), null);
});

test("validación del registro (legacy)", () => {
  assert.deepEqual(validateForm("Ana", "ana@correo.com", "12345678"), { name: "", email: "", password: "" });
  const errors = validateForm("A", "sin-arroba", "123");
  assert.ok(errors.name && errors.email && errors.password);
});

test("planes en casa: hora recomendada y campos del plan", () => {
  assert.equal(recommendedStart(169), "20:00", "Oppenheimer termina hacia las 23:00");
  assert.equal(recommendedStart(90), "21:30", "no más tarde de 21:30");
  assert.equal(recommendedStart(300), "18:00", "no antes de 18:00");
  const selection = { movie: { id: "x", title: "X", duration: "2h" }, cinema: { name: "Netflix", location: "En casa" }, date: "Hoy", dateISO: "2026-09-26", time: "20:00", mode: "home", ambience: "Romántico", food: "Pizza" };
  const plan = buildPlan(selection, { name: "Noche", organizer: "Ana", message: "" }, null, new Date(2026, 8, 26));
  assert.deepEqual([plan.mode, plan.ambience, plan.food, plan.duration], ["home", "Romántico", "Pizza", "2h"]);
  assert.equal(buildPlan({ ...selection, mode: undefined, ambience: undefined, food: undefined }, { name: "N", organizer: "A", message: "" }).mode, "cinema");
});

test("perfil: mismas reglas que los CHECK de public.profiles", () => {
  assert.deepEqual(normalizeProfile({ username: "  ", display_name: " Ana ", avatar_url: "", bio: "" }), { username: null, display_name: "Ana", avatar_url: null, bio: null });
  assert.equal(hasErrors(validateProfile({ username: "ana_01", display_name: "Ana", avatar_url: "https://img.test/a.png", bio: "Hola" })), false);
  assert.equal(hasErrors(validateProfile({})), false, "todo vacío es válido");
  for (const username of ["ab", "Ana", "ana-01", "ana 01", "a".repeat(31)]) assert.ok(validateProfile({ username }).username, username);
  assert.ok(validateProfile({ avatar_url: "javascript:alert(1)" }).avatar_url);
  assert.ok(validateProfile({ avatar_url: "http://img.test/a.png" }).avatar_url);
  assert.ok(validateProfile({ display_name: "x".repeat(61) }).display_name);
  assert.ok(validateProfile({ bio: "x".repeat(281) }).bio);
});

test("planes compartidos: hora en 24 h, zona del plan y forma para la interfaz", () => {
  assert.deepEqual(["5:15 PM", "12:00 AM", "12:30 PM", "20:30", "8:05", "25:00", "mañana"].map(to24h), ["17:15", "00:00", "12:30", "20:30", "08:05", null, null]);
  assert.deepEqual(toStartParts({ dateISO: "2026-10-17", time: "8:00 PM" }), { dateISO: "2026-10-17", time: "20:00" });
  // 01:30 UTC del 18 = 20:30 del 17 en Bogotá (UTC-5): la fecha no se corre de día.
  assert.deepEqual(describeStart("2026-10-18T01:30:00Z", "America/Bogota"), { date: "Sábado, 17 de octubre", dateISO: "2026-10-17", time: "20:30" });
  assert.equal(describeStart(null).date, "Fecha por definir");

  const row = {
    id: "11111111-2222-4333-8444-555555555555", owner_id: "A", name: "Viernes", message: "", mode: "cinema", title_id: "dune",
    title: { title: "Dune", year: "2021" }, place: { name: "Cinemark", location: "Bogotá", url: "https://www.cinemark.com.co/" },
    starts_at: "2026-10-18T01:30:00Z", time_zone: "America/Bogota", time_source: "organizer", details: {}, status: "active", version: 3,
    plan_members: [
      { user_id: "B", role: "member", display_name: "Sam", rsvp: "maybe" },
      { user_id: "A", role: "owner", display_name: "Sam", rsvp: "yes" },
    ],
  };
  const asB = toUiPlan(row, "B");
  assert.deepEqual([asB.isOwner, asB.myRsvp, asB.organizer, asB.time, asB.version], [false, "maybe", "Sam", "20:30", 3]);
  assert.deepEqual(asB.rsvp, { yes: ["Sam"], maybe: ["Sam"], no: [] }, "dos personas con el mismo nombre siguen siendo dos");
  assert.equal(toUiPlan(row, "A").isOwner, true);
  assert.equal(isRemoteId(row.id), true);
  assert.equal(isRemoteId("cinehub-1727000000000"), false);
  assert.deepEqual([toPlanError({ code: "CN410", message: "Esta invitación caducó." }).code, toPlanError({ code: "CN410", message: "Esta invitación caducó." }).message], ["CN410", "Esta invitación caducó."]);
  assert.equal(toPlanError({ code: "PGRST301", message: "JWT expired detalle interno" }).code, "network", "errores técnicos sin detalles");
});
