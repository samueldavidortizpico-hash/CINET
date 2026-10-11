import assert from "node:assert/strict";
import test from "node:test";
import { clearPendingNext, pendingNext, rememberNext, safeNext } from "./authRedirect.js";

test("safeNext solo acepta rutas internas que no sean pantallas de acceso", () => {
  assert.equal(safeNext("/invite/abc123"), "/invite/abc123");
  assert.equal(safeNext("/plan/1?tab=rsvp"), "/plan/1?tab=rsvp");
  for (const bad of ["//evil.com", "https://evil.com", "/\\evil.com", "invite/x", "", null, 42, "/login", "/", "/register?x=1", "/nueva-contrasena#t"]) {
    assert.equal(safeNext(bad), null, String(bad));
  }
});

test("el destino pendiente sobrevive y se limpia", () => {
  rememberNext("/invite/tok");
  assert.equal(pendingNext(), "/invite/tok");
  clearPendingNext();
  assert.equal(pendingNext(), null);
  rememberNext("//evil.com");
  assert.equal(pendingNext(), null);
});
