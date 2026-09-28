import { AMBIENCES } from "../../data/duo.js";

/** Ambiente del plan en casa y comida sugerida (opcional). */
export function AmbienceOptions({ selected, withFood, onSelect, onToggleFood }) {
  const ambience = AMBIENCES.find((item) => item.key === selected);
  return (
    <>
      <div className="ambience-grid">
        {AMBIENCES.map((item) => (
          <button
            key={item.key}
            type="button"
            className={`ambience-card${selected === item.key ? " selected" : ""}`}
            aria-pressed={selected === item.key}
            onClick={() => onSelect(item.key)}
          >
            <span aria-hidden="true">{item.icon}</span>
            <strong>{item.label}</strong>
          </button>
        ))}
      </div>
      {ambience && (
        <label className="food-suggestion">
          <input type="checkbox" checked={withFood} onChange={(event) => onToggleFood(event.target.checked)} />
          <span>
            🍕 Comida sugerida: <strong>{ambience.food}</strong>
          </span>
        </label>
      )}
    </>
  );
}
