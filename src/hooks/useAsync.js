import { useEffect, useRef, useState } from "react";

/**
 * Estado de carga/error de una Promise identificada por `key`.
 * Cuando `key` cambia se vuelve a pedir; con key null no se pide nada.
 * Ignora respuestas tardías (key vieja o componente desmontado).
 */
export function useAsync(key, load) {
  const loadRef = useRef(load);
  const [state, setState] = useState({ key: null, data: undefined, error: null });

  useEffect(() => {
    loadRef.current = load;
  });

  useEffect(() => {
    if (key == null) return undefined;
    let active = true;
    loadRef.current().then(
      (data) => active && setState({ key, data, error: null }),
      (error) => active && setState({ key, data: undefined, error })
    );
    return () => {
      active = false;
    };
  }, [key]);

  const current = key != null && state.key === key;
  return {
    data: current ? state.data : undefined,
    error: current ? state.error : null,
    loading: key != null && !current,
  };
}
