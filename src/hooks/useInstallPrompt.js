import { useSyncExternalStore } from "react";

/*
 * Instalación de la PWA como opción DESPUÉS de experimentar valor: el navegador avisa con
 * beforeinstallprompt (Chromium/Android); lo guardamos y la app ofrece instalar cuando tiene sentido.
 * Safari (iOS) no emite el evento: ahí no se muestra ningún botón (no se finge una instalación).
 * Se escucha al importar el módulo (main.jsx lo importa al arrancar) para no perder el evento.
 */
let deferred = null;
const listeners = new Set();
const notify = () => listeners.forEach((listener) => listener());

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferred = event;
    notify();
  });
  window.addEventListener("appinstalled", () => {
    deferred = null;
    notify();
  });
}

const subscribe = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

/** → función que abre el diálogo de instalación del navegador, o null si no está disponible. */
export function useInstallPrompt() {
  const event = useSyncExternalStore(subscribe, () => deferred, () => null);
  if (!event) return null;
  return async () => {
    event.prompt();
    const { outcome } = await event.userChoice;
    deferred = null;
    notify();
    return outcome; // "accepted" | "dismissed"
  };
}
