import { test } from "node:test";
import assert from "node:assert/strict";
import { planToIcs, zonedInstant } from "./calendar.js";

const unfold = (ics) => ics.replace(/\r\n /g, "");

test("la hora local se convierte con su zona (también con cambio de horario)", () => {
  assert.equal(zonedInstant("2026-10-17", "20:30", "America/Bogota").toISOString(), "2026-10-18T01:30:00.000Z");
  assert.equal(zonedInstant("2026-07-01", "20:00", "Europe/Madrid").toISOString(), "2026-07-01T18:00:00.000Z", "verano: UTC+2");
  assert.equal(zonedInstant("2026-12-01", "20:00", "Europe/Madrid").toISOString(), "2026-12-01T19:00:00.000Z", "invierno: UTC+1");
});

test("el .ics conserva hora y zona, escapa el texto y no incluye a nadie más", () => {
  const plan = {
    id: "cinehub-1",
    name: "Cine, crispetas; y risas",
    message: "Llevo\nlas boletas",
    mode: "cinema",
    movie: { title: "Dune", runtime: 155 },
    cinema: { name: "Cinemark", location: "Andino" },
    dateISO: "2026-10-17",
    time: "8:30 PM",
    rsvp: { yes: ["Ana", "Bea"] },
  };
  const ics = planToIcs(plan, { url: "https://cinet.app/plan/cinehub-1", now: new Date("2026-10-09T12:00:00Z") });
  assert.ok(ics.startsWith("BEGIN:VCALENDAR\r\nVERSION:2.0\r\n"));
  assert.ok(ics.split("\r\n").every((line) => new TextEncoder().encode(line).length <= 75), "líneas plegadas a 75 octetos");
  const text = unfold(ics);
  assert.match(text, /DTSTART:20261018T013000Z/);
  assert.match(text, /DTEND:20261018T043500Z/, "155 min + 30 de avances");
  assert.match(text, /SUMMARY:Cine\\, crispetas\\; y risas/);
  assert.match(text, /DESCRIPTION:.*confirma la función.*\\nLlevo\\nlas boletas/);
  assert.match(text, /LOCATION:Cinemark · Andino/);
  assert.doesNotMatch(text, /Bea|ATTENDEE/, "sin asistentes");
});

test("un plan de cuenta usa su instante guardado; sin fecha no hay archivo", () => {
  const ics = unfold(planToIcs({ id: "p", name: "Casa", mode: "home", movie: { title: "Up" }, startsAt: "2026-10-18T01:30:00.000Z" }));
  assert.match(ics, /DTSTART:20261018T013000Z/);
  assert.match(ics, /DTEND:20261018T034500Z/, "120 min por defecto + 15");
  assert.equal(planToIcs({ id: "x", name: "Sin fecha", time: "" }), null);
});
