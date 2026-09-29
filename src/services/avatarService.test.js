import { test } from "node:test";
import assert from "node:assert/strict";
import { avatarFileError, MAX_AVATAR_BYTES, ownedAvatarPath, replaceAvatar } from "./avatarService.js";

const USER = "11111111-1111-4111-8111-111111111111";
const OTHER = "22222222-2222-4222-8222-222222222222";
const BASE = "https://cinet-test.supabase.co/storage/v1/object/public/avatars/";
const OLD = `${USER}/avatar.png`;
const HEADERS = {
  "image/jpeg": [255, 216, 255, 224],
  "image/png": [137, 80, 78, 71, 13, 10, 26, 10],
  "image/webp": [82, 73, 70, 70, 4, 0, 0, 0, 87, 69, 66, 80],
};
const picture = (type = "image/png") => new File([new Uint8Array(HEADERS[type])], "../../nombre-peligroso.svg", { type });

function fixture(options = {}) {
  const events = [];
  let profile = { id: USER, username: "ana", display_name: "Ana", bio: "Cine", role: "admin", avatar_url: BASE + OLD, ...options.profile };
  const bucket = {
    getPublicUrl: (path) => ({ data: { publicUrl: BASE + path } }),
    async upload(path, file, config) {
      events.push({ action: "upload", path, file, config });
      return { data: { path }, error: options.uploadError ?? null };
    },
    async remove(paths) {
      events.push({ action: "remove", paths });
      return { data: [], error: options.removeError ?? null };
    },
  };
  const client = {
    storage: { from(name) { assert.equal(name, "avatars"); return bucket; } },
    from(table) {
      assert.equal(table, "profiles");
      let payload;
      const filters = {};
      const query = {
        select() { return query; },
        update(values) { payload = values; return query; },
        eq(key, value) { filters[key] = value; return query; },
        is(key, value) { filters[key] = value; return query; },
        async single() {
          assert.equal(filters.id, USER);
          if (!payload) {
            events.push({ action: "read" });
            return { data: { ...profile }, error: options.readError ?? null };
          }
          events.push({ action: "save", payload });
          if (options.concurrentUrl) profile.avatar_url = options.concurrentUrl;
          if (options.saveError) return { data: null, error: options.saveError };
          if (filters.avatar_url !== profile.avatar_url) return { data: null, error: { code: "PGRST116" } };
          profile = { ...profile, ...payload };
          return { data: { ...profile }, error: null };
        },
      };
      return query;
    },
  };
  return { client, events, current: () => profile };
}

test("avatar: tipos, vacío y límite exacto de 5 MiB", () => {
  for (const type of Object.keys(HEADERS)) assert.equal(avatarFileError({ type, size: MAX_AVATAR_BYTES }), "");
  assert.match(avatarFileError({ type: "image/png", size: MAX_AVATAR_BYTES + 1 }), /5 MB/);
  for (const type of ["image/svg+xml", "image/gif", "image/avif", "image/jpg", "", "text/html"]) {
    assert.match(avatarFileError({ type, size: 12 }), /JPEG/);
  }
  assert.match(avatarFileError({ type: "image/png", size: 0 }), /vacía/);
});

test("avatar: solo limpia URLs propias reconocidas, nunca externas ni otras carpetas", () => {
  assert.equal(ownedAvatarPath(BASE + OLD + "?v=123", BASE, USER), OLD);
  const versioned = `${USER}/avatar-${OTHER}.webp`;
  assert.equal(ownedAvatarPath(BASE + versioned, BASE, USER), versioned);
  for (const url of [null, "no es URL", BASE.replace("cinet-test", "otro") + OLD,
    BASE + `${OTHER}/avatar.png`, BASE + `${USER}/not-avatar.png`, BASE + `${USER}/avatar.svg`,
    BASE + `${USER}/nested/avatar.png`, BASE + `${USER}/nested%2Favatar.png`, BASE + `${USER}/../${OTHER}/avatar.png`,
    BASE.replace("avatars/", "avatars-other/") + OLD]) {
    assert.equal(ownedAvatarPath(url, BASE, USER), null, String(url));
  }
});

