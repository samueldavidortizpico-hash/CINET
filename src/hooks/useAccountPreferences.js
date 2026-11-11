import { useCallback, useState } from "react";
import { useAsync } from "./useAsync.js";
import { useAuth } from "./useAuth.js";
import { accountPreferencesAvailable, getMyPreferences } from "../services/preferencesRepository.js";

/**
 * Gustos guardados de la cuenta actual. La clave incluye el id de la cuenta: al cambiar de cuenta en el
 * mismo navegador nunca se muestran los de la anterior (y nada se guarda en localStorage).
 */
export function useAccountPreferences() {
  const { user } = useAuth();
  const [version, setVersion] = useState(0);
  const key = user && accountPreferencesAvailable() ? `account-prefs-${user.id}-${version}` : null;
  const { data, loading, error } = useAsync(key, getMyPreferences);
  const reload = useCallback(() => setVersion((value) => value + 1), []);
  return { prefs: data ?? null, loading, error, reload, available: Boolean(key) };
}
