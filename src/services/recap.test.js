import { test } from "node:test";
import assert from "node:assert/strict";
import { buildRecap, recapShareText } from "./recap.js";

const plan = (id, dateISO, extra = {}) => ({ id, dateISO, mode: "cinema", remote: true, isOwner: true, status: "active", movie: { id: `m-${id}`, title: id, genres: ["Comedia"] }, ...extra });

test("el resumen cuenta solo planes del año a los que fuiste o que organizaste", () => {
  const recap = buildRecap({
    year: 2026,
    history: { seen: ["a", "b", "c"] },
    plans: [
      plan("enero", "2026-01-10"),
      plan("marzo", "2026-03-02", { mode: "home", movie: { id: "m-x", title: "X", genres: ["Drama"] } }),
      plan("marzo2", "2026-03-20"),
      plan("cancelado", "2026-03-21", { status: "cancelled" }),
      plan("no fui", "2026-04-01", { isOwner: false, myRsvp: "no" }),
      plan("otro año", "2025-12-31"),
    ],
  });
  assert.deepEqual([recap.plans, recap.cinema, recap.home, recap.titles, recap.seenTotal], [3, 2, 1, 3, 3]);
  assert.equal(recap.bestMonth, "marzo");
  assert.equal(recap.topGenre, "Comedia");
  assert.equal(recap.byMonth.length, 12);
});

test("lo que se comparte son cifras propias, sin nombres de nadie", () => {
  const recap = buildRecap({ year: 2026, plans: [plan("a", "2026-05-01", { members: [{ name: "Bea" }] })] });
  const text = recapShareText(recap);
  assert.equal(text, "Mi 2026 en CINET: 1 plan, lo que más planeé: comedia, mi mes más movido: mayo.");
  assert.ok(!text.includes("Bea"));
  assert.equal(buildRecap({ year: 2026 }).bestMonth, null);
});