test("avatar: sube con UUID, guarda solo avatar_url y limpia después de confirmar", async () => {
  for (const type of Object.keys(HEADERS)) {
    const f = fixture();
    const result = await replaceAvatar(f.client, USER, picture(type));
    assert.deepEqual(f.events.map((e) => e.action), ["read", "upload", "save", "remove"]);
    const upload = f.events[1];
    assert.match(upload.path, new RegExp(`^${USER}/avatar-[0-9a-f-]{36}\\.(jpg|png|webp)$`));
    assert.equal(upload.config.contentType, type);
    assert.equal(upload.config.upsert, false);
    assert.deepEqual(Object.keys(f.events[2].payload), ["avatar_url"]);
    assert.equal(result.profile.avatar_url, BASE + upload.path);
    assert.equal(result.profile.username, "ana");
    assert.equal(result.profile.role, "admin");
    assert.equal(result.profile.bio, "Cine");
    assert.deepEqual(f.events[3].paths, [OLD]);
    assert.equal(result.warning, "");
  }
});

test("avatar: dos cambios generan URLs nuevas y borran cada versión anterior", async () => {
  const f = fixture();
  const first = await replaceAvatar(f.client, USER, picture());
  const second = await replaceAvatar(f.client, USER, picture("image/webp"));
  assert.notEqual(first.profile.avatar_url, second.profile.avatar_url);
  assert.deepEqual(f.events.filter((e) => e.action === "remove").map((e) => e.paths), [[OLD], [first.profile.avatar_url.slice(BASE.length)]]);
});

test("avatar: sin foto previa o con URL externa no intenta borrar objetos ajenos", async () => {
  for (const avatar_url of [null, "https://example.com/photo.png", BASE + `${OTHER}/avatar.png`]) {
    const f = fixture({ profile: { avatar_url } });
    await replaceAvatar(f.client, USER, picture());
    assert.equal(f.events.some((e) => e.action === "remove"), false);
  }
});

test("avatar: falla de subida conserva perfil y archivo anterior", async () => {
  const f = fixture({ uploadError: { statusCode: "403" } });
  await assert.rejects(replaceAvatar(f.client, USER, picture()), /permisos/);
  assert.equal(f.current().avatar_url, BASE + OLD);
  assert.deepEqual(f.events.map((e) => e.action), ["read", "upload"]);
});

test("avatar: rechazo confirmado de profiles elimina solo el archivo nuevo", async () => {
  const f = fixture({ saveError: { code: "42501" } });
  await assert.rejects(replaceAvatar(f.client, USER, picture()), /Recarga/);
  assert.equal(f.current().avatar_url, BASE + OLD);
  assert.deepEqual(f.events.at(-1).paths, [f.events[1].path]);
  assert.notEqual(f.events[1].path, OLD);
});

test("avatar: ante resultado ambiguo no borra una foto que pudo quedar guardada", async () => {
  for (const code of ["", "40003", "08007"]) {
    const f = fixture({ saveError: { code } });
    await assert.rejects(replaceAvatar(f.client, USER, picture()), /conservó por seguridad/);
    assert.equal(f.events.some((e) => e.action === "remove"), false);
  }
});

test("avatar: fallo de limpieza informa éxito parcial sin deshacer el perfil", async () => {
  const f = fixture({ removeError: { statusCode: "403" } });
  const result = await replaceAvatar(f.client, USER, picture());
  assert.notEqual(result.profile.avatar_url, BASE + OLD);
  assert.match(result.warning, /no pudimos borrar/);
});

test("avatar: cambio concurrente no pisa la foto ganadora ni la elimina", async () => {
  const winner = BASE + `${USER}/avatar-${OTHER}.jpg`;
  const f = fixture({ concurrentUrl: winner });
  await assert.rejects(replaceAvatar(f.client, USER, picture()), /otra sesión/);
  assert.equal(f.current().avatar_url, winner);
  assert.deepEqual(f.events.at(-1).paths, [f.events[1].path]);
});

test("avatar: archivo disfrazado, ID inválido o perfil inaccesible no suben nada", async () => {
  const f = fixture();
  const disguised = new File(["<svg>no es PNG</svg>"], "photo.png", { type: "image/png" });
  await assert.rejects(replaceAvatar(f.client, USER, disguised), /contenido/);
  await assert.rejects(replaceAvatar(f.client, "../otra-carpeta", picture()), /Inicia sesión/);
  assert.equal(f.events.length, 0);
  const inaccessible = fixture({ readError: { code: "42501" } });
  await assert.rejects(replaceAvatar(inaccessible.client, USER, picture()), /leer tu perfil/);
  assert.deepEqual(inaccessible.events.map((e) => e.action), ["read"]);
});
