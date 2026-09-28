import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Button from "../common/Button.jsx";
import DiceButton from "../common/DiceButton.jsx";
import PosterImage from "../common/PosterImage.jsx";
import SkeletonRow from "../common/SkeletonRow.jsx";
import DuoEmptyState from "./DuoEmptyState.jsx";
import { MARATHON_STYLES } from "../../data/duo.js";
import { usePlans } from "../../hooks/usePlans.js";
import { useToast } from "../../hooks/useToast.js";
import { getShowtimes } from "../../services/movieService.js";
import { recommendedStart, toPlanMovie } from "../../services/planService.js";
import { buildMarathon, describeMarathon, formatMinutes, removeFromMarathon, replaceInMarathon } from "../../services/recommender.js";
import { fallbackPoster } from "../../utils/poster.js";

/** 130 → "2:10" (reloj relativo desde el inicio de la maratón). */
const clock = (minutes) => `${Math.floor(minutes / 60)}:${String(Math.round(minutes) % 60).padStart(2, "0")}`;

/** Paso 6 en modo Maratón: plan ordenado que cabe en su tiempo, con dado por título y para todo. */
export default function DuoMarathon({ session, profile, candidates, ranked, onSession, onEdit, onOpenHistory }) {
  const settings = session.marathon;
  const plan = session.marathonPlan;
  const items = useMemo(() => ranked?.items ?? [], [ranked]);
  const view = describeMarathon(plan, items, settings);
  const { selectShowtime } = usePlans();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [dates] = useState(() => getShowtimes().dates);
  const [day, setDay] = useState(0);
  const [announce, setAnnounce] = useState("");
  const tv = settings.type === "tv";
  const style = MARATHON_STYLES.find((item) => item.key === settings.style);
  const episodes = view.rows.reduce((total, row) => total + (row.episodes ?? 0), 0);
  const used = Math.min(100, Math.round((view.total / settings.maxMinutes) * 100));

  // Primera vez (o tras cambiar preferencias): la mejor maratón posible, sin azar.
  useEffect(() => {
    if (ranked && !plan) onSession({ marathonPlan: buildMarathon(items, settings) });
  }, [ranked, plan, items, settings, onSession]);

  const regenerate = () => {
    const avoid = plan?.entries.map((entry) => entry.id) ?? [];
    let next = buildMarathon(items, settings, { random: Math.random, avoid });
    if (!next.entries.length) next = buildMarathon(items, settings, { random: Math.random }); // no hay otros: se permite repetir
    onSession({ marathonPlan: next });
    setAnnounce(`Nueva maratón con ${next.entries.length} ${tv ? "series" : "títulos"}.`);
  };

  const replace = (id, name) => {
    const result = replaceInMarathon(plan, id, items, settings);
    if (!result) {
      showToast("No hay otro título válido que quepa en ese hueco.");
      return;
    }
    onSession({ marathonPlan: result.plan });
    setAnnounce(`${name} cambió por ${result.item.title.title}, elegida al azar entre ${result.poolSize} opciones. ${result.item.reasons[0]}`);
  };

  const remove = (id, name) => {
    onSession({ marathonPlan: removeFromMarathon(plan, id) });
    setAnnounce(`${name} salió de la maratón.`);
  };

  const saveAsPlan = () => {
    const date = dates[day];
    selectShowtime({
      movie: toPlanMovie(view.rows[0].item.title),
      cinema: { name: "En casa", location: "Maratón CINET Duo" },
      date: date.label,
      dateISO: date.iso,
      time: recommendedStart(view.total),
      mode: "home",
      duration: formatMinutes(view.total),
      marathon: view.rows.map(({ item, minutes, episodes: count }) => ({ id: item.title.id, title: item.title.title, minutes, episodes: count })),
    });
    navigate("/create-plan");
  };

  const relax = (patch) => onSession((current) => ({ relax: { ...current.relax, ...patch }, marathonPlan: null }));

  return (
    <section className="duo-results duo-marathon" aria-labelledby="duo-marathon-title">
      <div className="duo-results-head">
        <div>
          <h2 id="duo-marathon-title">Su maratón</h2>
          <p>
            {style?.label} · {tv ? "episodios de series" : "películas"} · {settings.scope === "saga" ? "saga o universo" : "mezcla"} ·{" "}
            <button type="button" className="duo-link" onClick={() => onEdit("mode")}>
              Cambiar ajustes
            </button>
          </p>
        </div>
        <div className="duo-actions">
          <DiceButton
            label="Regenerar maratón"
            ariaLabel="Regenerar toda la maratón al azar entre títulos que cumplen sus filtros"
            disabled={!items.length}
            onRoll={regenerate}
          />
        </div>
      </div>

      {candidates?.notice && (
        <p className="duo-notice" role="status">
          {candidates.notice}
        </p>
      )}
      {plan?.notice && <p className="duo-notice">{plan.notice}</p>}
      <p className="visually-hidden" aria-live="polite">
        {announce}
      </p>

      {!ranked && <SkeletonRow variant="grid" count={3} label="Armando su maratón…" />}

      {ranked && plan && view.rows.length === 0 && (
        <DuoEmptyState ranked={ranked} profile={profile} source={candidates?.source} onRelax={relax} onEdit={onEdit} onOpenHistory={onOpenHistory} />
      )}

      {view.rows.length > 0 && (
        <>
          <div className="duo-marathon-stats">
            <div>
              <strong>{formatMinutes(view.total)}</strong>
              <span>Duración total estimada</span>
            </div>
            <div>
              <strong>{tv ? episodes : view.rows.length}</strong>
              <span>{tv ? `episodios de ${view.rows.length} serie${view.rows.length === 1 ? "" : "s"}` : "títulos"}</span>
            </div>
            <div>
              <strong>{formatMinutes(Math.max(view.remaining, 0))}</strong>
              <span>Tiempo libre de {formatMinutes(settings.maxMinutes)}</span>
            </div>
          </div>
          <div className="duo-meter" role="img" aria-label={`Ocupa ${used} % de las ${formatMinutes(settings.maxMinutes)} disponibles`}>
            <span style={{ width: `${used}%` }} />
          </div>
          {view.approx && <p className="duo-fineprint">Algunas duraciones son máximas: TMDB solo confirma que no pasan de su límite.</p>}
          {view.missing > 0 && (
            <p className="duo-fineprint">
              {view.missing} título{view.missing === 1 ? "" : "s"} ya no cumple{view.missing === 1 ? "" : "n"} sus filtros y salió de la lista.
            </p>
          )}

          <h3 className="duo-subtitle">Orden recomendado</h3>
          <ol className="duo-marathon-list">
            {view.rows.map((row, index) => {
              const { title } = row.item;
              return (
                <li key={title.id} className="duo-marathon-item">
                  <span className="duo-marathon-order" aria-hidden="true">
                    {index + 1}
                  </span>
                  <Link to={`/movie/${title.id}`} className="duo-marathon-poster" tabIndex={-1} aria-hidden="true">
                    <PosterImage src={title.poster} alt="" fallback={<img src={fallbackPoster(title)} alt="" />} />
                  </Link>
                  <div className="duo-marathon-info">
                    <h4>
                      <Link to={`/movie/${title.id}`}>{title.title}</Link>
                    </h4>
                    <p className="duo-card-meta">
                      {row.episodes
                        ? `Primeros ${row.episodes} episodio${row.episodes === 1 ? "" : "s"} · ${title.runtime ? `unos ${title.runtime}` : `hasta ${title.runtimeCap}`} min c/u`
                        : `${title.year} · ${formatMinutes(row.minutes)}${row.approx ? " como máximo" : ""}`}
                    </p>
                    <p className="duo-marathon-time">
                      {clock(row.start)} → {clock(row.start + row.minutes)} · después quedan {formatMinutes(Math.max(row.remainingAfter, 0))}
                    </p>
                    <p className="duo-why">{row.item.reasons[0]}</p>
                  </div>
                  <div className="duo-marathon-actions">
                    <DiceButton compact ariaLabel={`Reemplazar ${title.title} por otro título al azar`} onRoll={() => replace(title.id, title.title)} />
                    <button type="button" className="duo-action" aria-label={`Quitar ${title.title} de la maratón`} onClick={() => remove(title.id, title.title)}>
                      Quitar
                    </button>
                  </div>
                </li>
              );
            })}
          </ol>

          <div className="duo-marathon-save">
            <label className="duo-field duo-field-inline">
              <span>Día</span>
              <select value={day} onChange={(event) => setDay(Number(event.target.value))}>
                {dates.map((date, index) => (
                  <option key={date.iso} value={index}>
                    {date.label}
                  </option>
                ))}
              </select>
            </label>
            <Button variant="primary" className="duo-cta" onClick={saveAsPlan}>
              Guardar la maratón como plan
            </Button>
          </div>
        </>
      )}
    </section>
  );
}
