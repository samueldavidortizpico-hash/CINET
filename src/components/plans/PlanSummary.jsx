import PosterImage from "../common/PosterImage.jsx";
import { getPlanPoster, marathonTitles } from "../../services/planService.js";

/** Función elegida en /functions, mostrada antes de crear el plan. */
export default function PlanSummary({ selection }) {
  const movie = selection?.movie;
  const rows = [
    [selection?.mode === "home" ? "📺 Dónde" : "📍 Cine", selection && `${selection.cinema.name} · ${selection.cinema.location}`],
    ...(selection?.marathon ? [["🍿 Maratón", marathonTitles(selection)]] : []),
    ["📅 Fecha", selection?.date],
    ["🕐 Hora", selection?.time],
    ...((selection ?? {}).mode === "home"
      ? [
          ["⏱️ Duración", (selection ?? {}).duration],
          ["🎭 Ambiente", (selection ?? {}).ambience],
          ["🍕 Comida", (selection ?? {}).food],
        ].filter(([, value]) => value)
      : []),
  ];

  return (
    <>
      <div className="selected-plan" id="selected-plan">
        <div id="plan-poster">
          <PosterImage src={selection && getPlanPoster(selection)} alt={`Póster de ${movie?.title}`} />
        </div>
        <div>
          <span className="section-kicker">PELÍCULA</span>
          <h1 id="plan-movie-title">{movie?.title ?? "No hay una función seleccionada"}</h1>
          <p id="plan-movie-description">
            {movie
              ? `⭐ ${movie.rating} · ${movie.year} · ${movie.duration}`
              : "Primero selecciona una película, cine, fecha y horario."}
          </p>
        </div>
      </div>

      <div className="plan-data">
        {rows.map(([label, value]) => (
          <div key={label}>
            <span>{label}</span>
            <strong>{value || "—"}</strong>
          </div>
        ))}
      </div>
    </>
  );
}
