import { useCallback } from "react";
import { shareOrCopy } from "../utils/share.js";
import { useToast } from "./useToast.js";

/** Comparte (hoja nativa o portapapeles) y avisa el resultado con un toast. */
export function useShare() {
  const { showToast } = useToast();

  return useCallback(
    async (data) => {
      const result = await shareOrCopy(data);
      if (result === "copied") showToast("🔗 Enlace copiado");
      if (result === "failed") showToast("No se pudo compartir");
    },
    [showToast]
  );
}
