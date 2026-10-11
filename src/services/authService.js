/* =========================================================
   authService — cuentas con Supabase Auth.
   Supabase guarda y verifica las contraseñas; aquí nunca se
   almacenan. El nombre viaja en user_metadata (sin tabla propia).
   ========================================================= */

import { supabase } from "./supabaseClient.js";

const MESSAGES = {
  invalid_credentials: "Correo o contraseña incorrectos.",
  email_not_confirmed: "Confirma tu correo antes de iniciar sesión (revisa tu bandeja de entrada).",
  user_already_exists: "Ya existe una cuenta con ese correo.",
  weak_password: "La contraseña es demasiado débil.",
  over_email_send_rate_limit: "Demasiados intentos. Espera unos minutos y vuelve a probar.",
  over_request_rate_limit: "Demasiados intentos. Espera unos minutos y vuelve a probar.",
  same_password: "La nueva contraseña debe ser distinta de la anterior.",
  session_not_found: "El enlace caducó o ya se usó. Pide uno nuevo.",
  otp_expired: "El enlace caducó o ya se usó. Pide uno nuevo.",
  reauthentication_needed: "Por seguridad, vuelve a iniciar sesión y repite el cambio.",
  signup_disabled: "El registro de cuentas nuevas está cerrado ahora mismo.",
  email_address_invalid: "Ese correo no es válido.",
};

const appUrl = (path = "") => `${window.location.origin}${import.meta.env.BASE_URL}${path}`;

function toError(error) {
  return new Error(MESSAGES[error.code] ?? "No pudimos conectar con el servidor. Inténtalo de nuevo.");
}

function client() {
  if (!supabase) throw new Error("Las cuentas no están disponibles ahora mismo.");
  return supabase;
}

/**
 * Usuario de Supabase → forma que usa la app ({ id, name, email, guest }).
 * Un invitado (Auth anónima) no tiene email y nunca se trata como cuenta permanente.
 */
export const toAppUser = (user) =>
  user && {
    id: user.id,
    email: user.email || null,
    guest: Boolean(user.is_anonymous),
    name: user.user_metadata?.name || user.email?.split("@")[0] || "Invitado",
  };

/**
 * Entrar como invitado (sin email) para unirse a una sala o a un plan con enlace; no puede crear.
 * Requiere habilitar "Anonymous sign-ins" en Supabase. La sesión vive solo en este navegador:
 * al cerrarla o borrar los datos del navegador se pierde el acceso.
 */
export async function continueAsGuest(name) {
  const { data, error } = await client().auth.signInAnonymously({ options: { data: { name: name.trim() } } });
  if (error?.code === "anonymous_provider_disabled") throw new Error("El acceso como invitado no está habilitado. Inicia sesión o crea una cuenta.");
  if (error) throw toError(error);
  return toAppUser(data.user);
}

/** Devuelve { user, needsConfirmation }. Sin sesión = Supabase pidió confirmar el correo. */
export async function register({ name, email, password }) {
  const { data, error } = await client().auth.signUp({
    email: email.trim(),
    password,
    options: {
      data: { name: name.trim() },
      // La raíz (Site URL de Supabase) siempre está permitida; el destino pendiente lo retoma la entrada.
      emailRedirectTo: appUrl(),
    },
  });
  if (error) throw toError(error);
  // Con confirmación activa, un correo ya registrado vuelve sin error pero sin identidades.
  if (data.user?.identities?.length === 0) throw new Error(MESSAGES.user_already_exists);
  return { user: toAppUser(data.user), needsConfirmation: !data.session };
}

export async function login({ email, password }) {
  const { data, error } = await client().auth.signInWithPassword({ email: email.trim(), password });
  if (error) throw toError(error);
  return toAppUser(data.user);
}

/**
 * Envía el enlace para crear una contraseña nueva. Supabase responde igual exista o no la cuenta
 * (no revela qué correos están registrados). La URL debe estar en Auth > URL Configuration > Redirect URLs.
 */
export async function requestPasswordReset(email) {
  const { error } = await client().auth.resetPasswordForEmail(email.trim(), { redirectTo: appUrl("nueva-contrasena") });
  if (error) throw toError(error);
}

/** Cambia la contraseña de la sesión actual (la que abre el enlace de recuperación). */
export async function updatePassword(password) {
  const { error } = await client().auth.updateUser({ password });
  if (error) throw toError(error);
}

const PROFILE_COLUMNS = "id, username, display_name, avatar_url, bio, role";

/** Perfil público (tabla profiles). El trigger de la base lo crea al registrarse. */
export async function getProfile(id) {
  const { data, error } = await client().from("profiles").select(PROFILE_COLUMNS).eq("id", id).maybeSingle();
  if (error) throw toError(error);
  return data;
}

/** Guarda solo los campos editables; role no se envía nunca (y la base lo rechazaría). */
export async function updateProfile(id, { username, display_name, avatar_url, bio }) {
  const { data, error } = await client()
    .from("profiles")
    .update({ username, display_name, avatar_url, bio })
    .eq("id", id)
    .select(PROFILE_COLUMNS)
    .single();
  if (error?.code === "23505") throw new Error("Ese username ya está en uso. Prueba con otro.");
  if (error?.code === "23514") throw new Error("Algún campo no cumple el formato permitido.");
  if (error) throw toError(error);
  return data;
}

export async function logout() {
  const { error } = await client().auth.signOut();
  if (error) throw toError(error);
  // La caché del service worker solo tiene archivos públicos; aun así, al salir no queda nada de la sesión.
  const keys = (await globalThis.caches?.keys().catch(() => [])) ?? [];
  await Promise.all(keys.filter((key) => key.startsWith("cinet-")).map((key) => caches.delete(key)));
}
