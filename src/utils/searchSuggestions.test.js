import { test } from "node:test";
import assert from "node:assert/strict";
import { activeSuggestionIndex } from "./searchSuggestions.js";

test("FE02: Enter solo puede seleccionar una sugerencia vigente", () => {
  assert.equal(activeSuggestionIndex(3, 4), 3);
  assert.equal(activeSuggestionIndex(3, 1), -1);
  assert.equal(activeSuggestionIndex(-1, 4), -1);
});
