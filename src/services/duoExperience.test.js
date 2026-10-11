import { test } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_DUO_SESSION, DEFAULT_PERSON } from "../data/duo.js";
import { asSession } from "../hooks/useDuoSession.js";
import { DUO_OCCASIONS, shortlistItems, startOccasion, withAccountTaste } from "./duoExperience.js";

test("«Plan en familia» empieza con el modo familia; las demás ocasiones lo respetan", () => {
  const family = startOccasion(DEFAULT_DUO_SESSION, "family");
  assert.deepEqual([family.family, family.people.length, family.mode], ["kids", 3, "movie"]);
  assert.equal(startOccasion({ ...DEFAULT_DUO_SESSION, family: "teens" }, "date").family, "teens", "no se apaga solo");
  assert.equal(startOccasion(DEFAULT_DUO_SESSION, "friends").family, "off");
});

test("los gustos de la cuenta solo llenan la persona 1, la región y las plataformas", () => {
  const base = startOccasion(DEFAULT_DUO_SESSION, "friends");
  const prefs = { region: "MX", providers: ["netflix"], genres: ["comedy"], rejectedGenres: ["horror"], maxRuntime: 110 };
  const session = withAccountTaste(base, prefs, "Ana");
  assert.deepEqual([session.region, session.providers], ["MX", ["netflix"]]);
  assert.deepEqual([session.people[0].name, session.people[0].genres, session.people[0].rejectedGenres, session.people[0].maxRuntime], ["Ana", ["comedy"], ["horror"], 110]);
  assert.deepEqual(session.people.slice(1), base.people.slice(1), "nadie más recibe gustos ajenos");
  assert.equal(withAccountTaste(base, null), base, "sin gustos guardados no cambia nada");
  prefs.genres.push("drama");
  assert.deepEqual(session.people[0].genres, ["comedy"], "copia, no referencia");
});
import { buildProfile, rankTitles, scoreTitle } from "./recommender.js";

const session = (patch = {}) => ({ ...DEFAULT_DUO_SESSION, ...patch });
const title = (id, patch = {}) => ({ id, title: id, type: "movie", genreKeys: ["comedy"], runtime: 90, rating: 7, ...patch });

test("una ocasión reinicia la decisión sin inventar gustos ni perder región o plataformas", () => {
  const previous = session({ region: "MX", providers: ["netflix"], votes: { a: ["yes"] }, final: "a", mood: "intense", board: ["a"] });
  for (const occasion of DUO_OCCASIONS) {
    const next = startOccasion(previous, occasion.id);
    assert.equal(next.people.length, occasion.people);
    assert.equal(next.mode, occasion.mode);
    assert.equal(next.occasion, occasion.id);
    assert.equal(next.region, "MX");
    assert.deepEqual(next.providers, ["netflix"]);
    assert.notEqual(next.providers, previous.providers);
    assert.deepEqual(next.votes, {});
    assert.deepEqual(next.board, []);
    assert.equal(next.final, null);
    assert.equal(next.mood, null);
    assert.ok(next.people.every((person) => person.genres.length === 0 && person.tone.length === 0));
    assert.notEqual(next.people[0], DEFAULT_PERSON);
  }
  assert.equal(previous.final, "a", "no muta la sesión anterior");
});

test("el ánimo colectivo orienta el ranking sin declarar que cada persona expresó esos gustos", () => {
  const profile = buildProfile(session({ mood: "fun" }));
  assert.deepEqual(profile.tone, ["fun"]);
  assert.ok(profile.people.every((person) => person.tone.length === 0));
  const scored = scoreTitle(title("comedy"), profile);
  assert.ok(scored.breakdown.some((item) => item.key === "tone" && item.points > 0));
  assert.equal(scored.allPleased, false);
  assert.ok(scored.seats.every((seat) => !seat.expressed));
});

test("el ánimo no supera rechazos, duración ni formato; no rellena tres si solo queda uno", () => {
  const profile = buildProfile(session({ mood: "intense", people: [{ ...DEFAULT_PERSON, genres: ["comedy"], rejectedGenres: ["horror"], maxRuntime: 100 }] }));
  const { items } = rankTitles([title("ok"), title("horror", { genreKeys: ["comedy", "horror"] }), title("long", { runtime: 200 }), title("tv", { type: "tv" }), title("animation", { genreKeys: ["comedy", "animation"] })], profile);
  assert.deepEqual(items.map((item) => item.title.id), ["ok"]);
  assert.equal(shortlistItems(["ok", "horror", "long"], items).length, 1);
});

