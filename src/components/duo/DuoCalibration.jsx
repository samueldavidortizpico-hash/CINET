import { useState } from "react";
import PosterImage from "../common/PosterImage.jsx";
import { CALIBRATION_ANSWERS, CALIBRATION_IDS } from "../../data/duo.js";
import { useAsync } from "../../hooks/useAsync.js";
import { getMovies } from "../../services/movieService.js";
import { genreName, listEs } from "../../services/recommender.js";
import { fallbackPoster } from "../../utils/poster.js";

const answerOf = (key) => CALIBRATION_ANSWERS.find((answer) => answer.key === key);

async function loadDeck() {
  const byId = new Map((await getMovies()).map((title) => [title.id, title]));
  return CALIBRATION_IDS.map((id) => byId.get(id)).filter(Boolean);
}

/** Lo que se guarda: lo justo para comparar (géneros, saga) y reconocer el título; nunca se envía a analítica. */
const snapshot = (title, answer) => ({
  id: title.id,
  ids: [title.id, title.tmdbId && `tmdb-movie-${title.tmdbId}`].filter(Boolean),
  title: title.title,
  year: title.year,
  poster: title.poster,
  genreKeys: title.genreKeys,
  answer,
});

/** Géneros que comparten al menos dos respuestas iguales y la persona aún no marcó: una inferencia, no un gusto. */
function suggestions(person) {
  const marked = new Set([...person.genres, ...person.mustGenres, ...person.rejectedGenres]);
  const shared = (answer) => {
    const counts = new Map();
    person.titles.filter((item) => item.answer === answer).forEach((item) => item.genreKeys.forEach((key) => counts.set(key, (counts.get(key) ?? 0) + 1)));
    return [...counts].filter(([key, count]) => count >= 2 && !marked.has(key)).map(([key]) => key);
  };
  return [...shared("love").map((key) => ({ key, kind: "like" })), ...shared("nope").map((key) => ({ key, kind: "reject" }))];
}

/**
 * Calibración opcional por pósteres: una película a la vez, cuatro respuestas, deshacer y revisar.
 * "Ya la vi" no es "me gustó"; "No la conozco" no es un rechazo; un "no" no veta su género.
 * Lo inferido se propone y solo se aplica si la persona lo acepta.
 */
