import { STEPS } from "../../data/duo.js";

/** Indicador de progreso: cada paso ya alcanzado se puede volver a editar. */
export default function DuoProgress({ current, reached, names, onGo }) {
  return (
    <nav className="duo-progress" aria-label="Progreso de la sesión">
      <p className="duo-progress-count">
        <span>{current < 1 ? "01 · Preparen el plan" : current < 4 ? "02 · Conozcamos sus gustos" : "03 · Encuentren su historia"}</span>
        <span>Paso {current + 1} de {STEPS.length}</span>
      </p>
      <div className="duo-progress-track" role="progressbar" aria-label="Avance de la sesión" aria-valuemin={1} aria-valuemax={STEPS.length} aria-valuenow={current + 1}>
        <span style={{ width: `${((current + 1) / STEPS.length) * 100}%` }} />
      </div>
      <ol>
        {STEPS.map(({ key, label }, index) => (
          <li key={key} className={index < current ? "is-done" : index === current ? "is-current" : undefined}>
            <button type="button" aria-current={index === current ? "step" : undefined} disabled={index > reached} onClick={() => onGo(key)}>
              <span className="duo-progress-dot" aria-hidden="true">
                {index < current ? "✓" : index + 1}
              </span>
              <span className="duo-progress-label">{key.startsWith("person-") ? names[Number(key.at(-1))] : label}</span>
            </button>
          </li>
        ))}
      </ol>
    </nav>
  );
}
