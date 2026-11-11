-- =========================================================
-- Cierra los privilegios por defecto de las tablas de Plus / cobros.
--
-- Contexto (auditoría 2026-11-10): Supabase concede ALL sobre toda tabla nueva de
-- `public` a anon y authenticated. Los demás módulos (planes, salas, grupos,
-- aliados, preferencias) lo revocan al crearlas; billing_config, billing_events y
-- entitlements (20261015120000_plus_sandbox.sql) se quedaron sin ese revoke.
--
-- No era explotable: RLS está activo y solo existen políticas SELECT, así que
-- escribir falla (INSERT con 42501, UPDATE/DELETE sin filas). Pero la única barrera
-- era RLS: una política `for all` escrita por error habría dejado a cualquiera sin
-- sesión editando derechos de pago. Con esta migración vuelven a ser dos barreras:
-- privilegios (aquí) y RLS (allí). service_role no se toca: apply_billing_event
-- sigue funcionando.
-- =========================================================

revoke all on table public.billing_config, public.billing_events, public.entitlements
  from public, anon, authenticated;

-- Solo la lectura que la app necesita (ya la limitan las políticas RLS):
--   billing_config: la interfaz lee si el sandbox está encendido (pública).
--   entitlements:   cada cuenta lee sus propios derechos.
--   billing_events: ninguna; solo service_role.
grant select on table public.billing_config to anon, authenticated;
grant select on table public.entitlements to authenticated;
