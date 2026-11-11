/* Gustos por cuenta: privados, validados, exportables y borrables (PostgreSQL real en PGlite). */
import { test } from "node:test";
import assert from "node:assert/strict";
import { as, createDb, createUsers, errorCode, rpc } from "./db.js";

const A = "aaaaaaaa-0000-4000-8000-0000000000a1";
const B = "bbbbbbbb-0000-4000-8000-0000000000b2";
const db = await createDb();
await createUsers(db, [{ id: A }, { id: B }]);
const save = (prefs) => rpc(db, "save_my_preferences", [JSON.stringify(prefs)]);
const mine = async () => (await db.query("select user_id, prefs from public.user_preferences")).rows;

test("cada cuenta guarda y lee solo sus gustos; las claves desconocidas no se guardan", async () => {
  await as(db, A);
  const saved = (await save({ region: "MX", providers: ["netflix"], genres: ["comedy"], rejectedGenres: ["horror"], maxRuntime: 120, email: "a@x.co" })).save_my_preferences;
  assert.deepEqual(saved, { region: "MX", providers: ["netflix"], genres: ["comedy"], rejectedGenres: ["horror"], maxRuntime: 120 });
  await save({ genres: ["drama"] }); // repetir actualiza, no duplica
  assert.equal((await mine()).length, 1);
  assert.deepEqual((await mine())[0].prefs.genres, ["drama"]);
  await as(db, B);
  assert.deepEqual(await mine(), [], "B no ve los gustos de A");
  await as(db);
  assert.equal(await errorCode(db.query("select * from public.user_preferences")), "42501");
  assert.equal(await errorCode(save({})), "42501");
});

test("validación: región, listas y duración", async () => {
  await as(db, B);
  for (const bad of [{ region: "col" }, { genres: ["<script>"] }, { providers: Array.from({ length: 21 }, (_, i) => `p${i}`) }, { maxRuntime: 12.5 }, { maxRuntime: "120" }]) {
    assert.equal(await errorCode(save(bad)), "CN422", JSON.stringify(bad));
  }
  assert.equal(await errorCode(db.query("insert into public.user_preferences (user_id, prefs) values ($1, '{}')", [B])), "42501", "sin escritura directa");
});

test("borrar elimina la fila propia y solo esa", async () => {
  await as(db, B);
  await save({ genres: ["action"] });
  await rpc(db, "delete_my_preferences");
  assert.deepEqual(await mine(), []);
  await as(db, A);
  assert.equal((await mine()).length, 1, "los de A siguen");
});
