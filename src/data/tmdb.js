/* Tablas compartidas para hablar con TMDB: géneros, regiones e idiomas.
   `key` es el id estable de CineHub; `movie`/`tv` son los ids de género de TMDB
   (null = TMDB no tiene ese género para series); `local` es el genreFilter del catálogo. */

export const GENRES = [
  { key: "action", label: "Acción", movie: 28, tv: 10759, local: "accion" },
  { key: "adventure", label: "Aventura", movie: 12, tv: 10759, local: "aventura" },
  { key: "animation", label: "Animación", movie: 16, tv: 16, local: "animacion" },
  { key: "comedy", label: "Comedia", movie: 35, tv: 35, local: "comedia" },
  { key: "drama", label: "Drama", movie: 18, tv: 18, local: "drama" },
  { key: "science-fiction", label: "Ciencia ficción", movie: 878, tv: 10765, local: "ciencia-ficcion" },
  { key: "fantasy", label: "Fantasía", movie: 14, tv: 10765 },
  { key: "horror", label: "Terror", movie: 27, tv: null, local: "terror" },
  { key: "thriller", label: "Suspenso", movie: 53, tv: null },
  { key: "crime", label: "Crimen", movie: 80, tv: 80 },
  { key: "mystery", label: "Misterio", movie: 9648, tv: 9648 },
  { key: "romance", label: "Romance", movie: 10749, tv: null },
  { key: "family", label: "Familiar", movie: 10751, tv: 10751 },
  { key: "documentary", label: "Documental", movie: 99, tv: 99 },
];

// Géneros de series que agrupan dos de CineHub.
const TV_LABELS = { 10759: "Acción y aventura", 10765: "Ciencia ficción y fantasía" };

export function genreLabel(type, tmdbGenreId) {
  if (type === "tv" && TV_LABELS[tmdbGenreId]) return TV_LABELS[tmdbGenreId];
  return GENRES.find((genre) => genre[type] === tmdbGenreId)?.label ?? null;
}

export function genreKeysFor(type, tmdbGenreIds) {
  return GENRES.filter((genre) => tmdbGenreIds.includes(genre[type])).map((genre) => genre.key);
}

export const REGIONS = [
  { code: "CO", name: "Colombia" },
  { code: "MX", name: "México" },
  { code: "AR", name: "Argentina" },
  { code: "CL", name: "Chile" },
  { code: "PE", name: "Perú" },
  { code: "ES", name: "España" },
  { code: "US", name: "Estados Unidos" },
];

export const regionName = (code) => REGIONS.find((region) => region.code === code)?.name ?? code;

export const LANGUAGES = [
  { code: "es", name: "español" },
  { code: "en", name: "inglés" },
  { code: "ko", name: "coreano" },
  { code: "ja", name: "japonés" },
  { code: "fr", name: "francés" },
];
