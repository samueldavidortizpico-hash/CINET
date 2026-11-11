import { test } from "node:test";
import assert from "node:assert/strict";
import { importsForAccount, mergeAccountImports } from "./accountScopedImports.js";

test("AD10: marcas de importación se aíslan por UUID y sobreviven al cambiar A→B→A", () => {
  const withA = mergeAccountImports({}, "account-A", { local1: "remote-A" });
  const withB = mergeAccountImports(withA, "account-B", { local1: "remote-B" });
  assert.deepEqual(importsForAccount(withB, "account-A"), { local1: "remote-A" });
  assert.deepEqual(importsForAccount(withB, "account-B"), { local1: "remote-B" });
  assert.deepEqual(importsForAccount({ local1: "legacy-global" }, "account-A"), {}, "ignora marcas globales antiguas no atribuibles");
});
