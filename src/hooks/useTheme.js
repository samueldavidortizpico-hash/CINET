import { useCallback, useEffect } from "react";
import { useLocalStorage } from "./useLocalStorage.js";

/** Tema claro/oscuro persistido. Oscuro es el tema por defecto de CineHub. */
export function useTheme() {
  const [theme, setTheme] = useLocalStorage("cinehub-theme", "dark");
  const isDark = theme !== "light";

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark);
  }, [isDark]);

  const toggleTheme = useCallback(() => setTheme(isDark ? "light" : "dark"), [isDark, setTheme]);

  return { isDark, toggleTheme };
}
