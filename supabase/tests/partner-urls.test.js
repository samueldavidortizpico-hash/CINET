/* Solicitud de aliado: el sitio oficial debe poder abrirse en el navegador (PGlite).
   Una URL que la base aceptaba pero new URL() rechazaba rompía el render de /admin para todos. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { as, createDb, createUsers, errorCode, rpc } from "./db.js";

const USER = "00000001-4444-4000-8000-000000000001";
const db = await createDb();
await createUsers(db, [{ id: USER }]);

const solicitar = (url) => rpc(db, "request_organization", ["Cine Prueba", "cinema", url]);

test("acepta sitios oficiales normales (puerto, ruta, consulta, fragmento, tildes)", async () => {
  await as(db, USER);
  for (const url of ["https://andes.example", "https://www.cinecolombia.com/", "https://x.example:8443/a?b=c#d", "https://cinépolis.com.co/", "https://a.b/c[d]=1"]) {
    const { request_organization: id } = await solicitar(url);
    assert.ok(id, url);
    // Cada solicitud pendiente cuenta; el tope es 3, así que se descarta para no agotarlo.
    await db.exec("reset role");
    await db.query("delete from public.organizations where id = $1", [id]);
    await as(db, USER);
  }
});

test("rechaza URLs que pasan ^https:// pero que new URL() no puede abrir", async () => {
  await as(db, USER);
  for (const url of ["https://a|b.com", "https://a[b", "https://a%zz.com", "https://^.com", "https://a:99999999/x", "https://a:65536/x", "https://[::1", "https://a b"]) {
    assert.equal(await errorCode(solicitar(url)), "CN422", url);
  }
});

test("rechaza credenciales embebidas, http y barras invertidas (suplantación)", async () => {
  await as(db, USER);
  for (const url of ["https://cinecolombia.com@evil.example/", "https://user:clave@evil.example/", "http://andes.example", "https://a" + String.fromCharCode(92) + "b.com", "javascript:alert(1)"]) {
    assert.equal(await errorCode(solicitar(url)), "CN422", url);
  }
});

test("lo rechazado no deja filas pendientes", async () => {
  await db.exec("reset role");
  const { rows } = await db.query("select count(*)::int as n from public.organizations");
  assert.equal(rows[0].n, 0);
});
