/* =========================================================
   Auditoría de privilegios de la base de datos (reproducible, sin red ni .env).

   Aplica TODAS las migraciones en un PostgreSQL real en memoria (PGlite) y le
   pregunta al propio Postgres qué pueden hacer `anon` y `authenticated` sobre
   cada tabla, función y vista de `public`.

   El arnés (supabase/tests/db.js) replica los "default privileges" de Supabase:
   todo objeto nuevo de `public` nace con ALL para anon/authenticated. Por eso
   un `revoke ... from public` NO basta: hay que revocar también a anon/authenticated.

   Severidades:
     CRITICO  tabla sin RLS accesible por anon/authenticated
     ALTO     escritura abierta: política permisiva para anon, SECURITY DEFINER sin search_path, vista que salta RLS
     MEDIO    falta el revoke (RLS lo frena hoy; una política mal escrita mañana lo abriría)
     BAJO     grant de más sin efecto práctico
     INFO     solo para revisar a mano

   Uso:  node scripts/audit-db-privileges.mjs          informe legible
         node scripts/audit-db-privileges.mjs --json   salida para otras herramientas
   Código de salida 1 si hay algún hallazgo distinto de INFO.
   ========================================================= */
import { pathToFileURL } from "node:url";
import { createDb } from "../supabase/tests/db.js";

const ORDER = ["CRITICO", "ALTO", "MEDIO", "BAJO", "INFO"];

/** Audita las migraciones actuales y devuelve { stats, published, findings }. */
export async function auditDatabase() {
  const db = await createDb();
  const rows = async (sql) => (await db.query(sql)).rows;
  const findings = [];
  const add = (severity, object, message) => findings.push({ severity, object, message });

  // ---------- Tablas ----------
  const tables = await rows(`
    select c.relname as name, c.relrowsecurity as rls,
      has_table_privilege('anon', c.oid, 'select') as anon_select,
      has_table_privilege('anon', c.oid, 'insert') or has_table_privilege('anon', c.oid, 'update')
        or has_table_privilege('anon', c.oid, 'delete') or has_table_privilege('anon', c.oid, 'truncate') as anon_write,
      has_table_privilege('authenticated', c.oid, 'select') as auth_select,
      has_table_privilege('authenticated', c.oid, 'insert') or has_table_privilege('authenticated', c.oid, 'update')
        or has_table_privilege('authenticated', c.oid, 'delete') or has_table_privilege('authenticated', c.oid, 'truncate') as auth_write
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r' order by c.relname`);
  const policies = await rows(`select tablename, cmd, roles::text as roles, policyname from pg_policies where schemaname = 'public'`);
  const writePolicyForAnon = (table) =>
    policies.some((p) => p.tablename === table && p.cmd !== "SELECT" && /\b(public|anon)\b/.test(p.roles));
  const selectPolicies = (table) => policies.filter((p) => p.tablename === table && (p.cmd === "SELECT" || p.cmd === "ALL"));

  for (const t of tables) {
    const id = `tabla ${t.name}`;
    if (!t.rls) {
      if (t.anon_select || t.anon_write || t.auth_select || t.auth_write) {
        add("CRITICO", id, "Sin RLS y con privilegios para anon/authenticated: cualquiera con la clave pública la lee o la escribe.");
      }
      continue;
    }
    if (t.anon_write) {
      if (writePolicyForAnon(t.name)) add("ALTO", id, "Política de escritura aplicable a anon: cualquiera sin sesión podría escribir.");
      else add("MEDIO", id, "anon conserva INSERT/UPDATE/DELETE/TRUNCATE. RLS lo frena hoy, pero falta `revoke all ... from public, anon, authenticated`.");
    }
    if (t.auth_write && !t.anon_write && selectPolicies(t.name).length === 0 && !policies.some((p) => p.tablename === t.name)) {
      add("MEDIO", id, "authenticated conserva escritura y la tabla no tiene ninguna política: debería ser solo service_role.");
    }
    if ((t.anon_select || t.auth_select) && !policies.some((p) => p.tablename === t.name)) {
      add("BAJO", id, "RLS sin políticas deniega todo (correcto), pero conserva el grant SELECT; mejor revocarlo.");
    }
    if (t.auth_write && policies.some((p) => p.tablename === t.name)) {
      add("INFO", id, "authenticated escribe directo a la tabla; confirma que sus políticas lo limitan a lo propio.");
    }
  }

  // ---------- Funciones ----------
  const fns = await rows(`
    select p.proname as name, pg_get_function_identity_arguments(p.oid) as args, p.prosecdef as secdef,
      coalesce(array_to_string(p.proconfig, ','), '') as config,
      has_function_privilege('anon', p.oid, 'execute') as anon_exec
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.prokind = 'f' order by p.proname`);
  for (const f of fns) {
    const id = `función ${f.name}(${f.args})`;
    if (f.secdef && !/search_path=/.test(f.config)) {
      add("ALTO", id, "SECURITY DEFINER sin search_path fijo: se puede secuestrar con un objeto homónimo en otro esquema.");
    }
    if (f.secdef && f.anon_exec) {
      add("INFO", id, "Ejecutable sin sesión (anon). Debe ser deliberado: confirma que no devuelve datos ajenos.");
    }
  }

  // ---------- Vistas ----------
  const views = await rows(`
    select c.relname as name, coalesce(array_to_string(c.reloptions, ','), '') as opts,
      has_table_privilege('anon', c.oid, 'select') or has_table_privilege('authenticated', c.oid, 'select') as readable
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind in ('v', 'm')`);
  for (const v of views) {
    if (v.readable && !/security_invoker/.test(v.opts)) add("ALTO", `vista ${v.name}`, "Vista sin security_invoker: ignora el RLS de las tablas que lee.");
  }

  const published = (await rows(`select tablename from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' order by 1`)).map((r) => r.tablename);
  await db.close();
  findings.sort((a, b) => ORDER.indexOf(a.severity) - ORDER.indexOf(b.severity));
  return { stats: { tables: tables.length, functions: fns.length, views: views.length }, published, findings };
}

// ---------- CLI ----------
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { stats, published, findings } = await auditDatabase();
  if (process.argv.includes("--json")) {
    console.log(JSON.stringify({ stats, published, findings }, null, 2));
  } else {
    console.log(`Tablas: ${stats.tables} · Funciones: ${stats.functions} · Vistas: ${stats.views}`);
    console.log(`Realtime publica: ${published.join(", ") || "nada"}\n`);
    const actionable = findings.filter((f) => f.severity !== "INFO");
    console.log(actionable.length ? "HALLAZGOS:" : "Sin hallazgos accionables.");
    for (const f of actionable) console.log(`  [${f.severity}] ${f.object}\n      ${f.message}`);
    const info = findings.filter((f) => f.severity === "INFO");
    if (info.length) {
      console.log(`\nPara revisar a mano (${info.length}; no son fallos):`);
      for (const f of info) console.log(`  [INFO] ${f.object} — ${f.message}`);
    }
  }
  process.exit(findings.some((f) => f.severity !== "INFO") ? 1 : 0);
}
