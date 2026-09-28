import { useCallback, useMemo } from "react";
import { DUO_HISTORY_KEY } from "../data/duo.js";
import { asHistory, EMPTY_HISTORY } from "../services/historyService.js";
import { useLocalStorage } from "./useLocalStorage.js";

/**
 * Historial de Duo (vistas, rechazadas, "no me interesa", recientes), compartido
 * con la ficha de cada título y el perfil cinéfilo. change: (historial) => historial.
 */
export function useDuoHistory() {
  const [stored, setStored] = useLocalStorage(DUO_HISTORY_KEY, EMPTY_HISTORY);
  const history = useMemo(() => asHistory(stored), [stored]);
  const change = useCallback((next) => setStored((current) => next(asHistory(current))), [setStored]);
  const reset = useCallback(() => setStored(EMPTY_HISTORY), [setStored]);
  return { history, change, reset };
}
