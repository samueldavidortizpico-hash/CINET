import { useSyncExternalStore } from "react";
import { readStorage, writeStorage } from "../utils/storage.js";

const QUERY = "(prefers-reduced-motion: reduce)";
const KEY = "cinet-less-motion"; // «Menos movimiento» elegido en CINET (este navegador)
const EVENT = "cinet:motion";

const userChoice = () => readStorage(KEY, false) === true;

/** Refleja la elección en <html data-motion> para que el CSS la respete igual que prefers-reduced-motion. */
function applyMotionChoice() {
  if (typeof document !== "undefined") document.documentElement.dataset.motion = userChoice() ? "reduced" : "full";
}
applyMotionChoice();

function subscribe(callback) {
  const media = window.matchMedia(QUERY);
  media.addEventListener("change", callback);
  window.addEventListener(EVENT, callback);
  return () => {
    media.removeEventListener("change", callback);
    window.removeEventListener(EVENT, callback);
  };
}

/** true si el sistema pide menos movimiento o la persona eligió «Menos movimiento» (sin autoplay ni animaciones largas). */
export const usePrefersReducedMotion = () => useSyncExternalStore(subscribe, () => window.matchMedia(QUERY).matches || userChoice());

/** Solo la elección hecha en CINET (el interruptor muestra esto; el sistema se respeta aparte). */
export const useLessMotion = () => useSyncExternalStore(subscribe, userChoice);

export function setLessMotion(on) {
  writeStorage(KEY, Boolean(on));
  applyMotionChoice();
  window.dispatchEvent(new Event(EVENT));
}
