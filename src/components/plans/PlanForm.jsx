import { useState } from "react";
import Button from "../common/Button.jsx";
import { validatePlan } from "../../services/planService.js";

const EMPTY = { name: "", organizer: "", message: "" };

/** Formulario de plan: se usa para crear (/create-plan) y para editar (/plan/:id). */
export default function PlanForm({
  initialValues,
  onSubmit,
  onCancel,
  submitLabel = "🍿 Crear plan",
  disabled = false,
  notice = null,
  organizerReadOnly = false,
}) {
  const [values, setValues] = useState({ ...EMPTY, ...initialValues });
  const [error, setError] = useState(null);
  const message = error ?? notice;

  const handleChange = (event) => {
    const { name, value } = event.target;
    setValues((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const problem = validatePlan(values);
    if (problem) {
      setError(problem.message);
      event.currentTarget.elements[problem.field].focus();
      return;
    }
    setError(null);
    onSubmit(values);
  };

  return (
    <form id="create-plan-form" noValidate onSubmit={handleSubmit}>
      <div className="form-group">
        <label htmlFor="plan-name">Nombre del plan</label>
        <input id="plan-name" name="name" type="text" placeholder="Ej. Noche de cine 🎬" maxLength={60} required value={values.name} onChange={handleChange} />
      </div>

      <div className="form-group">
        <label htmlFor="organizer-name">Tu nombre</label>
        <input id="organizer-name" name="organizer" type="text" placeholder="Ej. Samuel" maxLength={40} required readOnly={organizerReadOnly} value={values.organizer} onChange={handleChange} />
      </div>

      <div className="form-group">
        <label htmlFor="plan-description">Mensaje para tus amigos</label>
        <textarea id="plan-description" name="message" placeholder="¿Quién se apunta? Vamos a ver la película y después podemos comer algo..." maxLength={300} value={values.message} onChange={handleChange} />
      </div>

      {message && (
        <div id="create-plan-error" className="error-message" role="alert">
          {message}
        </div>
      )}

      <div className="create-actions">
        {onCancel ? (
          <Button variant="secondary" onClick={onCancel}>Cancelar</Button>
        ) : (
          <Button variant="secondary" to="/movies">Cancelar</Button>
        )}
        <Button variant="primary" type="submit" disabled={disabled}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
