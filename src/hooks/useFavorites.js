import { useCallback, useMemo } from "react";
import { useLocalStorage } from "./useLocalStorage.js";
import { useToast } from "./useToast.js";

export function useFavorites() {
  const [stored, setFavorites] = useLocalStorage("cinehub-favorites", []);
  const { showToast } = useToast();
  const favorites = useMemo(() => (Array.isArray(stored) ? stored : []), [stored]);

  const isFavorite = useCallback((id) => favorites.includes(id), [favorites]);

  const toggleFavorite = useCallback(
    (id) => {
      const adding = !favorites.includes(id);
      setFavorites((list) => {
        const current = Array.isArray(list) ? list : [];
        return adding ? [...current, id] : current.filter((favorite) => favorite !== id);
      });
      showToast(adding ? "❤️ Añadida a favoritos" : "Película eliminada de favoritos");
    },
    [favorites, setFavorites, showToast]
  );

  return { favorites, isFavorite, toggleFavorite };
}
