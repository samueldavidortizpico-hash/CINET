import { test } from "node:test";
import assert from "node:assert/strict";
import { CALIBRATION_ANSWERS, DEFAULT_DUO_SESSION, DEFAULT_MARATHON } from "../data/duo.js";
import { asSession, DUO_SESSION_VERSION } from "./useDuoSession.js";

test("una sesión Duo dañada normaliza todos los campos de maratón", () => {
  const session = asSession({
    mode: "marathon",
    marathon: { type: "invalid", maxMinutes: 1_000_000, count: 999, style: "invalid", scope: "invalid" },
    marathonPlan: { entries: null },
    votes: [],
  });
  assert.deepEqual(session.marathon, DEFAULT_MARATHON);
  assert.equal(session.marathonPlan, null);
  assert.deepEqual(session.votes, {});
});

test("una maratón de serie conserva opciones válidas", () => {
  const session = asSession({
    mode: "marathon",
    marathon: { type: "tv", maxMinutes: 480, count: 8, style: "varied", scope: "saga" },
  });
  assert.deepEqual(session.marathon, { type: "tv", maxMinutes: 480, count: 8, style: "varied", scope: "saga" });
});

test("V36: un actor con nombre objeto (el de la auditoría) se descarta solo; lo demás se conserva y se avisa", () => {
  const report = [];
  const session = asSession({
    step: "person-0",
    people: [
      {
        name: "Ana",
        genres: ["drama", { bad: 1 }, 42],
        actors: [{ id: 111, name: { corrupt: "object" } }, { id: 222, name: "Actriz" }, { id: { x: 1 }, name: "Sin id" }, null],
        titles: [{ id: "a", genreKeys: ["drama"], answer: CALIBRATION_ANSWERS[0].key }, { id: "b", genreKeys: [{}], answer: CALIBRATION_ANSWERS[0].key }],
      },
      {},
    ],
    votes: { "tmdb-movie-1": ["yes", null], "tmdb-movie-2": [{ evil: true }], "tmdb-movie-3": "yes" },
    providers: [8, "netflix", { x: 1 }],
    relax: { runtime: "30", platforms: "true", oneSided: true, extra: { x: 1 } },
    round: { id: "r", deck: ["a", 7, "b"], votes: { a: [{}] }, card: 99 },
  }, report);
  const [ana] = session.people;
  assert.deepEqual(ana.actors, [{ id: 222, name: "Actriz" }]);
  assert.deepEqual(ana.genres, ["drama"]);
  assert.deepEqual(ana.titles.map((title) => title.id), ["a"]);
  assert.equal(ana.name, "Ana");
  assert.equal(session.step, "person-0", "el paso se conserva");
  assert.deepEqual(session.votes, { "tmdb-movie-1": ["yes", null] });
  assert.deepEqual(session.providers, [8, "netflix"]);
  assert.deepEqual(session.relax, { runtime: 30, platforms: false, oneSided: true });
  assert.deepEqual(session.round.deck, ["a", "b"]);
  assert.deepEqual(session.round.votes, {});
  assert.equal(session.round.card, 2);
  for (const label of ["actores", "géneros", "títulos calificados", "votos", "plataformas", "ronda de votación"]) assert.ok(report.includes(label), label);
  // Lo que React pinta es siempre texto.
  for (const person of session.people) for (const actor of person.actors) assert.equal(typeof actor.name, "string");
});

test("regresión: los finalistas reales ({id, role, why: [texto]}) sobreviven; los dañados se descartan", () => {
  const good = { id: "tmdb-movie-1", role: "meet", why: ["Les gusta a los dos"] };
  const report = [];
  const session = asSession({ finalists: [good, { id: "x", role: "alt", why: [{ evil: 1 }] }, { id: 7, role: "alt" }] }, report);
  assert.deepEqual(session.finalists, [good]);
  assert.deepEqual(report, ["finalistas"]);
});

test("V37: una sesión sin versión (v1) se migra; una de versión futura se descarta entera con aviso", () => {
  const legacy = asSession({ people: [{ name: "Sola", actors: [{ id: 5, name: "Uno" }] }], step: "person-0" });
  assert.equal(legacy.version, DUO_SESSION_VERSION);
  assert.deepEqual(legacy.people[0].actors, [{ id: 5, name: "Uno" }]);
  const report = [];
  const future = asSession({ version: DUO_SESSION_VERSION + 1, people: [{ name: "X" }], step: "person-0" }, report);
  assert.deepEqual(future, DEFAULT_DUO_SESSION);
  assert.deepEqual(report, ["sesión de una versión más nueva"]);
  const healthy = [];
  asSession(legacy, healthy);
  assert.deepEqual(healthy, [], "una sesión sana no genera avisos");
});
