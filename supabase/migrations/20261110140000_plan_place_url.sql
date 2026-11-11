-- =========================================================
-- plans.place.url: solo un https válido y sin credenciales.
--
-- Contexto (auditoría 2026-11-10): `place` solo exigía ser un objeto JSON de ≤1000 bytes. La base
-- guardaba cualquier cosa en `place.url`: `javascript:`, `http://` o
-- `https://cinecolombia.com@sitio-falso.example/` (muestra un dominio y lleva a otro). La página del plan
-- lo presenta como «sitio oficial» del cine a cada invitado, que confía en quien lo invitó: phishing.
-- React 19 neutraliza `javascript:`, pero eso es una red de seguridad del framework, no una validación.
--
-- Se valida con un trigger y no dentro de create_plan: place se escribe en create_plan y se copia al
-- repetir o compartir un plan; el trigger cubre todos los caminos sin reescribir RPC ajenas.
-- Solo se evalúa en INSERT o cuando place cambia: cancelar o editar un plan antiguo no se bloquea.
-- Usa public.is_openable_https_url (20261110130000_partner_url_openable.sql).
-- =========================================================

create function public.plans_check_place()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Un UPDATE que no toca place (cancelar, editar el nombre) no se revalida: no bloquea planes antiguos.
  if tg_op = 'UPDATE' and new.place is not distinct from old.place then return new; end if;
  if new.place ? 'url' and (
       jsonb_typeof(new.place -> 'url') is distinct from 'string'
       or not coalesce(public.is_openable_https_url(new.place ->> 'url'), false)
     ) then
    perform public.cinet_fail('CN422', 'El enlace del lugar debe ser una dirección https:// válida, sin usuario ni contraseña.');
  end if;
  return new;
end;
$$;

revoke execute on function public.plans_check_place() from public, anon, authenticated;

create trigger plans_check_place
  before insert or update of place on public.plans
  for each row
  execute function public.plans_check_place();
