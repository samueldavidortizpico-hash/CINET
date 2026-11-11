import { test } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_MARATHON } from "../data/duo.js";
import { asSession } from "./useDuoSession.js";

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
