/** Póster SVG de respaldo cuando la imagen de una película no carga. */
export function fallbackPoster({ title, accent = "#b0101d", accent2 = "#111827" }) {
  const safeTitle = String(title ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="900" viewBox="0 0 600 900">
    <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${accent}"/><stop offset="100%" stop-color="${accent2}"/>
    </linearGradient></defs>
    <rect width="600" height="900" fill="#09090b"/>
    <rect width="600" height="900" fill="url(#g)" opacity=".55"/>
    <text x="300" y="420" text-anchor="middle" fill="white" font-size="38" font-family="Arial" font-weight="bold">${safeTitle}</text>
    <text x="300" y="480" text-anchor="middle" fill="white" opacity=".75" font-size="22" font-family="Arial">CINEHUB</text>
  </svg>`;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}
