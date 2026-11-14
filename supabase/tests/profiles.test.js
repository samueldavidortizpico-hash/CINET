import { test } from "node:test";
import assert from "node:assert/strict";
import { as, asAdmin, createDb, createUsers, errorCode } from "./db.js";

test("profiles: no permite elevar el rol, editar otra cuenta ni omitir validaciones", async () => {
  const db = await createDb();
  try {
    const a = "11111111-1111-4111-8111-111111111111";
    const b = "22222222-2222-4222-8222-222222222222";
    await createUsers(db, [{ id: a }, { id: b }]);
    await as(db, a);
    assert.equal(await errorCode(db.query("update public.profiles set role = 'admin' where id = $1", [a])), "42501");
    assert.equal((await db.query("update public.profiles set bio = 'intrusion' where id = $1 returning id", [b])).rows.length, 0);
    assert.equal(await errorCode(db.query("update public.profiles set bio = $1 where id = $2", ["x".repeat(281), a])), "23514");
    assert.equal(await errorCode(db.query("update public.profiles set username = $1 where id = $2", [{ $ne: null }, a])), "23514");
    await asAdmin(db);
    assert.equal(await errorCode(db.query("update public.profiles set role = 'superadmin' where id = $1", [a])), "23514");
    assert.equal((await db.query("select role from public.profiles where id = $1", [a])).rows[0].role, "user");
  } finally {
    await db.close();
  }
});
