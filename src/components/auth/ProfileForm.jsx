import { useState } from "react";
import Button from "../common/Button.jsx";
import AvatarUpload from "./AvatarUpload.jsx";
import { useAuth } from "../../hooks/useAuth.js";
import { useToast } from "../../hooks/useToast.js";
import { hasErrors, normalizeProfile, PROFILE_LIMITS, validateProfile } from "../../utils/validation.js";

const FIELDS = {
  username: { label: "Username", placeholder: "tu_usuario", hint: "3–30 caracteres: minúsculas, números y _.", maxLength: 30, autoComplete: "username" },
  display_name: { label: "Nombre visible", placeholder: "Cómo quieres que te vean", maxLength: PROFILE_LIMITS.display_name, autoComplete: "name" },
  bio: { label: "Bio", placeholder: "Tus géneros, directores o sagas favoritas…", maxLength: PROFILE_LIMITS.bio, multiline: true },
};

/** Edita los campos públicos del perfil. role no está aquí a propósito: solo se cambia desde la base. */
export default function ProfileForm({ profile }) {
  const { saveProfile } = useAuth();
  const { showToast } = useToast();
  const [values, setValues] = useState(() =>
    Object.fromEntries(Object.keys(FIELDS).map((name) => [name, profile[name] ?? ""]))
  );
  const [submitted, setSubmitted] = useState(false);
  const [serverError, setServerError] = useState("");
  const [busy, setBusy] = useState(false);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const errors = validateProfile(values);

  const handleChange = (name, value) => {
    // El username en la base es solo minúsculas: se normaliza al escribir.
    setValues((current) => ({ ...current, [name]: name === "username" ? value.toLowerCase() : value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (busy || avatarBusy) return;
    setSubmitted(true);
    if (hasErrors(errors)) return;

    setBusy(true);
    setServerError("");
    try {
      const { username, display_name, bio } = normalizeProfile(values);
      // No enviar avatar_url: normalizar un campo ausente a null borraría la foto.
      await saveProfile({ username, display_name, bio });
      showToast("✅ Perfil actualizado");
    } catch (error) {
      setServerError(error.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="profile-form" noValidate onSubmit={handleSubmit} aria-label="Editar perfil">
      <AvatarUpload disabled={busy} onBusyChange={setAvatarBusy} />
      {Object.entries(FIELDS).map(([name, field]) => {
        const error = submitted ? errors[name] : "";
        const Control = field.multiline ? "textarea" : "input";
        return (
          <div key={name} className="field">
            <label htmlFor={`profile-${name}`}>{field.label}</label>
            <Control
              id={`profile-${name}`}
              name={name}
              type={field.multiline ? undefined : (field.type ?? "text")}
              rows={field.multiline ? 4 : undefined}
              placeholder={field.placeholder}
              autoComplete={field.autoComplete ?? "off"}
              maxLength={field.maxLength}
              value={values[name]}
              disabled={busy || avatarBusy}
              aria-invalid={Boolean(error)}
              aria-describedby={`profile-${name}-hint${error ? ` profile-${name}-error` : ""}`}
              onChange={(event) => handleChange(name, event.target.value)}
            />
            <p id={`profile-${name}-hint`} className="profile-hint">
              {field.hint ?? `${values[name].length}/${field.maxLength}`}
            </p>
            {error && <p id={`profile-${name}-error`} className="field-error">{error}</p>}
          </div>
        );
      })}

      {serverError && <p className="form-error" role="alert">{serverError}</p>}

      <Button type="submit" variant="primary" disabled={busy || avatarBusy}>
        {busy ? "Guardando…" : "Guardar perfil"}
      </Button>
    </form>
  );
}
