import { test } from "node:test";
import assert from "node:assert/strict";
import { describeResult, roomSession, roundProgress, toDeck } from "./duoRoom.js";
import { normalizeCode } from "./roomRepository.js";
import { buildProfile } from "./recommender.js";

test("los gustos anónimos de la sala se vuelven personas del motor de Duo", () => {
  const session = roomSession({ mode: "tv", region: "MX" }, [
    { genres: ["comedy"], rejectedGenres: ["horror"], maxRuntime: 0 },
    { genres: ["drama"], mustGenres: ["crime"], maxRuntime: 120 },
  ]);
  assert.deepEqual([session.mode, session.region, session.people.length], ["tv", "MX", 2]);
  const profile = buildProfile(session);
  assert.equal(profile.type, "tv");
  assert.ok(profile.rejected.includes("horror"), "un «evitar» de cualquiera filtra para todos");
  assert.ok(profile.must.includes("crime"));
  assert.equal(roomSession({ mode: "movie", region: "CO" }, []).people.length, 1, "sin gustos todavía: una persona neutra");
});

test("la baraja solo lleva lo que el servidor acepta", () => {
  const deck = toDeck([
    { title: { id: "tmdb-movie-1", title: "Uno", year: 2001, poster: "https://image.tmdb.org/t/p/w500/a.jpg", type: "movie" } },
    { title: { id: "dune", title: "Dune", year: "2021-10-01", poster: "/images/dune.jpg" } },
    { title: { id: "x", title: "X", poster: "javascript:alert(1)", type: "tv" } },
    { title: { id: "y", title: "Y", poster: "//evil.example/y.jpg" } },
  ], 3);
  assert.equal(deck.length, 3);
  assert.deepEqual(deck[1], { id: "dune", title: "Dune", year: "2021", image: "/images/dune.jpg", type: "movie" });
  assert.equal(deck[2].image, "", "sin esquemas raros");
  assert.equal(deck[2].type, "tv");
});

test("el resultado distingue coincidencia, más votada y nada", () => {
  const candidates = [{ id: "a", title: "A" }, { id: "b", title: "B" }];
  const tallies = [{ id: "a", yes: 1, maybe: 1, no: 0 }, { id: "b", yes: 0, maybe: 0, no: 2 }];
  assert.match(describeResult({ outcome: "match", winner: "a", participants: 3, tallies }, candidates).text, /Las 3 personas dijeron que sí a «A»/);
  const top = describeResult({ outcome: "top", winner: "a", participants: 2, tallies }, candidates);
  assert.match(top.text, /No hubo coincidencia total/);
  assert.equal(top.tallies[0].title.title, "A");
  assert.equal(describeResult({ outcome: "none", winner: null, participants: 2, tallies }, candidates).winner, null);
  assert.equal(describeResult(null), null);
  assert.match(describeResult({ outcome: "none", winner: null, all_vetoed: true, participants: 2, tallies }, candidates).text, /quedaron vetados/);
});

test("el progreso muestra cuántos votó cada participante, no qué", () => {
  const round = { status: "open", candidates: [{}, {}, {}], participants: ["u1", "u2", "gone"] };
  const members = [{ user_id: "u1", display_name: "Ana", seat: 1, votes_cast: 3 }, { user_id: "u2", display_name: "Bea", seat: 2, votes_cast: 1 }, { user_id: "late", display_name: "Tarde", seat: 3, votes_cast: 0 }];
  assert.deepEqual(roundProgress(round, members).map((item) => [item.name, item.done, item.total]), [["Ana", 3, 3], ["Bea", 1, 3]]);
  assert.deepEqual(roundProgress({ ...round, status: "closed" }, members), []);
  assert.equal(normalizeCode(" ab-c 234 "), "ABC234");
});
