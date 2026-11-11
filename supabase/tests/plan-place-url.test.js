/* Plan: place.url (el sitio del cine que ven los invitados) solo puede ser un https válido y sin credenciales (PGlite).
   Antes la base guardaba cualquier cosa: javascript:, http:// o https://cinecolombia.com@sitio-falso.example, que muestra
   un nombre y lleva a otro; la página lo presenta como «sitio oficial» a quienes confían en quien los invitó. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { as, asAdmin, createDb, createUsers, errorCode, rpc } from "./db.js";

const ORGANIZER = "00000001-6666-4000-8000-000000000001";
const db = await createDb();
await createUsers(db, [{ id: ORGANIZER, name: "Organiza" }]);

let counter = 0;
const crear = (place) =>
  rpc(db, "create_plan", [`ref-place-${String(counter++).padStart(6, "0")}`, "Plan", "", "cinema", "tmdb-movie-1", {}, place, "2030-01-01", "20:00", "America/Bogota", {}, "Organiza"]);

test("acepta un plan sin enlace y uno con el sitio oficial de un cine", async () => {
  await as(db, ORGANIZER);
  await crear({ name: "Casa", location: "" });
  await crear({ name: "Cine Colombia", location: "Bogotá", url: "https://www.cinecolombia.com/" });
  await crear({ name: "Cine local", location: "Chía", url: "https://cine.example:8443/cartelera?dia=hoy#hoy" });
});

test("rechaza javascript:, http://, credenciales embebidas y URLs que el navegador no abre", async () => {
  await as(db, ORGANIZER);
  for (const url of [
    "javascript:alert(document.domain)",
    "http://banco-falso.example/login",
    "https://cinecolombia.com@banco-falso.example/login",
    "https://user:clave@sitio.example/",
    "https://a|b.com",
    "https://a b",
    "data:text/html,<script>1</script>",
    "",
  ]) {
    assert.equal(await errorCode(crear({ name: "Cine", location: "x", url })), "CN422", JSON.stringify(url));
  }
});

test("url debe ser texto: números, listas y objetos se rechazan", async () => {
  await as(db, ORGANIZER);
  for (const url of [42, ["https://a.example"], { href: "https://a.example" }, true]) {
    assert.equal(await errorCode(crear({ name: "Cine", location: "x", url })), "CN422", JSON.stringify(url));
  }
});

test("lo rechazado no deja planes a medias", async () => {
  await asAdmin(db);
  const { rows } = await db.query("select count(*)::int as n from public.plans");
  assert.equal(rows[0].n, 3, "solo los 3 planes válidos del primer test");
});
