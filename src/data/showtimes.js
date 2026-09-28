/* Cines y horarios disponibles para crear un plan (antes fijos en funciones.html). */

export const CINEMAS = [
  { name: "Cine Colombia", location: "Centro Chía", icon: "🎬" },
  { name: "Cinemark", location: "Fontanar", icon: "🎞️" },
  { name: "Procinal", location: "Unicentro", icon: "🍿" },
];

export const SHOW_TIMES = ["2:30 PM", "5:15 PM", "8:00 PM", "10:30 PM"];

export const WEEKDAYS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

export const MONTHS = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

/**
 * Cadenas de cine de Colombia para comprar boletas (sitios oficiales, verificados el 27-09-2026).
 * Ninguna publica un enlace directo por película que se pueda construir desde el título,
 * así que se abre su cartelera oficial y ahí se busca la película. color: solo decorativo.
 */
export const CINEMA_CHAINS = [
  { id: "cinecolombia", name: "Cine Colombia", initials: "CC", color: "#d7282f", url: "https://www.cinecolombia.com/" },
  { id: "cinemark", name: "Cinemark", initials: "CM", color: "#e4002b", url: "https://www.cinemark.com.co/" },
  { id: "cinepolis", name: "Cinépolis", initials: "CP", color: "#1e3a8a", url: "https://cinepolis.com.co/" },
  { id: "royalfilms", name: "Royal Films", initials: "RF", color: "#8a6d1f", url: "https://cinemasroyalfilms.com/" },
  { id: "procinal", name: "Procinal", initials: "PR", color: "#0f766e", url: "https://www.procinal.com/" },
];
