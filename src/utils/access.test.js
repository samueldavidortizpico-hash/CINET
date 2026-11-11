import { test } from "node:test";
import assert from "node:assert/strict";
import { ACCESS, canAccess } from "./access.js";

const user = { id: "u", role: "user" };
const admin = { id: "a", role: "admin" };
const moderator = { id: "m", role: "moderator" };

test("canAccess: público para todos, sesión para quien tenga cuenta, admin solo para admin", () => {
  assert.equal(canAccess(ACCESS.PUBLIC, null), true);
  assert.equal(canAccess(ACCESS.SESSION, null), false);
  assert.equal(canAccess(ACCESS.SESSION, user), true);
  assert.equal(canAccess(ACCESS.ADMIN, null), false);
  assert.equal(canAccess(ACCESS.ADMIN, user), false);
  assert.equal(canAccess(ACCESS.ADMIN, moderator), false);
  assert.equal(canAccess(ACCESS.ADMIN, admin), true);
});

test("canAccess falla cerrado: nivel desconocido, rol raro o invitado con rol admin", () => {
  assert.equal(canAccess("superadmin", admin), false);
  assert.equal(canAccess(undefined, admin), false);
  assert.equal(canAccess(ACCESS.ADMIN, { role: "ADMIN" }), false);
  assert.equal(canAccess(ACCESS.ADMIN, { role: ["admin"] }), false);
  assert.equal(canAccess(ACCESS.ADMIN, { role: "admin", guest: true }), false);
});
