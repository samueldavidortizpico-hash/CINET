import { useState } from "react";
import Button from "../common/Button.jsx";
import { useAuth } from "../../hooks/useAuth.js";
import { hasErrors, validateForm, validateLogin } from "../../utils/validation.js";

const FIELDS = {
  name: { label: "Nombre", type: "text", placeholder: "Tu nombre", autoComplete: "name" },
  email: { label: "Correo electrónico", type: "email", placeholder: "correo@ejemplo.com", autoComplete: "email" },
  password: { label: "Contraseña", type: "password", placeholder: "Mínimo 8 caracteres" },
};

/** Registro o inicio de sesión. Valida en vivo después del primer envío. */
export default function AuthForm({ mode, onSuccess }) {
  const { login, register } = useAuth();
  const [values, setValues] = useState({ name: "", email: "", password: "" });
  const [submitted, setSubmitted] = useState(false);
  const [serverError, setServerError] = useState("");
  const [busy, setBusy] = useState(false);

  const isRegister = mode === "register";
  const fields = isRegister ? ["name", "email", "password"] : ["email", "password"];
  const errors = isRegister
    ? validateForm(values.name, values.email, values.password)
    : validateLogin(values.email, values.password);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitted(true);
    if (hasErrors(errors)) return;

    setBusy(true);
    setServerError("");
    try {
      const user = await (isRegister ? register(values) : login(values));
      onSuccess(user);
    } catch (error) {
      setServerError(error.message);
      setBusy(false);
    }
  };

  return (
    <form id="signup-form" className="signup-form" noValidate onSubmit={handleSubmit}>
      {fields.map((name) => {
        const field = FIELDS[name];
        const error = submitted ? errors[name] : "";
        return (
          <div key={name} className="field">
            <label htmlFor={name}>{field.label}</label>
            <input
              id={name}
              name={name}
              type={field.type}
              placeholder={field.placeholder}
              autoComplete={field.autoComplete ?? (isRegister ? "new-password" : "current-password")}
              value={values[name]}
              aria-invalid={Boolean(error)}
              aria-describedby={error ? `${name}-error` : undefined}
              onChange={(event) => setValues((current) => ({ ...current, [name]: event.target.value }))}
            />
            {error && <p id={`${name}-error`} className="field-error">{error}</p>}
          </div>
        );
      })}

      {serverError && <p className="form-error" role="alert">{serverError}</p>}

      <Button type="submit" disabled={busy}>
        {isRegister ? "Crear cuenta" : "Iniciar sesión"}
      </Button>
    </form>
  );
}
