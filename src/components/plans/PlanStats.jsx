import { getPlanStats } from "../../services/planService.js";

export default function PlanStats({ plans }) {
  const stats = getPlanStats(plans);
  const items = [
    ["🍿", "Planes creados", stats.total],
    ["✅", "Confirmados", stats.yes],
    ["🤔", "Tal vez", stats.maybe],
    ["❌", "No pueden", stats.no],
  ];

  return (
    <div className="stats-grid">
      {items.map(([icon, label, value]) => (
        <article key={label} className="stat-card">
          <span className="stat-icon" aria-hidden="true">
            {icon}
          </span>
          <div>
            <span>{label}</span>
            <strong>{value}</strong>
          </div>
        </article>
      ))}
    </div>
  );
}
