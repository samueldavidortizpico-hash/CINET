/** Paso numerado del flujo de selección de función. */
export default function ShowtimeStep({ number, kicker, title, children }) {
  return (
    <section className="selection-section">
      <div className="step-heading">
        <span className="step-number">{number}</span>
        <div>
          <span className="section-kicker">{kicker}</span>
          <h2>{title}</h2>
        </div>
      </div>
      {children}
    </section>
  );
}
