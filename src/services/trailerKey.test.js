import { test } from "node:test";
import assert from "node:assert/strict";
import { isYouTubeKey, pickTrailer } from "./movieService.js";

test("isYouTubeKey acepta claves reales y rechaza lo que rompería la URL del iframe", () => {
  assert.equal(isYouTubeKey("dQw4w9WgXcQ"), true);
  for (const bad of ["", "ab", "a/../b?x=1", "x\" onload=\"y", "javascript:alert(1)", "a b c d e f", null, undefined, 12345678]) {
    assert.equal(isYouTubeKey(bad), false, String(bad));
  }
});

test("pickTrailer ignora videos con clave manipulada y elige el tráiler oficial válido", () => {
  const videos = { results: [
    { site: "YouTube", type: "Trailer", official: true, key: "../evil?x" },
    { site: "YouTube", type: "Trailer", official: false, key: "dQw4w9WgXcQ" },
  ] };
  assert.equal(pickTrailer(videos), "dQw4w9WgXcQ");
  assert.equal(pickTrailer({ results: [{ site: "YouTube", type: "Trailer", key: "<script>" }] }), null);
  assert.equal(pickTrailer(undefined), null);
});
