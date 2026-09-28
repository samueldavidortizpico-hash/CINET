/* =========================================================
   Punto único de acceso a localStorage.
   - Tolera JSON inválido y valores legacy sin serializar ("dark"):
     devuelve el texto y cada consumidor lo sanea (asHistory, asSession…).
   - Sin almacenamiento (bloqueado, modo privado, cuota llena) guarda en
     memoria: la app sigue funcionando hasta recargar la página.
   - Emite un evento para que todas las instancias de useLocalStorage
     de la pestaña se sincronicen (el evento "storage" nativo solo
     llega a las OTRAS pestañas).
   ========================================================= */

const CHANGE_EVENT = "cinehub:storage";
const memory = new Map(); // valores que no se pudieron escribir en localStorage

function getRaw(key) {
  if (memory.has(key)) return memory.get(key);
  try {
    return globalThis.localStorage?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

export function readStorage(key, fallback) {
  const raw = getRaw(key);
  if (raw === null) return fallback;
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

export function writeStorage(key, value) {
  const raw = JSON.stringify(value);
  try {
    globalThis.localStorage.setItem(key, raw);
    memory.delete(key);
  } catch {
    memory.set(key, raw);
  }
  globalThis.dispatchEvent?.(new CustomEvent(CHANGE_EVENT, { detail: { key } }));
}

/** false si el navegador no deja guardar (lo guardado se pierde al recargar). */
export function isStorageAvailable() {
  try {
    const probe = "cinehub-probe";
    globalThis.localStorage.setItem(probe, probe);
    globalThis.localStorage.removeItem(probe);
    return true;
  } catch {
    return false;
  }
}

/** Suscribe `callback` a cambios de `key`. Devuelve la función de limpieza. */
export function subscribeStorage(key, callback) {
  const onThisTab = (event) => event.detail.key === key && callback();
  const onOtherTab = (event) => event.key === key && callback();

  window.addEventListener(CHANGE_EVENT, onThisTab);
  window.addEventListener("storage", onOtherTab);

  return () => {
    window.removeEventListener(CHANGE_EVENT, onThisTab);
    window.removeEventListener("storage", onOtherTab);
  };
}
