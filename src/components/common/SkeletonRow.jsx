/** Tarjetas de carga con brillo (aria-hidden: el estado lo anuncia el texto oculto). */
export default function SkeletonRow({ count = 6, label = "Cargando títulos…", variant = "row" }) {
  return (
    <div className={`skeleton-${variant}`} role="status">
      <span className="visually-hidden">{label}</span>
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="skeleton-card" aria-hidden="true">
          <div className="skeleton-poster" />
          <div className="skeleton-line" />
          <div className="skeleton-line short" />
        </div>
      ))}
    </div>
  );
}
