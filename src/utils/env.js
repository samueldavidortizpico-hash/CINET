/* Variables de entorno del cliente, leídas clave por clave.
   Nunca uses import.meta.env como objeto (ni import.meta.env?.X): Vite incrustaría TODAS las
   variables VITE_* en el bundle público. El build falla si un secreto llega al bundle (vite.config.js).
   En Node (pruebas y scripts) import.meta.env no existe: los valores quedan vacíos. */
function read() {
  try {
    return {
      BASE_URL: import.meta.env.BASE_URL,
      TMDB_API_URL: import.meta.env.VITE_TMDB_API_URL,
      SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
      SUPABASE_KEY: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY, // clave publicable: pensada para el navegador
      ANALYTICS_ENDPOINT: import.meta.env.VITE_ANALYTICS_ENDPOINT,
    };
  } catch {
    return {};
  }
}

export const clientEnv = read();
