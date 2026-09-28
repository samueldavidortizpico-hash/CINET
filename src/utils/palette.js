/* =========================================================
   CINEHUB — DYNAMIC PALETTE
   Extrae la paleta dominante de un poster mediante Canvas.
   Sin dependencias. Cache por URL del póster.
   ========================================================= */

const _cache = new Map();
const SZ = 32; // 32x32 = 1024 px — rapido y suficiente

const FALLBACK = { primary: '#e50914', secondary: '#8c0a14' };

/**
 * Extrae { primary, secondary } en hex desde una imagen.
 * @param {string} src URL del póster
 * @returns {Promise<{primary: string, secondary: string}>}
 */
export async function extractPalette(src) {
  // Ignorar placeholder (GIF de 1x1 transparente)
  if (!src || src.startsWith('data:image/gif')) return FALLBACK;
  if (_cache.has(src)) return _cache.get(src);

  const result = await _sample(src);
  _cache.set(src, result);
  return result;
}

/* --- muestreo --- */

function _sample(src) {
  return new Promise(resolve => {
    const tmp = new Image();
    tmp.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = SZ;
      canvas.height = SZ;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      try {
        ctx.drawImage(tmp, 0, 0, SZ, SZ);
        resolve(_analyze(ctx.getImageData(0, 0, SZ, SZ).data));
      } catch {
        resolve(FALLBACK);
      }
    };
    tmp.onerror = () => resolve(FALLBACK);
    tmp.src = src;
  });
}

/* --- analisis de pixeles --- */

function _analyze(data) {
  // 36 buckets de 10 grados (cubre 360 de tono)
  const B = Array.from({ length: 36 }, () => ({ n: 0, r: 0, g: 0, b: 0, w: 0 }));

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];
    if (a < 100) continue;
    const [h, s, v] = _hsv(r, g, b);
    // Filtrar: muy desaturado, muy oscuro, o quemado
    if (s < 0.18 || v < 0.12 || v > 0.95) continue;
    const bi = Math.floor(h / 10) % 36;
    const w = s * v;
    B[bi].n++; B[bi].r += r; B[bi].g += g; B[bi].b += b; B[bi].w += w;
  }

  const sorted = B
    .map((b, i) => ({ ...b, i }))
    .filter(b => b.n > 0)
    .sort((a, b) => b.w - a.w);

  if (!sorted.length) return FALLBACK;

  const primary = _vivid(_avg(sorted[0]));

  // Secundario: hue separado >50 grados
  const secBucket = sorted.find(b => {
    const d = Math.abs(b.i - sorted[0].i) * 10;
    return Math.min(d, 360 - d) > 50;
  });
  const secondary = secBucket
    ? _vivid(_avg(secBucket))
    : _complement(primary);

  return { primary, secondary };
}

/* --- utilidades de color --- */

function _avg(b) {
  return [Math.round(b.r / b.n), Math.round(b.g / b.n), Math.round(b.b / b.n)];
}

function _vivid([r, g, b]) {
  const [h, s, v] = _hsv(r, g, b);
  const sv = Math.min(s * 1.3, 1);
  const vv = Math.min(0.88, Math.max(0.45, v));
  return _hex(..._fromHsv(h, sv, vv));
}

function _complement(hex) {
  const n = parseInt(hex.slice(1), 16);
  const [h, s, v] = _hsv((n >> 16) & 255, (n >> 8) & 255, n & 255);
  return _hex(..._fromHsv((h + 180) % 360, s, v));
}

/* --- conversiones HSV --- */

function _hsv(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  const v = max;
  const s = max ? d / max : 0;
  let h = 0;
  if (d) {
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) * 60;
    else if (max === g) h = ((b - r) / d + 2) * 60;
    else h = ((r - g) / d + 4) * 60;
  }
  return [h, s, v];
}

function _fromHsv(h, s, v) {
  const i = Math.floor(h / 60) % 6;
  const f = h / 60 - Math.floor(h / 60);
  const p = v * (1 - s), q = v * (1 - f * s), t = v * (1 - (1 - f) * s);
  const m = [[v, t, p], [q, v, p], [p, v, t], [p, q, v], [t, p, v], [v, p, q]][i];
  return m.map(c => Math.round(c * 255));
}

function _hex(r, g, b) {
  return '#' + [r, g, b].map(c => c.toString(16).padStart(2, '0')).join('');
}
