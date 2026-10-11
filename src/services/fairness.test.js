/* Turnos justos: solo lo declarado, con tope, decaimiento y sin saltar filtros duros. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_DUO_SESSION, DEFAULT_PERSON } from "../data/duo.js";
import { EMPTY_TURNS, recordYield, turnCredits } from "./fairness.js";
import { buildProfile, rankTitles } from "./recommender.js";

const DAY = 86_400_000;
const T0 = Date.parse("2026-10-10T00:00:00Z");

test("créditos: quien cedió suma, quien no descuenta, tope 3 y mitad cada 30 días", () => {
  let state = recordYield(EMPTY_TURNS, ["Bea"], ["Ana", "Bea", "Persona 3"], T0);
  assert.deepEqual(turnCredits(state, ["Ana", "Bea", "Persona 3"], T0), { Bea: 1 }, "Ana no cede: 0; «Persona 3» no cuenta");
  for (let i = 0; i < 5; i++) state = recordYield(state, ["Bea"], ["Bea"], T0);
  assert.equal(turnCredits(state, ["Bea"], T0).Bea, 3, "tope");
  assert.equal(turnCredits(state, ["Bea"], T0 + 30 * DAY).Bea, 1.5, "decae a la mitad en 30 días");
  state = recordYield(state, [], ["Bea"], T0);
  assert.equal(turnCredits(state, ["Bea"], T0).Bea, 2, "cuando no cede, consume un punto");
  assert.deepEqual(Object.keys(state.people).sort(), ["ana", "bea"], "sin nombres genéricos");
});

test("el turno sube lo que le gusta a quien cedió, con tope, y explica por qué", () => {
  const session = {
    ...DEFAULT_DUO_SESSION,
    people: [
      { ...DEFAULT_PERSON, name: "Ana", genres: ["action"], maxRuntime: 0 },
      { ...DEFAULT_PERSON, name: "Bea", genres: ["drama"], rejectedGenres: ["horror"], maxRuntime: 0 },
    ],
  };
  const profile = buildProfile(session);
  const base = { year: "2020", rating: 7.5, voteCount: 2000, popularity: 50, type: "movie" };
  const titles = [
    { ...base, id: "accion", title: "Acción", genreKeys: ["action"], rating: 7.6 },
    { ...base, id: "drama", title: "Drama", genreKeys: ["drama"] },
    { ...base, id: "terror", title: "Terror dramático", genreKeys: ["horror", "drama"], rating: 9.5 },
  ];
  const plain = rankTitles(titles, profile).items.map(({ title }) => title.id);
  assert.equal(plain[0], "accion");
  const turned = rankTitles(titles, profile, { turns: { Bea: 3 } }).items;
  assert.equal(turned[0].title.id, "drama", "le toca a Bea");
  assert.ok(turned[0].reasons.some((reason) => reason.startsWith("Turno de Bea")));
  assert.ok(!turned.some(({ title }) => title.id === "terror"), "un rechazo sigue siendo rechazo");
  const points = turned[0].breakdown.find((item) => item.key === "turn").points;
  assert.ok(points > 0 && points <= 9, "empujón acotado");
});