test("la comparación conserva el tablero, los motivos y la etiqueta de alternativa", () => {
  const items = ["a", "b", "c", "d"].map((id) => ({ title: title(id), reasons: [id], relaxed: id === "b" ? ["oneSided"] : [] }));
  const shortlist = shortlistItems(["c", "unknown", "b", "c", "d", "a"], items);
  assert.deepEqual(shortlist.map((item) => item.title.id), ["c", "b", "d"]);
  assert.equal(shortlist[1], items[1], "no recalcula ni inventa afinidades");
  assert.deepEqual(shortlist[1].relaxed, ["oneSided"]);
});

test("recargar conserva el nuevo recorrido y recupera sesiones antiguas o campos inválidos", () => {
  const stored = session({ step: "results", reached: 6, board: ["a"], mood: "romantic", occasion: "date", resultView: "explore", votes: { a: ["yes", "later"] } });
  const recovered = asSession(JSON.parse(JSON.stringify(stored)));
  assert.equal(recovered.mood, "romantic");
  assert.equal(recovered.occasion, "date");
  assert.equal(recovered.resultView, "explore");
  assert.deepEqual(recovered.votes, stored.votes);
  assert.equal(asSession({ step: "results", board: ["a"] }).resultView, "shortlist");
  const invalid = asSession({ mood: "unsafe", occasion: "unknown", resultView: "anything" });
  assert.equal(invalid.mood, null);
  assert.equal(invalid.occasion, null);
  assert.equal(invalid.resultView, "shortlist");
});

test("ronda reanudable: se guarda, se retoma, una nueva no hereda votos y los votos se suman por persona", async () => {
  const { learningSummary, mergeRoundVotes, newRound } = await import("./duoExperience.js");
  const first = newRound(["a", "b", "c"], 2);
  assert.deepEqual([first.phase, first.person, first.card, first.votes, first.result], ["handoff", 0, 0, {}, null]);
  assert.equal(newRound(["a"], 1).phase, "vote", "en solitario no hay que pasar el celular");

  // Recargar: la sesión guardada conserva la ronda tal cual; una dañada se descarta (no se inventan votos).
  const midway = { ...first, person: 1, card: 2, phase: "vote", votes: { a: ["yes", "no"], b: ["later", null] } };
  assert.deepEqual(asSession({ ...DEFAULT_DUO_SESSION, round: midway }).round, midway);
  assert.equal(asSession({ ...DEFAULT_DUO_SESSION, round: { id: "x", deck: [] } }).round, null);
  assert.equal(asSession({ ...DEFAULT_DUO_SESSION, round: { id: "x", deck: ["a"], phase: "inventada" } }).round.phase, "handoff");

  const second = newRound(midway.deck, 2);
  assert.notEqual(second.id, first.id);
  assert.deepEqual(second.votes, {}, "otra ronda empieza sin los votos anteriores");

  const merged = mergeRoundVotes({ a: [null, "yes"], z: ["no"] }, midway.votes);
  assert.deepEqual(merged, { a: ["yes", "no"], b: ["later"], z: ["no"] }, "por persona; un voto vacío no borra uno anterior");

  const profile = buildProfile(session({ people: [{ ...DEFAULT_PERSON, name: "Ana" }, { ...DEFAULT_PERSON, name: "Luis" }] }));
  assert.deepEqual(learningSummary(profile, merged), [
    { name: "Ana", loved: 0, noped: 0, yes: 1, no: 1 },
    { name: "Luis", loved: 0, noped: 0, yes: 0, no: 1 },
  ]);
});

test("calibración guardada: solo respuestas válidas y con géneros; el resto se descarta", () => {
  const saved = asSession({
    ...DEFAULT_DUO_SESSION,
    people: [{ titles: [{ id: "coco", genreKeys: ["animation"], answer: "love" }, { id: "x", genreKeys: ["drama"], answer: "quizás" }, { id: "y", answer: "seen" }, "roto"] }],
  });
  assert.deepEqual(saved.people[0].titles.map((item) => item.id), ["coco"]);
  assert.deepEqual(asSession({ people: [{}] }).people[0].titles, [], "sesiones anteriores siguen funcionando");
});
