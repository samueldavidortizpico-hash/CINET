import { useSyncExternalStore } from "react";

const QUERY = "(prefers-reduced-motion: reduce)";

function subscribe(callback) {
  const media = window.matchMedia(QUERY);
  media.addEventListener("change", callback);
  return () => media.removeEventListener("change", callback);
}

/** true si el sistema pide menos movimiento (sin autoplay ni animaciones largas). */
export const usePrefersReducedMotion = () => useSyncExternalStore(subscribe, () => window.matchMedia(QUERY).matches);
