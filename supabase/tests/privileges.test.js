/* Regresión de privilegios: una migración nueva no puede dejar tablas, funciones o vistas
   abiertas a anon/authenticated. Detalle y severidades en scripts/audit-db-privileges.mjs. */
import assert from "node:assert/strict";
import test from "node:test";
import { auditDatabase } from "../../scripts/audit-db-privileges.mjs";

test("ninguna tabla, función o vista de public queda abierta por los default privileges de Supabase", async () => {
  const { findings } = await auditDatabase();
  const actionable = findings.filter((finding) => finding.severity !== "INFO");
  assert.deepEqual(
    actionable.map((finding) => `[${finding.severity}] ${finding.object}: ${finding.message}`),
    [],
    "Añade `revoke all ... from public, anon, authenticated` (tablas) o `revoke execute ... from public, anon, authenticated` (funciones) y concede solo lo necesario."
  );
});
