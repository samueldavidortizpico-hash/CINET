/* =========================================================
   supabaseClient — único punto de acceso a Supabase.
   Solo usa la clave publicable (pensada para el navegador);
   la seguridad de los datos la ponen las políticas RLS.
   Nunca uses aquí service_role ni Secret Keys.
   ========================================================= */

import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

// Sin variables la app sigue funcionando; solo las cuentas quedan desactivadas.
if (!url || !key) {
  console.warn("Supabase desactivado: faltan VITE_SUPABASE_URL o VITE_SUPABASE_PUBLISHABLE_KEY en .env.local");
}

export const supabase = url && key ? createClient(url, key) : null;
