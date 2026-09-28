import Button from "../common/Button.jsx";
import { findConflicts, formatMinutes } from "../../services/recommender.js";

// Motivos de descarte (checkTitle) → frase con el número real de títulos.
const REASONS = {
  history: (n) => `${n} ya los vieron o descartaron`,
  unreleased: (n) => `${n} aún no se estrenan`,
  rejected: (n) => `${n} tienen un género que rechazaron`,
  must: (n) => `${n} no tienen los géneros imprescindibles`,
  taste: (n) => `${n} no encajan con los gustos de ninguno`,
  oneSided: (n) => `${n} solo encajan con una persona`,
  runtime: (n) => `${n} superan la duración máxima (o TMDB no la confirma)`,
  seasons: (n) => `${n} tienen más temporadas de las que quieren`,
  status: (n) => `${n} no tienen el estado de serie que pidieron`,
  platform: (n) => `${n} no están en sus plataformas`,
};

const MAX_EXTRA_MINUTES = 60;

/**
 * Sin coincidencias (o muy pocas): explica por qué con números reales y ofrece
 * ampliar filtros solo si el usuario lo pide. Nunca rellena con títulos irrelevantes.
 */
export default function DuoEmptyState({ ranked, profile, source, few = false, onRelax, onEdit, onOpenHistory }) {
  const { rejectedBy } = ranked;
  const { relax } = profile;
  const noun = profile.type === "tv" ? "series" : "películas";
  const reasons = Object.entries(rejectedBy)
    .filter(([reason]) => REASONS[reason])
    .sort((a, b) => b[1] - a[1])
    .map(([reason, count]) => REASONS[reason](count));
  const noLocalSeries = source === "local" && profile.type === "tv";
  const conflicts = findConflicts(profile).filter((conflict) => conflict.blocking);

  const options = [
    profile.maxRuntime > 0 &&
      rejectedBy.runtime > 0 &&
      relax.runtime < MAX_EXTRA_MINUTES && {
        label: `Ampliar la duración 30 min (hasta ${formatMinutes(profile.maxRuntime + relax.runtime + 30)})`,
        patch: { runtime: relax.runtime + 30 },
      },
    profile.providers.length > 0 && rejectedBy.platform > 0 && !relax.platforms && { label: "Incluir otras plataformas", patch: { platforms: true } },
    rejectedBy.oneSided > 0 && !relax.oneSided && { label: "Incluir títulos que le gustan solo a uno", patch: { oneSided: true } },
  ].filter(Boolean);
  const relaxed = relax.runtime > 0 || relax.platforms || relax.oneSided;

  return (
    <div className={`duo-empty${few ? " is-few" : ""}`} role="status">
      <h3>{noLocalSeries ? "Las series necesitan conexión con TMDB" : few ? `Solo hay unas pocas ${noun} que cumplen todo` : `No encontramos ${noun} para los dos`}</h3>
      {noLocalSeries ? (
        <p>El catálogo local de CINET solo tiene películas. Elijan el modo Película o configuren VITE_TMDB_READ_TOKEN.</p>
      ) : conflicts.length ? (
        <p>{conflicts.map((conflict) => conflict.text).join(" ")} Cambien una de las dos preferencias.</p>
      ) : reasons.length ? (
        <p>De los títulos revisados, {reasons.join("; ")}.</p>
      ) : (
        <p>TMDB no devolvió títulos con estos filtros. Prueben con más géneros o menos restricciones.</p>
      )}
      {!noLocalSeries && options.length > 0 && <p>Si quieren, pueden ampliar la búsqueda (lo que aparezca así se marcará como alternativa):</p>}

      <div className="duo-actions">
        {options.map((option) => (
          <Button key={option.label} variant="secondary" onClick={() => onRelax(option.patch)}>
            {option.label}
          </Button>
        ))}
        {relaxed && (
          <Button variant="secondary" onClick={() => onRelax({ runtime: 0, platforms: false, oneSided: false })}>
            Volver a los filtros originales
          </Button>
        )}
        <Button variant={options.length ? "secondary" : "primary"} onClick={() => onEdit(noLocalSeries ? "mode" : "person-0")}>
          {noLocalSeries ? "Cambiar de modo" : "Editar preferencias"}
        </Button>
        {rejectedBy.history > 0 && (
          <Button variant="secondary" onClick={onOpenHistory}>
            Ver títulos excluidos
          </Button>
        )}
      </div>
    </div>
  );
}
