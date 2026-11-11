import { createContext, useCallback, useEffect, useMemo, useState } from "react";
import * as authService from "../services/authService.js";
import { supabase } from "../services/supabaseClient.js";
import { replaceAvatar } from "../services/avatarService.js";

export const AuthContext = createContext(null);

const RESTORE_ERROR = "No pudimos comprobar tu sesión. Revisa tu conexión y vuelve a intentarlo.";
const RESTORE_SLOW = "Comprobar tu sesión está tardando más de lo normal.";

/** Usuario actual y login/registro/logout. Supabase persiste la sesión entre recargas. */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(Boolean(supabase));
  const [restoreError, setRestoreError] = useState("");

  useEffect(() => {
    if (!supabase) return undefined;
    // Aviso (con reintento) si la comprobación inicial no responde: sin red, Supabase puede tardar mucho.
    const slow = setTimeout(() => setRestoreError((current) => current || RESTORE_SLOW), 10_000);
    // Emite INITIAL_SESSION al suscribirse (sesión guardada) y luego cada login/logout/refresco.
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      clearTimeout(slow);
      setUser(authService.toAppUser(session?.user ?? null));
      setLoading(false);
      if (session) setRestoreError("");
    });
    // Si había sesión guardada pero no se pudo renovar (sin red, servidor caído), el listener emite null:
    // se avisa con un error recuperable en vez de tratarlo como "nunca hubo sesión".
    supabase.auth.getSession().then(({ error }) => error && setRestoreError(RESTORE_ERROR));
    return () => {
      clearTimeout(slow);
      data.subscription.unsubscribe();
    };
  }, []);

  const retryRestore = useCallback(async () => {
    setRestoreError("");
    setLoading(true);
    const { data, error } = await supabase.auth.getSession();
    if (error) setRestoreError(RESTORE_ERROR);
    else setUser(authService.toAppUser(data.session?.user ?? null));
    setLoading(false);
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
      restoreError: user ? "" : restoreError,
      retryRestore,
      accountsAvailable: Boolean(supabase),
      login: authService.login,
      register: authService.register,
      requestPasswordReset: authService.requestPasswordReset,
      updatePassword: authService.updatePassword,
      continueAsGuest: authService.continueAsGuest,
      logout: authService.logout,
    };
  }, [user, userId, loaded, loading, restoreError, retryRestore, saveProfile, saveAvatar]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
