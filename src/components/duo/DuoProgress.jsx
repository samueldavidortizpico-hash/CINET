import { STEPS } from "../../data/duo.js";

/** Indicador de progreso: cada paso ya alcanzado se puede volver a editar. */
export default function DuoProgress({ current, reached, names, onGo }) {
  return (
    <nav className="duo-progress" aria-label="Progreso de la sesión">
      <p className="duo-progress-count">
        Paso {current + 1} de {STEPS.length}
      </p>
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
