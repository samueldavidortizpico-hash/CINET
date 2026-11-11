/* URLs que vienen de la base: se muestran sin lanzar excepciones y solo si son https sin credenciales. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { safeHostname, safeHttpsUrl } from "./url.js";

test("una URL https normal da su hostname y su href", () => {
  assert.equal(safeHostname("https://cinemas.example.co/oficial?x=1"), "cinemas.example.co");
  assert.equal(safeHttpsUrl("https://cinemas.example.co/oficial?x=1"), "https://cinemas.example.co/oficial?x=1");
  assert.equal(safeHostname("https://cine.example:8443/ruta"), "cine.example");
});

// Todas estas pasan la restricción de la base (^https://...) pero new URL() las rechaza:
// una sola en la cola de aliados rompía el render de /admin para todos.
test("las URL que new URL() rechaza dan null en vez de lanzar", () => {
  for (const value of ["https://a|b.com", "https://a[b", "https://a%zz.com", "https://^.com", "https://a:99999999/x", "https://[::1", "https://a b"]) {
    assert.equal(safeHostname(value), null, value);
    assert.equal(safeHttpsUrl(value), null, value);
  }
});

test("solo https y sin credenciales embebidas (típico de enlaces de suplantación)", () => {
  assert.equal(safeHttpsUrl("http://cine.example"), null);
  assert.equal(safeHttpsUrl("javascript:alert(1)"), null);
  assert.equal(safeHttpsUrl("data:text/html,<b>x</b>"), null);
  assert.equal(safeHttpsUrl("https://cinecolombia.com@evil.example/"), null);
  assert.equal(safeHttpsUrl("https://user:clave@evil.example/"), null);
  assert.equal(safeHostname("http://cine.example"), null);
});

test("entradas que no son texto no rompen", () => {
  for (const value of [null, undefined, "", 42, {}, []]) {
    assert.equal(safeHostname(value), null);
    assert.equal(safeHttpsUrl(value), null);
  }
});
