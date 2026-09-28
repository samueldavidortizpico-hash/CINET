import { createContext, useCallback, useMemo } from "react";
import { useLocalStorage } from "../hooks/useLocalStorage.js";
import * as authService from "../services/authService.js";

export const AuthContext = createContext(null);

/** Usuario actual, login/registro/logout y sesión persistida. */
export function AuthProvider({ children }) {
  const [user, setUser] = useLocalStorage("cinehub-session", null);

  const login = useCallback(
    async (credentials) => {
      const session = await authService.login(credentials);
      setUser(session);
      return session;
    },
    [setUser]
  );

  const register = useCallback(
    async (data) => {
      const session = await authService.register(data);
      setUser(session);
      return session;
    },
    [setUser]
  );

  const logout = useCallback(() => setUser(null), [setUser]);

  const value = useMemo(
    () => ({ user, isAuthenticated: Boolean(user), login, register, logout }),
    [user, login, register, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
