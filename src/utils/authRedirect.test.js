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

// El analizador de URL del navegador elimina tabulaciones y saltos de línea: "/\t/evil.com" se convierte en "//evil.com".
test("safeNext no se deja engañar por caracteres que el navegador elimina al resolver la URL", () => {
  for (const bad of ["/\t/evil.com", "/\n/evil.com", "/\r/evil.com", "/\u0000/evil.com", "/\u007f/evil.com", "/ok\n", "/\t\\evil.com"]) {
    assert.equal(safeNext(bad), null, JSON.stringify(bad));
  }
  // Rutas legítimas parecidas siguen pasando: el %2F de una ruta no es una barra para el navegador.
  assert.equal(safeNext("/plan/%2F/evil.com"), "/plan/%2F/evil.com");
  assert.equal(safeNext("/movie/tmdb-movie-123?x=a%20b#t"), "/movie/tmdb-movie-123?x=a%20b#t");
});
