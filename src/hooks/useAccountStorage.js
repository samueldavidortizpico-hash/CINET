import { useEffect } from "react";
import { readStorage, writeStorage } from "../utils/storage.js";
import { useAuth } from "./useAuth.js";
import { useLocalStorage } from "./useLocalStorage.js";

const VISITOR = "visitor";

/** Account data is isolated by immutable auth user id; legacy values stay with this browser's visitor. */
export function useAccountStorage(name, initialValue, legacyKey) {
  const { user } = useAuth();
  const owner = user && !user.guest ? user.id : VISITOR;
  const key = `cinet:account:${name}:${owner}`;

  // Migrate legacy shared data conservatively: its former owner is unknown, so
  // retain it in the visitor space rather than expose it to the first account.
  useEffect(() => {
    if (owner !== VISITOR || !legacyKey || readStorage(key, undefined) !== undefined) return;
    const legacy = readStorage(legacyKey, undefined);
    if (legacy !== undefined) writeStorage(key, legacy);
  }, [key, legacyKey, owner]);

  return useLocalStorage(key, initialValue);
}
