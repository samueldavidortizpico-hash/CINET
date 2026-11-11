import { useState } from "react";
import { Link } from "react-router-dom";
import PasswordField from "./PasswordField.jsx";
import { useAuth } from "../../hooks/useAuth.js";
import { hasErrors, validateConfirm, validateForm, validateLogin } from "../../utils/validation.js";

// Campo de error → name del input (para llevar el foco al primero que falle).
const FIELD_NAMES = { confirm: "password-confirm" };

const TEXT_FIELDS = {
  name: { label: "Nombre", type: "text", autoComplete: "name", placeholder: "Cómo te verán en los planes" },
  email: { label: "Correo electrónico", type: "email", autoComplete: "email", placeholder: "correo@ejemplo.com", inputMode: "email" },
};

/**
 * Iniciar sesión o crear cuenta. Valida en vivo después del primer envío, lleva el foco al primer
 * error y bloquea el botón mientras espera a Supabase (sin envíos duplicados).
 */
export default function AuthForm({ mode, initialEmail = "", onSuccess, forgotState }) {
  const isRegister = mode === "register";
  const { login, register } = useAuth();
  const [values, setValues] = useState({ name: "", email: initialEmail, password: "", confirm: "" });
  const [submitted, setSubmitted] = useState(false);
  const [serverError, setServerError] = useState("");
  const [busy, setBusy] = useState(false);

  const errors = isRegister
    ? { ...validateForm(values.name, values.email, values.password), confirm: validateConfirm(values.password, values.confirm) }
    : validateLogin(values.email, values.password);
  const shown = (name) => (submitted ? errors[name] : "");
  const set = (name) => (value) => setValues((current) => ({ ...current, [name]: value }));

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (busy) return;
    setSubmitted(true);
    if (hasErrors(errors)) {
      const first = Object.keys(errors).find((name) => errors[name]);
      event.currentTarget.elements.namedItem(FIELD_NAMES[first] ?? first)?.focus();
      return;
    }
    setBusy(true);
    setServerError("");
    try {
      onSuccess(await (isRegister ? register(values) : login(values)));
    } catch (error) {
      setServerError(error.message);
      setBusy(false);
    }
  };

  const passwordOk = values.password.length >= 8;

  return (
    <form id="signup-form" className="auth-form" noValidate aria-busy={busy} onSubmit={handleSubmit}>
      {(isRegister ? ["name", "email"] : ["email"]).map((name) => {
        const field = TEXT_FIELDS[name];
        const error = shown(name);
        return (
          <div key={name} className="auth-field">
            <label htmlFor={name}>{field.label}</label>
            <input
              id={name}
              name={name}
              type={field.type}
              inputMode={field.inputMode}
              autoComplete={field.autoComplete}
              autoCapitalize={name === "email" ? "none" : undefined}
              spellCheck={name === "email" ? "false" : undefined}
              placeholder={field.placeholder}
              value={values[name]}
              aria-invalid={Boolean(error)}
              aria-describedby={error ? `${name}-error` : undefined}
              onChange={(event) => set(name)(event.target.value)}
            />
            {error && <p id={`${name}-error`} className="field-error">{error}</p>}
          </div>
        );
      })}

      <PasswordField
        id="password"
        label="Contraseña"
        autoComplete={isRegister ? "new-password" : "current-password"}
        value={values.password}
        onChange={set("password")}
        error={shown("password")}
        hint={isRegister ? (passwordOk ? "✓ Tiene al menos 8 caracteres." : "Mínimo 8 caracteres.") : undefined}
      />

      {isRegister && (
        <PasswordField
          id="password-confirm"
          label="Confirma la contraseña"
          autoComplete="new-password"
          value={values.confirm}
          onChange={set("confirm")}
          error={shown("confirm")}
        />
      )}

      {!isRegister && (
        <Link className="auth-forgot" to="/recuperar" state={forgotState}>
          ¿Olvidaste tu contraseña?
        </Link>
      )}

      {serverError && <p className="form-error" role="alert">{serverError}</p>}

      <button type="submit" className="btn btn-primary auth-submit" disabled={busy}>
        {busy && <span className="auth-spinner" aria-hidden="true" />}
        {busy ? (isRegister ? "Creando tu cuenta…" : "Entrando…") : isRegister ? "Crear mi cuenta" : "Entrar a CINET"}
      </button>
    </form>
  );
}
