import { useCallback, useEffect, useRef, useState } from "react";
import { readStorage, subscribeStorage, writeStorage } from "../utils/storage.js";

/**
 * Estado de React respaldado por localStorage.
 * Todas las instancias que usan la misma clave se mantienen sincronizadas
 * (misma pestaña y otras pestañas) mediante una suscripción con cleanup.
 */
export function useLocalStorage(key, initialValue) {
  const initialRef = useRef(initialValue);
  const [state, setState] = useState(() => ({ key, value: readStorage(key, initialValue) }));
  // Al cambiar de clave (por ejemplo, al iniciar/cerrar sesión), nunca renderizar
  // el valor que pertenecía a la clave anterior durante un frame.
  const value = state.key === key ? state.value : readStorage(key, initialValue);

  useEffect(() => {
    const sync = () => setState({ key, value: readStorage(key, initialRef.current) });
    sync();
    return subscribeStorage(key, sync); // cleanup: elimina los listeners
  }, [key]);

  // Acepta un valor o una función (valorActual) => valorNuevo, como useState.
  const update = useCallback(
    (next) => {
      const current = readStorage(key, initialRef.current);
      writeStorage(key, typeof next === "function" ? next(current) : next);
    },
    [key]
  );

  return [value, update];
}
