import { createContext, useCallback, useEffect, useMemo, useState } from "react";
import * as authService from "../services/authService.js";
import { supabase } from "../services/supabaseClient.js";
import { replaceAvatar } from "../services/avatarService.js";

export const AuthContext = createContext(null);

/** Usuario actual y login/registro/logout. Supabase persiste la sesión entre recargas. */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(Boolean(supabase));

  useEffect(() => {
    if (!supabase) return undefined;
    // Emite INITIAL_SESSION al suscribirse (sesión guardada) y luego cada login/logout/refresco.
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(authService.toAppUser(session?.user ?? null));
      setLoading(false);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  // Perfil (role incluido) aparte del listener: Supabase desaconseja pedir datos dentro de él.
  // userId marca de qué cuenta es el resultado, para no mezclar perfiles al cambiar de sesión.
  const [loaded, setLoaded] = useState({ userId: null, profile: null, error: "" });
  const userId = user?.id;
  useEffect(() => {
    if (!userId) return undefined;
    let active = true;
    authService
      .getProfile(userId)
      .then((profile) => active && setLoaded({ userId, profile, error: "" }))
      .catch((error) => active && setLoaded({ userId, profile: null, error: error.message }));
    return () => {
      active = false;
    };
  }, [userId]);

  const saveProfile = useCallback(
    async (values) => {
      const profile = await authService.updateProfile(userId, values);
      setLoaded({ userId, profile, error: "" });
      return profile;
    },
    [userId]
  );

  // Solo sincroniza el perfil; los listeners y flujos de Auth permanecen iguales.
  const saveAvatar = useCallback(async (file) => {
    const result = await replaceAvatar(supabase, userId, file);
    setLoaded({ userId, profile: result.profile, error: "" });
    return result;
  }, [userId]);

  const value = useMemo(() => {
    const current = userId && loaded.userId === userId ? loaded : null;
    const profile = current?.profile ?? null;
    return {
      // role solo decide qué se muestra; lo que protege los datos es RLS en la base.
      user: user && {
        ...user,
        name: profile?.display_name || profile?.username || user.name,
        avatarUrl: profile?.avatar_url ?? null,
        role: profile?.role ?? "user",
      },
      profile,
      profileLoading: Boolean(userId) && !current,
      profileError: current?.error ?? "",
      saveProfile,
      saveAvatar,
      isAuthenticated: Boolean(user),
      loading,
      login: authService.login,
      register: authService.register,
      logout: authService.logout,
    };
  }, [user, userId, loaded, loading, saveProfile, saveAvatar]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
