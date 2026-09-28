import { createContext, useCallback, useEffect, useMemo, useState } from "react";

export const ToastContext = createContext(null);

const TOAST_DURATION = 2200;

/** Notificación breve global (favoritos, compartir, cuenta creada…). */
export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(() => setToast(null), TOAST_DURATION);
    return () => clearTimeout(timer); // un toast nuevo reinicia el temporizador
  }, [toast]);

  const showToast = useCallback((text) => setToast({ text, id: Date.now() }), []);
  const value = useMemo(() => ({ toast, showToast }), [toast, showToast]);

  return <ToastContext.Provider value={value}>{children}</ToastContext.Provider>;
}