export default function DuoCalibration({ person, onChange, solo }) {
  const { data: deck, error } = useAsync("duo-calibration", loadDeck);
  const [revising, setRevising] = useState(null);
  const [dismissed, setDismissed] = useState([]);
  const [announce, setAnnounce] = useState("");

  if (error) return <p className="duo-notice">No pudimos cargar las películas de calibración. Usa «Géneros y actores».</p>;
  if (!deck) return <div className="duo-cal-skeleton" aria-busy="true" aria-label="Cargando películas para calibrar" />;

  const answers = new Map(person.titles.map((item) => [item.id, item]));
  const pending = deck.filter((title) => !answers.has(title.id));
  const current = (revising && deck.find((title) => title.id === revising)) || pending[0] || null;
  const answered = deck.filter((title) => answers.has(title.id)).length;

  const answer = (key) => {
    const others = person.titles.filter((item) => item.id !== current.id);
    onChange({ ...person, titles: [...others, snapshot(current, key)] });
    setAnnounce(`${current.title}: ${answerOf(key).label}.`);
    setRevising(null);
  };
  const undo = () => {
    const last = person.titles.at(-1);
    if (!last) return;
    onChange({ ...person, titles: person.titles.slice(0, -1) });
    setAnnounce(`Deshecho: ${last.title}.`);
    setRevising(null);
  };
  const accept = ({ key, kind }) =>
    onChange(
      kind === "like"
        ? { ...person, genres: [...person.genres, key] }
        : { ...person, rejectedGenres: [...person.rejectedGenres, key], genres: person.genres.filter((item) => item !== key) }
    );
  const ideas = suggestions(person).filter((idea) => !dismissed.includes(`${idea.kind}-${idea.key}`));
  const you = solo ? "te" : "le";

  return (
    <div className="duo-cal">
      <div className="duo-cal-head">
        <p className="duo-cal-count">
          <strong>{answered}</strong> de {deck.length} · {answered >= 3 ? "ya sabemos por dónde ir; sigue si quieres" : "con 3 a 5 respuestas basta"}
        </p>
        <button type="button" className="duo-link" onClick={undo} disabled={!person.titles.length}>
          ↶ Deshacer
        </button>
      </div>

      {current ? (
        <article className="duo-cal-card" aria-labelledby="duo-cal-title">
          <div className="duo-cal-poster" key={`poster-${current.id}`}>
            <PosterImage src={current.poster} alt={`Póster de ${current.title}`} fallback={<img src={fallbackPoster(current)} alt="" />} />
          </div>
          <div className="duo-cal-info" key={`info-${current.id}`}>
            <h3 id="duo-cal-title">{current.title}</h3>
            <p className="duo-card-meta">
              {current.year} · {listEs(current.genreKeys.map(genreName))}
            </p>
            {revising && <p className="duo-fineprint">Revisando: {answerOf(answers.get(current.id)?.answer)?.label ?? "sin respuesta"}.</p>}
          </div>
          <div className="duo-cal-answers" role="group" aria-label={`¿Qué ${you} parece «${current.title}»?`}>
            {CALIBRATION_ANSWERS.map((option) => (
              <button
                key={option.key}
                type="button"
                className="duo-cal-answer"
                data-answer={option.key}
                aria-pressed={answers.get(current.id)?.answer === option.key}
                onClick={() => answer(option.key)}
              >
                <span aria-hidden="true">{option.icon}</span>
                {option.label}
              </button>
            ))}
          </div>
          {revising && (
            <button type="button" className="duo-link duo-cal-back" onClick={() => setRevising(null)}>
              Dejarla como estaba
            </button>
          )}
        </article>
      ) : (
        <p className="duo-cal-done" role="status">
          Listo: {answered} películas respondidas. Puedes cambiar cualquier respuesta tocando su póster.
        </p>
      )}

      {person.titles.length > 0 && (
        <ol className="duo-cal-strip" aria-label="Tus respuestas">
          {person.titles.map((item) => (
            <li key={item.id} data-answer={item.answer}>
              <button type="button" aria-label={`${item.title}: ${answerOf(item.answer).label}. Cambiar respuesta`} aria-current={revising === item.id || undefined} onClick={() => setRevising(item.id)}>
                <PosterImage src={item.poster} alt="" fallback={<img src={fallbackPoster(item)} alt="" />} />
                <span className="duo-cal-mark" aria-hidden="true">{answerOf(item.answer).icon}</span>
              </button>
            </li>
          ))}
        </ol>
      )}

      {ideas.length > 0 && (
        <div className="duo-cal-ideas" role="status">
          {ideas.slice(0, 2).map((idea) => (
            <p key={`${idea.kind}-${idea.key}`}>
              {idea.kind === "like"
                ? `Las que ${solo ? "te encantan" : "le encantan"} comparten ${genreName(idea.key)}. ¿Lo sumamos a ${solo ? "tus" : "sus"} gustos?`
                : `Dos que no son para ${solo ? "ti" : "esta persona"} comparten ${genreName(idea.key)}. ¿Lo evitamos?`}
              <span>
                <button type="button" className="duo-chip-btn" onClick={() => accept(idea)}>
                  {idea.kind === "like" ? `Sí, sumar ${genreName(idea.key)}` : `Sí, evitar ${genreName(idea.key)}`}
                </button>
                <button type="button" className="duo-link" onClick={() => setDismissed((list) => [...list, `${idea.kind}-${idea.key}`])}>
                  No me representa
                </button>
              </span>
            </p>
          ))}
        </div>
      )}

      <p className="duo-fineprint">
        «Ya la vi» no cuenta como gusto. «Me encanta» y «Ya la vi» solo evitan recomendarla si todos la vieron. Un «No es para mí» baja lo parecido; no
        prohíbe un género.
      </p>
      <p className="visually-hidden" aria-live="polite">
        {announce}
      </p>
    </div>
  );
}
