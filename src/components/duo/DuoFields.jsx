/** Piezas de formulario de Duo: pregunta (fieldset) y chip (checkbox o radio). */

export function Question({ title, hint, children }) {
  return (
    <fieldset className="duo-fieldset">
      <legend>{title}</legend>
      {hint && <p className="duo-hint">{hint}</p>}
      {children}
    </fieldset>
  );
}

export function Chip({ type = "checkbox", name, checked, onChange, children }) {
  return (
    <label className="duo-chip">
      <input type={type} name={name} checked={checked} onChange={onChange} />
      <span>{children}</span>
    </label>
  );
}

/** Opciones excluyentes como chips de radio. */
export function ChoiceChips({ name, options, value, onChange }) {
  return (
    <div className="duo-chips">
      {options.map((option) => (
        <Chip key={option.value} type="radio" name={name} checked={value === option.value} onChange={() => onChange(option.value)}>
          {option.label}
        </Chip>
      ))}
    </div>
  );
}
