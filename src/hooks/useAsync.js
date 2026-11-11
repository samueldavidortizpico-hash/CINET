import { useEffect, useRef, useState } from "react";

/**
 * Estado de carga/error de una Promise identificada por `key`.
 * Cuando `key` cambia se vuelve a pedir; con key null no se pide nada.
 * Ignora respuestas tardías (key vieja o componente desmontado) y avisa a `load(signal)`
 * con un AbortSignal para que deje de lanzar trabajo que ya nadie espera.
 */
export function useAsync(key, load) {
  const loadRef = useRef(load);
  const [state, setState] = useState({ key: null, data: undefined, error: null });

  useEffect(() => {
    loadRef.current = load;
  });

  useEffect(() => {
    if (key == null) return undefined;
    const controller = new AbortController();
    loadRef.current(controller.signal).then(
      (data) => !controller.signal.aborted && setState({ key, data, error: null }),
      (error) => !controller.signal.aborted && setState({ key, data: undefined, error })
    );
    return () => controller.abort();
  }, [key]);

  const current = key != null && state.key === key;
  return {
    data: current ? state.data : undefined,
    error: current ? state.error : null,
    loading: key != null && !current,
  };
}
