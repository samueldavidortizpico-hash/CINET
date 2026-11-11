import { test } from "node:test";
import assert from "node:assert/strict";
import { COMMANDS, availableCommands, isCommandInput, resolveCommand } from "./commands.js";

const user = { id: "u", role: "user" };
const admin = { id: "a", role: "admin" };
const names = (result) => result.options.map(({ command }) => command.name);
const target = (result) => result.options[0]?.action;

test("isCommandInput: solo '/' simple; '//evil.com' y texto normal no son comandos", () => {
  assert.equal(isCommandInput("/admin"), true);
  assert.equal(isCommandInput("  /sala AB"), true);
  assert.equal(isCommandInput("//evil.com"), false);
  assert.equal(isCommandInput("batman/robin"), false);
  assert.equal(isCommandInput(""), false);
  assert.equal(isCommandInput(null), false);
});

test("sin sesión: solo comandos públicos; /admin, /dashboard y /salir no se ofrecen", () => {
  const all = names(resolveCommand("/", null));
  assert.ok(all.includes("peliculas") && all.includes("cine") && all.includes("tema"));
  for (const hidden of ["admin", "dashboard", "perfil", "salir"]) assert.ok(!all.includes(hidden), hidden);
});

test("/admin: solo el administrador llega; el resto recibe el mismo mensaje que un comando inexistente", () => {
  assert.deepEqual(target(resolveCommand("/admin", admin)), { type: "navigate", to: "/admin" });
  const forUser = resolveCommand("/admin", user);
  const forGuest = resolveCommand("/admin", { id: "g", role: "admin", guest: true });
  const forAnon = resolveCommand("/admin", null);
  const missing = resolveCommand("/xyzzy", user);
  for (const result of [forUser, forGuest, forAnon]) {
    assert.deepEqual(result.options, []);
    assert.equal(result.message, missing.message, "no se distingue 'sin permiso' de 'no existe'");
  }
});

test("ni los alias ni los prefijos filtran comandos reservados", () => {
  assert.deepEqual(resolveCommand("/administracion", user).options, []);
  assert.deepEqual(resolveCommand("/adm", user).options, []);
  assert.deepEqual(resolveCommand("/ADMIN", user).options, []);
  assert.deepEqual(names(resolveCommand("/adm", admin)), ["admin"]);
});

test("el comando '/' lista según el rol: el admin ve más que el usuario", () => {
  assert.ok(availableCommands(admin).length > availableCommands(user).length);
  assert.ok(availableCommands(user).length > availableCommands(null).length);
  assert.ok(!names(resolveCommand("/", user)).includes("admin"));
  assert.ok(names(resolveCommand("/ayuda", admin)).includes("admin"));
});

test("insensible a mayúsculas y tildes; prefijo y alias", () => {
  assert.deepEqual(target(resolveCommand("/PELÍCULAS", null)), { type: "navigate", to: "/movies" });
  assert.deepEqual(target(resolveCommand("/pel", null)), { type: "navigate", to: "/movies" });
  assert.deepEqual(target(resolveCommand("/cartelera", null)), { type: "navigate", to: "/cine" });
});

test("/sala valida el código y nunca arma rutas con texto libre", () => {
  assert.deepEqual(target(resolveCommand("/sala abc-234", null)), { type: "navigate", to: "/duo/sala/ABC234" });
  for (const bad of ["/sala", "/sala 12", "/sala ../../admin", "/sala ABC0O1", "/sala ABC234/../x", "/sala <script>", "/sala ABC2345"]) {
    const result = resolveCommand(bad, null);
    assert.deepEqual(result.options, [], bad);
    assert.ok(result.message, bad);
  }
});

test("las acciones son solo navegar a rutas internas, tema o salir", () => {
  for (const command of COMMANDS) {
    if (command.to) assert.match(command.to, /^\/[a-z-]+$/, command.name);
    else if (command.action) assert.ok(["theme", "logout"].includes(command.action), command.name);
    else assert.equal(command.name, "sala");
  }
});

test("/salir y /tema devuelven acciones sin ruta", () => {
  assert.deepEqual(target(resolveCommand("/salir", user)), { type: "logout" });
  assert.deepEqual(target(resolveCommand("/tema", null)), { type: "theme" });
  assert.deepEqual(resolveCommand("/salir", null).options, []);
});
