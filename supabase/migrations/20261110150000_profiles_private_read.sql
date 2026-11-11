-- =========================================================
-- profiles: cada cuenta lee solo su propio perfil.
--
-- Contexto (auditoría 2026-11-10): la política "Perfiles visibles para todos" dejaba que cualquiera,
-- incluso sin sesión y solo con la clave pública, hiciera `GET /rest/v1/profiles?select=*` y obtuviera
-- el nombre, el usuario, el avatar y la biografía de TODAS las cuentas, y `?role=eq.admin` para
-- localizar a los administradores (la lista de objetivos de un ataque dirigido).
-- Son datos personales sin ninguna función en la app: authService solo lee y actualiza el perfil
-- propio (.eq("id", <mi id>)), y is_platform_admin() es security definer y no necesita este permiso.
--
-- El comentario original ("restringir a authenticated si deja de ser así") ya anticipaba esto.
-- Cuando existan funciones sociales (reseñas, amistades) se añade una política o una RPC con el
-- alcance exacto que haga falta: ahí sí se decide qué campos se exponen y a quién.
-- =========================================================

drop policy "Perfiles visibles para todos" on public.profiles;

create policy "Cada cuenta ve solo su perfil"
  on public.profiles for select
  to authenticated
  using ((select auth.uid()) = id);

-- Sin sesión no hay lectura: se retira también el privilegio (segunda barrera además de RLS).
revoke select on table public.profiles from anon;
