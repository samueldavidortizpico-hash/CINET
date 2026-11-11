import { useState } from "react";
import Icon from "../common/Icon.jsx";

/**
 * Campo de contraseña con botón de ojo: alterna password/text sin tocar el valor.
 * Empieza siempre oculta; el botón es type="button" para no enviar el formulario.
 */
export default function PasswordField({ id, label, value, onChange, autoComplete, error, hint }) {
  const [visible, setVisible] = useState(false);
  const describedBy = [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(" ") || undefined;

  return (
    <div className="auth-field">
      <label htmlFor={id}>{label}</label>
      <div className="password-input">
        <input
          id={id}
          name={id}
          type={visible ? "text" : "password"}
          autoComplete={autoComplete}
          autoCapitalize="none"
          spellCheck="false"
          value={value}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy}
          onChange={(event) => onChange(event.target.value)}
        />
        <button
          type="button"
          className="password-toggle"
          aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
          aria-controls={id}
          onClick={() => setVisible((current) => !current)}
        >
          <Icon name={visible ? "eye-off" : "eye"} />
        </button>
      </div>
      {hint && <p id={`${id}-hint`} className="field-hint">{hint}</p>}
      {error && <p id={`${id}-error`} className="field-error">{error}</p>}
    </div>
  );
}
