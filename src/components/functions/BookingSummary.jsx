import Button from "../common/Button.jsx";

export default function BookingSummary({ movie, cinema, date, time, onContinue, placeLabel = "📍 Cine", extraRows = [] }) {
  const complete = Boolean(cinema && date && time);
  const rows = [
    ["🎬 Película", movie.title],
    [placeLabel, cinema && `${cinema.name} · ${cinema.location}`],
    ["📅 Fecha", date?.label],
    ["🕐 Hora", time],
    ...extraRows.filter(([, value]) => value),
  ];

  return (
    <aside className="booking-summary">
      <div>
        <span className="section-kicker">TU SELECCIÓN</span>
        <h2>Resumen de la función</h2>
      </div>

      <div className="summary-details">
        {rows.map(([label, value]) => (
          <div key={label} className="summary-item">
            <span>{label}</span>
            <strong>{value || "—"}</strong>
          </div>
        ))}
      </div>

      <Button id="continue-button" variant="primary" className="continue-button" disabled={!complete} onClick={onContinue}>
        Continuar →
      </Button>
      <p id="selection-message" className="selection-message" aria-live="polite">
        {complete
          ? "Todo listo. Puedes continuar para crear tu plan."
          : `Selecciona ${placeLabel === "📍 Cine" ? "cine" : "plataforma"}, fecha y hora para continuar.`}
      </p>
    </aside>
  );
}
