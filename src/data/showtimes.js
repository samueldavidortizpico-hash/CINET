/* Fechas y cadenas de cine para proponer una salida. CINET no inventa funciones:
   la hora la propone quien organiza y la cartelera real está en el sitio de cada cadena. */

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
