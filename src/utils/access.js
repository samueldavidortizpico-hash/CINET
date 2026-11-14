/**
 * Quién puede ver qué. Fuente única para los comandos de la barra de búsqueda.
 * Es control de INTERFAZ (decide qué se ofrece): la seguridad real la imponen ProtectedRoute y RLS/RPC en Supabase.
 * Falla cerrado: un nivel desconocido no da acceso a nadie.
 */
export const ACCESS = Object.freeze({ PUBLIC: "public", SESSION: "session", ADMIN: "admin" });

export function canAccess(level, user) {
  if (level === ACCESS.PUBLIC) return true;
  if (!user) return false;
  if (level === ACCESS.SESSION) return true;
  // Las cuentas invitadas (anónimas) nunca son administradoras, aunque su perfil dijera otra cosa.
  if (level === ACCESS.ADMIN) return user.role === "admin" && !user.guest;
  return false;
}
