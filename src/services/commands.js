import { ACCESS, canAccess } from "../utils/access.js";

/**
 * Comandos de la barra de búsqueda: "/" + nombre. Cada uno declara quién puede usarlo; los que el rol
 * no alcanza ni se ofrecen ni se distinguen de un comando inexistente (no se revela que /admin existe).
 * Un comando solo produce una acción de interfaz (navegar, tema, salir); nunca ejecuta texto del usuario.
 */
export const COMMANDS = Object.freeze([
  { name: "inicio", aliases: ["home"], label: "Inicio", access: ACCESS.PUBLIC, to: "/home" },
  { name: "peliculas", aliases: ["movies", "catalogo"], label: "Películas y series", access: ACCESS.PUBLIC, to: "/movies" },
  { name: "cine", aliases: ["cartelera"], label: "Cine: cartelera y funciones", access: ACCESS.PUBLIC, to: "/cine" },
  { name: "duo", aliases: [], label: "Duo: elegir película en pareja", access: ACCESS.PUBLIC, to: "/duo" },
  { name: "sala", aliases: ["room"], label: "Entrar a una sala Duo: /sala CÓDIGO", access: ACCESS.PUBLIC },
  { name: "planes", aliases: ["plans", "misplanes"], label: "Mis planes", access: ACCESS.PUBLIC, to: "/my-plans" },
  { name: "crear", aliases: ["nuevo", "create"], label: "Crear un plan", access: ACCESS.PUBLIC, to: "/create-plan" },
  { name: "grupos", aliases: ["groups"], label: "Mis grupos", access: ACCESS.PUBLIC, to: "/grupos" },
  { name: "plus", aliases: [], label: "CINET Plus", access: ACCESS.PUBLIC, to: "/plus" },
  { name: "legal", aliases: ["privacidad"], label: "Legal y privacidad", access: ACCESS.PUBLIC, to: "/legal" },
  { name: "dashboard", aliases: ["panel"], label: "Tu dashboard", access: ACCESS.SESSION, to: "/dashboard" },
  { name: "perfil", aliases: ["profile", "ajustes"], label: "Perfil y ajustes", access: ACCESS.SESSION, to: "/profile" },
  { name: "resumen", aliases: ["recap"], label: "Tu año en CINET", access: ACCESS.SESSION, to: "/resumen" },
  { name: "aliados", aliases: ["partner"], label: "Programa de aliados", access: ACCESS.SESSION, to: "/aliados" },
  { name: "admin", aliases: ["administracion"], label: "Administración", access: ACCESS.ADMIN, to: "/admin" },
  { name: "tema", aliases: ["theme"], label: "Cambiar entre modo claro y oscuro", access: ACCESS.PUBLIC, action: "theme" },
  { name: "salir", aliases: ["logout"], label: "Cerrar sesión", access: ACCESS.SESSION, action: "logout" },
]);

// Alfabeto de los códigos de sala (migración new_room_code): sin 0/O/1/I.
const ROOM_CODE = /^[A-HJ-NP-Z2-9]{6}$/;
const GENERIC_MISS = 'No hay un comando con ese nombre. Escribe "/" para ver los disponibles.';

const normalize = (text) => text.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();

/** ¿El texto de la barra es un comando? Solo si empieza por "/" (las rutas "//x" no cuentan). */
export const isCommandInput = (input) => /^\s*\/(?!\/)/.test(String(input ?? ""));

/** Comandos que este usuario puede usar. */
export function availableCommands(user) {
  return COMMANDS.filter((command) => canAccess(command.access, user));
}

function toOption(command) {
  if (command.name === "sala") return { command, action: null }; // necesita argumento: se completa en la barra
  if (command.to) return { command, action: { type: "navigate", to: command.to } };
  return { command, action: { type: command.action } };
}

/**
 * Resuelve el texto de la barra → { options, message }.
 * options: [{ command, action }] con action = { type: "navigate", to } | { type: "theme" } | { type: "logout" } | null.
 */
export function resolveCommand(input, user) {
  const text = String(input ?? "").trim().replace(/^\/+/, "");
  const [rawName = "", ...rest] = text.split(/\s+/);
  const arg = rest.join(" ");
  const name = normalize(rawName);
  const usable = availableCommands(user);

  if (!name || name === "ayuda" || name === "help" || name === "?") return { options: usable.map(toOption), message: null };

  const exact = usable.find((command) => command.name === name || command.aliases.includes(name));
  if (exact) {
    if (exact.name === "sala") {
      const code = arg.replace(/[\s-]/g, "").toUpperCase();
      if (!code) return { options: [], message: "Escribe el código de 6 caracteres: /sala ABC234" };
      if (!ROOM_CODE.test(code)) return { options: [], message: "Ese no es un código de sala válido (6 letras o números, sin 0, O, 1 ni I)." };
      return { options: [{ command: exact, action: { type: "navigate", to: `/duo/sala/${code}` } }], message: null };
    }
    return { options: [toOption(exact)], message: null };
  }

  // Sin coincidencia exacta: prefijo ("/pel" → películas). Solo entre los comandos permitidos.
  const prefixed = usable.filter((command) => [command.name, ...command.aliases].some((alias) => alias.startsWith(name)));
  if (prefixed.length) return { options: prefixed.map(toOption), message: null };
  // Mismo mensaje para "no existe" y "no tienes permiso": no se revela qué comandos reservados hay.
  return { options: [], message: GENERIC_MISS };
}
