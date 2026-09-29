function validateName(name) {

  if (name.trim() === "") {
    return "El nombre es obligatorio.";
  }

  if (name.trim().length < 2) {
    return "El nombre debe tener al menos 2 caracteres.";
  }

  return "";
}


function validateEmail(email) {

  if (email.trim() === "") {
    return "El correo electrónico es obligatorio.";
  }

  const emailPattern =
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailPattern.test(email.trim())) {
    return "Ingresa un correo electrónico válido.";
  }

  return "";
}


function validatePassword(password) {

  if (password === "") {
    return "La contraseña es obligatoria.";
  }

  if (password.length < 8) {
    return "La contraseña debe tener al menos 8 caracteres.";
  }

  return "";
}


export function validateForm(
  name,
  email,
  password
) {

  return {

    name: validateName(name),

    email: validateEmail(email),

    password: validatePassword(password)

  };

}

export function validateLogin(
  email,
  password
) {

  return {

    email: validateEmail(email),

    password: password === "" ? "La contraseña es obligatoria." : ""

  };

}


export function hasErrors(errors) {
  return Object.values(errors).some(Boolean);
}

// Mismas reglas que los CHECK de public.profiles (supabase/migrations/*_create_profiles.sql).
export const PROFILE_LIMITS = { display_name: 60, bio: 280, avatar_url: 500 };
const USERNAME_PATTERN = /^[a-z0-9_]{3,30}$/;

/** Recorta espacios y convierte vacíos en null (la base no acepta avatar_url = ""). */
export function normalizeProfile({ username = "", display_name = "", avatar_url = "", bio = "" }) {
  const clean = (value) => value.trim() || null;
  return { username: clean(username), display_name: clean(display_name), avatar_url: clean(avatar_url), bio: clean(bio) };
}

export function validateProfile(values) {
  const { username, display_name, avatar_url, bio } = normalizeProfile(values);
  let avatarError = "";
  if (avatar_url) {
    if (!/^https:\/\//i.test(avatar_url)) avatarError = "La URL debe empezar por https://";
    else if (avatar_url.length > PROFILE_LIMITS.avatar_url) avatarError = `Máximo ${PROFILE_LIMITS.avatar_url} caracteres.`;
    else if (!URL.canParse(avatar_url)) avatarError = "Ingresa una URL válida.";
  }
  return {
    username: username && !USERNAME_PATTERN.test(username) ? "De 3 a 30 caracteres: solo minúsculas, números y _." : "",
    display_name: (display_name?.length ?? 0) > PROFILE_LIMITS.display_name ? `Máximo ${PROFILE_LIMITS.display_name} caracteres.` : "",
    avatar_url: avatarError,
    bio: (bio?.length ?? 0) > PROFILE_LIMITS.bio ? `Máximo ${PROFILE_LIMITS.bio} caracteres.` : "",
  };
}
