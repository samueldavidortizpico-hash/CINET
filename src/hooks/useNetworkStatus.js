import { useSyncExternalStore } from "react";

// Escucha online/offline; useSyncExternalStore llama al cleanup al desmontar.
function subscribe(callback) {
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);
  return () => {
    window.removeEventListener("online", callback);
    window.removeEventListener("offline", callback);
  };
}

/** true si el navegador tiene conexión (navigator.onLine). */
export function useNetworkStatus() {
  return useSyncExternalStore(subscribe, () => navigator.onLine, () => true);
}
