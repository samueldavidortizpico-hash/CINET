/* Matriz transversal: un rol de plataforma no concede membresía en recursos privados.
 * Ejecuta políticas reales del esquema local; no valida JWT criptográficos ni el servicio alojado. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { as, asAdmin, createDb, createUsers, errorCode, rpc } from "./db.js";

const uid = (n) => `${String(n).padStart(8, "0")}-1515-4000-8000-${String(n).padStart(12, "0")}`;
const OWNER = uid(1), MEMBER = uid(2), FOREIGN = uid(3), OPERATOR = uid(4), GUEST = uid(5);

test("matriz de lectura y revocación: anon dueño miembro ajeno operador invitado y service_role", async () => {
  const db = await createDb();
  try {
    await createUsers(db, [OWNER, MEMBER, FOREIGN, OPERATOR].map((id) => ({ id })).concat({ id: GUEST, anonymous: true }));
    await asAdmin(db);
    await db.query("update public.profiles set role = 'admin' where id = $1", [OPERATOR]);
    await as(db, OWNER);
    const plan = (await rpc(db, "create_plan", ["matrix-20261115", "Plan privado", "", "home", "tmdb-movie-1", JSON.stringify({ title: "Ficticia" }), "{}", "2030-12-01", "20:00", "America/Bogota", "{}", "Organiza"])).create_plan;
    const planToken = (await rpc(db, "create_plan_invite", [plan, 14, null])).create_plan_invite;
    const group = (await rpc(db, "create_group", ["Grupo privado", "Organiza"])).create_group;
    const groupToken = (await rpc(db, "create_group_invite", [group, 14])).create_group_invite;
    const room = await rpc(db, "create_duo_room", ["Organiza", "movie", "CO"]);
    await rpc(db, "save_my_preferences", [JSON.stringify({ region: "CO", genres: ["comedy"] })]);
    await as(db, MEMBER);
    await rpc(db, "accept_plan_invite", [planToken, "Participa"]);
    await rpc(db, "accept_group_invite", [groupToken, "Participa"]);
    await rpc(db, "join_duo_room", [room.code, "Participa"]);

    const resources = [["plans", "id", plan], ["groups", "id", group], ["duo_rooms", "id", room.id]];
    const read = async (expected, label) => {
      for (const [table, key, id] of resources) {
        const { rows } = await db.query(`select ${key} from public.${table} where ${key} = $1`, [id]);
        assert.equal(rows.length, expected, `${label}: ${table}`);
      }
    };
    await as(db);
    for (const [table] of resources) assert.equal(await errorCode(db.query(`select id from public.${table}`)), "42501", `anon: ${table}`);
    for (const [id, visible, label] of [[OWNER, 1, "dueño"], [MEMBER, 1, "miembro"], [FOREIGN, 0, "ajeno"], [OPERATOR, 0, "operador"], [GUEST, 0, "sesión anónima ajena"]]) {
      await as(db, id, { anonymous: id === GUEST });
      await read(visible, label);
      const prefs = await db.query("select user_id from public.user_preferences where user_id = $1", [OWNER]);
      assert.equal(prefs.rows.length, id === OWNER ? 1 : 0, `${label}: preferencias ajenas`);
      assert.equal(await errorCode(db.query("update public.profiles set role = 'admin' where id = $1", [id])), "42501", `${label}: rol no editable`);
    }
    await as(db, OWNER);
    await rpc(db, "remove_plan_member", [plan, MEMBER]);
    await rpc(db, "remove_group_member", [group, MEMBER]);
    await rpc(db, "remove_room_member", [room.id, MEMBER]);
    await as(db, MEMBER);
    await read(0, "miembro revocado");
    assert.equal(await errorCode(rpc(db, "set_plan_rsvp", [plan, "yes"])), "CN404");
    assert.equal(await errorCode(rpc(db, "set_room_preferences", [room.id, "{}"])), "CN404");
    await asAdmin(db);
    await db.query("select set_config('request.jwt.claims', $1, false)", [JSON.stringify({ role: "service_role" })]);
    await db.exec("set role service_role");
    await read(1, "service_role privilegiado");
    assert.equal((await db.query("select user_id from public.user_preferences where user_id = $1", [OWNER])).rows.length, 1);
  } finally {
    await db.close();
  }
});
