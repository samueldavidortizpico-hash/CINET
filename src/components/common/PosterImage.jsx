import { useState } from "react";

/** Póster con respaldo (emoji) si la imagen no existe o no carga. */
export default function PosterImage({ src, alt, fallback = "🎬" }) {
  const [brokenSrc, setBrokenSrc] = useState(null);

  if (!src || brokenSrc === src) return fallback;
  return <img src={src} alt={alt} onError={() => setBrokenSrc(src)} />;
}
