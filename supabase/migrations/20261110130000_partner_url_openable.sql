-- =========================================================
-- El sitio oficial de un aliado debe poder abrirse en el navegador.
--
-- Contexto (auditoría 2026-11-10): organizations.official_url solo exigía `^https://`, pero el
-- analizador de URL del navegador es más estricto. `https://a|b.com`, `https://a%zz.com` o
-- `https://a:99999999/x` pasaban la base y hacían lanzar `new URL()` en el render de /admin: una
-- sola solicitud así dejaba la cola de verificación inutilizable. Además se aceptaban credenciales
-- embebidas (`https://cinecolombia.com@sitio-malo.example`), un clásico de la suplantación.
--
-- organizations solo se escribe por RPC security definer (authenticated tiene SELECT y nada más),
-- así que el punto de control es request_organization; no hace falta una restricción CHECK, que
-- además se reevaluaría en cada UPDATE de verify_organization sobre filas ya existentes.
-- (La interfaz también se protege: src/utils/url.js nunca lanza.)
-- =========================================================

create function public.is_openable_https_url(p_url text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  -- Host: sin espacios ni control ni / ? # @ : | ^ % < > " { } [ ] ` (el backslash se descarta aparte).
  -- Puerto opcional 0–65535, y luego ruta, consulta o fragmento sin espacios.
  select p_url ~ '^https://[^][:space:][:cntrl:][/?#@:|^%<>"{}`]+(:([0-9]{1,4}|[1-5][0-9]{4}|6[0-4][0-9]{3}|65[0-4][0-9]{2}|655[0-2][0-9]|6553[0-5]))?([/?#][^[:space:][:cntrl:]]*)?$'
    and strpos(p_url, chr(92)) = 0
    and char_length(p_url) <= 300;
$$;

revoke execute on function public.is_openable_https_url(text) from public, anon, authenticated;

-- Igual que la versión anterior (20261014120000_partners.sql) más la comprobación de la URL.
-- create or replace conserva los permisos ya concedidos a authenticated.
create or replace function public.request_organization(p_name text, p_kind text, p_official_url text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_id uuid;
begin
  if v_uid is null then perform public.cinet_fail('CN403', 'Inicia sesión para solicitar una cuenta de aliado.'); end if;
  if public.is_guest() then perform public.cinet_fail('CN403', 'Crea una cuenta para solicitar una cuenta de aliado.'); end if;
  if (select count(*) from public.organizations where created_by = v_uid and status = 'pending') >= 3 then
    perform public.cinet_fail('CN429', 'Ya tienes 3 solicitudes pendientes.');
  end if;
  if not coalesce(public.is_openable_https_url(btrim(p_official_url)), false) then
    perform public.cinet_fail('CN422', 'Revisa el nombre, el tipo y que el sitio oficial sea una dirección https:// válida, sin usuario ni contraseña.');
  end if;
  begin
    insert into public.organizations (name, kind, official_url, created_by) values (btrim(p_name), p_kind, btrim(p_official_url), v_uid) returning id into v_id;
  exception when check_violation then
    perform public.cinet_fail('CN422', 'Revisa el nombre, el tipo y que el sitio oficial empiece por https://.');
  end;
  insert into public.org_members (org_id, user_id, role) values (v_id, v_uid, 'admin');
  return v_id;
end;
$$;
