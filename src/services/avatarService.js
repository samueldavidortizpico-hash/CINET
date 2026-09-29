// El cliente se recibe como argumento: se reutiliza Supabase y se prueba sin credenciales.
export const AVATAR_BUCKET = "avatars";
export const MAX_AVATAR_BYTES = 5 * 1024 * 1024;
export const AVATAR_ACCEPT = "image/jpeg,image/png,image/webp";
const EXTENSIONS = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PROFILE_COLUMNS = "id, username, display_name, avatar_url, bio, role";

export function avatarFileError(file) {
  if (!file || !Object.hasOwn(EXTENSIONS, file.type)) return "Elige una imagen JPEG, PNG o WebP.";
  if (!file.size) return "La imagen está vacía.";
  if (file.size > MAX_AVATAR_BYTES) return "La foto no puede superar los 5 MB.";
  return "";
}

async function validateImage(file) {
  const error = avatarFileError(file);
  if (error) throw new Error(error);
  const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const startsWith = (expected, offset = 0) => expected.every((value, index) => bytes[index + offset] === value);
  const valid = file.type === "image/jpeg" ? startsWith([255, 216, 255])
    : file.type === "image/png" ? startsWith([137, 80, 78, 71, 13, 10, 26, 10])
      : startsWith([82, 73, 70, 70]) && startsWith([87, 69, 66, 80], 8);
  if (!valid) throw new Error("El contenido de la foto no corresponde a una imagen JPEG, PNG o WebP válida.");
}

/** Solo borra nombres de avatar reconocidos en el mismo bucket, origen y UUID. */
export function ownedAvatarPath(url, publicBase, userId) {
  if (!url || !UUID.test(userId)) return null;
  try {
    const candidate = new URL(url);
    const base = new URL(publicBase);
    if (candidate.origin !== base.origin || !candidate.pathname.startsWith(base.pathname)) return null;
    const path = decodeURIComponent(candidate.pathname.slice(base.pathname.length));
    const [folder, filename, extra] = path.split("/");
    if (folder !== userId || extra !== undefined) return null;
    if (!/^avatar(?:-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})?\.(?:jpg|jpeg|png|webp)$/i.test(filename)) return null;
    return path;
  } catch {
    return null;
  }
}

async function removeFile(bucket, path) {
  try {
    const { error } = await bucket.remove([path]);
    return !error;
  } catch {
    return false;
  }
}

/**
 * Archivo nuevo → actualización condicional del perfil → eliminación del anterior.
 * No sobrescribe la foto vigente antes de guardar, ni borra carpetas/listados completos.
 * El UUID del cliente no es autorización: Storage y profiles deben aplicar RLS.
 */
export async function replaceAvatar(client, userId, file) {
  if (!client || !UUID.test(userId)) throw new Error("Inicia sesión para cambiar tu foto.");
  await validateImage(file);
  const { data: previous, error: readError } = await client.from("profiles").select("avatar_url").eq("id", userId).single();
  if (readError || !previous) throw new Error("No pudimos leer tu perfil. Inténtalo de nuevo antes de subir la foto.");

  const bucket = client.storage.from(AVATAR_BUCKET);
  const path = `${userId}/avatar-${crypto.randomUUID()}.${EXTENSIONS[file.type]}`;
  const publicUrl = bucket.getPublicUrl(path).data.publicUrl;
  const publicBase = bucket.getPublicUrl("").data.publicUrl;
  if (!publicUrl.startsWith("https://") || publicUrl.length > 500) throw new Error("La URL de Storage no es compatible con el perfil. Revisa la configuración de Supabase.");
  let upload;
  try {
    upload = await bucket.upload(path, file, { contentType: file.type, cacheControl: "3600", upsert: false });
  } catch {
    // Una desconexión no permite saber si el servidor terminó de recibir el archivo.
    throw new Error("Se interrumpió la subida. Tu perfil no cambió; comprueba la conexión. Puede haber un archivo pendiente de limpieza en tu carpeta de avatars.");
  }
  if (upload.error) throw new Error("No se pudo subir la foto. Comprueba la conexión y los permisos del bucket avatars (JPEG, PNG o WebP; máximo 5 MB).");

  let result;
  try {
    // Evita que dos pestañas reemplacen a la vez la misma foto y dejen archivos huérfanos.
    let update = client.from("profiles").update({ avatar_url: publicUrl }).eq("id", userId);
    update = previous.avatar_url === null ? update.is("avatar_url", null) : update.eq("avatar_url", previous.avatar_url);
    result = await update.select(PROFILE_COLUMNS).single();
  } catch {
    result = { error: {} };
  }
  if (result.error || !result.data) {
    // Solo deshacer si Postgres confirma el rechazo. Ante un fallo de red el UPDATE
    // podría haberse confirmado: borrar aquí podría romper la foto ya guardada.
    const code = result.error?.code ?? "";
    const rejected = /^(22|23|28|42|P0)[0-9A-Z]{3}$/.test(code) || ["40001", "40P01", "PGRST116"].includes(code);
    const removed = rejected && await removeFile(bucket, path);
    const reason = code === "PGRST116"
      ? "La foto cambió desde otra sesión o no tienes permiso para editar este perfil. Recarga y vuelve a intentarlo."
      : "No pudimos confirmar que la foto se guardara en el perfil. Recarga para comprobar su estado.";
    throw new Error(`${reason}${removed ? "" : " El archivo subido se conservó por seguridad; puede requerir limpieza en Storage."}`);
  }

  const oldPath = ownedAvatarPath(previous.avatar_url, publicBase, userId);
  const cleaned = !oldPath || await removeFile(bucket, oldPath);
  return {
    profile: result.data,
    warning: cleaned ? "" : "Tu foto se guardó, pero no pudimos borrar el avatar anterior. Revisa tu carpeta en Storage para evitar archivos sobrantes.",
  };
}
