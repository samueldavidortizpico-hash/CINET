import { SeatAvatar } from "./DuoSeats.jsx";

/** Indicador de progreso: cada paso ya alcanzado se puede volver a editar. Las personas son butacas de color. */
export default function DuoProgress({ steps, current, reached, names, onGo }) {
  const people = names.length;
  const chapter = current < 1 ? "01 · Preparen el plan" : current <= people + 1 ? "02 · Conozcamos sus gustos" : "03 · Encuentren su historia";
  return (
    <nav className={`duo-progress${people > 2 ? " is-crowded" : ""}`} aria-label="Progreso de la sesión">
      <p className="duo-progress-count">
        <span>{chapter}</span>
        <span>
          Paso {current + 1} de {steps.length}
        </span>
      </p>
      <div className="duo-progress-track" role="progressbar" aria-label="Avance de la sesión" aria-valuemin={1} aria-valuemax={steps.length} aria-valuenow={current + 1}>
        <span style={{ "--progress": (current + 1) / steps.length }} />
      </div>
      <ol>
        {steps.map(({ key, label }, index) => {
          const person = key.startsWith("person-") ? Number(key.slice(7)) : null;
          return (
            <li key={key} className={[index < current ? "is-done" : index === current ? "is-current" : "", person !== null && "is-person"].filter(Boolean).join(" ") || undefined}>
              <button type="button" aria-current={index === current ? "step" : undefined} disabled={index > reached} onClick={() => onGo(key)}>
                {person !== null ? (
                  <SeatAvatar index={person} name={names[person]} className="duo-progress-dot" />
                ) : (
                  <span className="duo-progress-dot" aria-hidden="true">
                    {index < current ? "✓" : index + 1}
                  </span>
                )}
                <span className="duo-progress-label">{person !== null ? names[person] : label}</span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
