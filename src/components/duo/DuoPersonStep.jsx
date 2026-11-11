import { useState } from "react";
import Button from "../common/Button.jsx";
import PosterImage from "../common/PosterImage.jsx";
import DuoCalibration from "./DuoCalibration.jsx";
import { ChoiceChips, Chip, Question } from "./DuoFields.jsx";
import { SeatAvatar } from "./DuoSeats.jsx";
import { EPISODE_OPTIONS, personName, RUNTIME_OPTIONS, SEASON_OPTIONS, seatColor, SERIES_STATUS_OPTIONS, TONES } from "../../data/duo.js";
import { GENRES } from "../../data/tmdb.js";
import { useAsync } from "../../hooks/useAsync.js";
import { useDebounced } from "../../hooks/useTitleSearch.js";
import { listEs } from "../../services/recommender.js";
import { isTmdbEnabled, searchPeople } from "../../services/tmdbClient.js";

const MAX_ACTORS = 5;
const PLACEHOLDERS = ["Ana", "Luis", "Sara", "Juan", "Valentina", "Tomás", "Lucía", "Nico"];
const GENRE_INTENTS = [{ value: "like", label: "♥ Me gusta" }, { value: "must", label: "★ Imprescindible" }, { value: "reject", label: "✕ Evitar" }];
const STATE_TEXT = { none: "sin marcar", like: "me gusta", must: "imprescindible", reject: "no quiero" };
const STATE_MARK = { none: "+", like: "♥", must: "★", reject: "✕" };

function genreState(person, key) {
  if (person.mustGenres.includes(key)) return "must";
  if (person.genres.includes(key)) return "like";
  if (person.rejectedGenres.includes(key)) return "reject";
  return "none";
}

/** Un género queda en una sola lista: me gusta, imprescindible o no quiero. */
function withGenreState(person, key, state) {
  const without = (list) => list.filter((item) => item !== key);
  const put = (list, wanted) => (state === wanted ? [...without(list), key] : without(list));
  return { ...person, genres: put(person.genres, "like"), mustGenres: put(person.mustGenres, "must"), rejectedGenres: put(person.rejectedGenres, "reject") };
}

/** Actores favoritos: autocompletado con /search/person (solo con TMDB y en películas). */
function ActorPicker({ actors, onChange }) {
  const [text, setText] = useState("");
  const query = useDebounced(text.trim(), 300);
  const tmdb = isTmdbEnabled();
  const { data: people = [], loading } = useAsync(tmdb && query.length >= 2 ? `people-${query}` : null, () => searchPeople(query));
  const suggestions = people.filter((person) => !actors.some((actor) => actor.id === person.id)).slice(0, 5);
  const full = actors.length >= MAX_ACTORS;

  const add = (person) => {
    onChange([...actors, { id: person.id, name: person.name }]);
    setText("");
  };

  return (
    <div className="duo-actors">
      {actors.length > 0 && (
        <ul className="duo-actor-chips">
          {actors.map((actor) => (
            <li key={actor.id}>
              {actor.name}
              <button type="button" aria-label={`Quitar a ${actor.name}`} onClick={() => onChange(actors.filter((item) => item.id !== actor.id))}>
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
      <label className="duo-field">
        <span className="visually-hidden">Buscar actor o actriz</span>
        <input
          type="search"
          autoComplete="off"
          placeholder={tmdb ? (full ? "Máximo 5 actores" : "Busca un actor o actriz…") : "Necesita conexión con TMDB"}
          disabled={!tmdb || full}
          value={text}
          onChange={(event) => setText(event.target.value)}
        />
      </label>
      {loading && <p className="duo-fineprint">Buscando…</p>}
      {suggestions.length > 0 && text.trim().length >= 2 && (
        <ul className="duo-actor-suggestions" aria-label="Sugerencias de actores">
          {suggestions.map((person) => (
            <li key={person.id}>
              <button type="button" onClick={() => add(person)}>
                <span className="duo-actor-photo">
                  <PosterImage src={person.photo} alt="" fallback="👤" />
                </span>
                {person.name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Géneros (me gusta / imprescindible / evitar), tono y actores: el editor completo, siempre disponible. */
function GenreEditor({ person, index, size, type, onChange }) {
  const [genreIntent, setGenreIntent] = useState("like");
  const set = (patch) => onChange({ ...person, ...patch });
  const toggleTone = (key) => set({ tone: person.tone.includes(key) ? person.tone.filter((item) => item !== key) : [...person.tone, key] });
  // TMDB no clasifica series como terror, suspenso ni romance.
  const genres = GENRES.filter((genre) => type !== "tv" || genre.tv);
  const hidden = GENRES.filter((genre) => type === "tv" && !genre.tv).map((genre) => genre.label.toLowerCase());
  const byState = (state) => genres.filter((genre) => genreState(person, genre.key) === state).map((genre) => genre.label.toLowerCase());
  const summary = [
    byState("like").length && `te gusta ${listEs(byState("like"))}`,
    byState("must").length && `imprescindible: ${listEs(byState("must"))}`,
    byState("reject").length && `no quieres ${listEs(byState("reject"))}`,
  ].filter(Boolean);

  return (
    <>
      <Question title="¿Qué historias van contigo?" hint="Elige cómo marcar y toca los géneros. Vuelve a tocar uno con el mismo estado para quitarlo.">
        <div className="duo-genre-intent" role="group" aria-label="Cómo marcar los géneros">
          <ChoiceChips name={`genre-intent-${index}`} options={GENRE_INTENTS} value={genreIntent} onChange={setGenreIntent} />
          <p>{genreIntent === "like" ? "Suma los géneros que disfrutas: es una preferencia." : genreIntent === "must" ? "Límite: cada recomendación deberá tener TODOS estos géneros." : "Límite: estos géneros nunca aparecerán."}</p>
        </div>
        <div className="duo-genres">
          {genres.map(({ key, label }) => {
            const state = genreState(person, key);
            return (
              <button
                key={key}
                type="button"
                className="duo-genre"
                data-state={state}
                aria-pressed={state !== "none"}
                aria-label={`${label}: ${STATE_TEXT[state]}. ${state === genreIntent ? "Quitar selección" : `Marcar como ${STATE_TEXT[genreIntent]}`}`}
                onClick={() => onChange(withGenreState(person, key, state === genreIntent ? "none" : genreIntent))}
              >
                <span className="duo-genre-mark" aria-hidden="true">
                  {STATE_MARK[state]}
                </span>
                <span>{label}</span>
              </button>
            );
          })}
        </div>
        <p className="duo-fineprint" aria-live="polite">
          {summary.length ? `${summary.join(" · ")}.` : size > 1 ? "Sin géneros marcados: aceptaremos cualquiera que no rechace nadie del grupo." : "Sin géneros marcados: aceptaremos cualquiera."}
        </p>
        {hidden.length > 0 && <p className="duo-fineprint">En series, TMDB no usa {listEs(hidden)} como géneros.</p>}
      </Question>

      <Question title="¿Cómo quieres sentirte?" hint="Opcional. El tono se deduce de géneros y palabras clave de TMDB: orienta, no certifica.">
        <div className="duo-chips">
          {TONES.map(({ key, label, icon }) => (
            <Chip key={key} checked={person.tone.includes(key)} onChange={() => toggleTone(key)}>
              <span aria-hidden="true">{icon}</span> {label[0].toUpperCase() + label.slice(1)}
            </Chip>
          ))}
        </div>
      </Question>

      {type !== "tv" && (
        <Question title="Actores o actrices favoritos (opcional)">
          <ActorPicker actors={person.actors} onChange={(actors) => set({ actors })} />
        </Question>
      )}
    </>
  );
}

/** Límites de la persona: se cumplen siempre (contrato de límites del motor). */
function Limits({ person, index, type, onChange }) {
  const set = (patch) => onChange({ ...person, ...patch });
  return (
    <div className="duo-limits-box">
      <p className="duo-limits-title">
        <span aria-hidden="true">⛨</span> Límites: se cumplen siempre
      </p>
      {type === "tv" ? (
        <>
          <Question title="Duración de cada episodio">
            <ChoiceChips name={`duo-episode-${index}`} options={EPISODE_OPTIONS} value={person.episodeMax} onChange={(episodeMax) => set({ episodeMax })} />
          </Question>
          <Question title="Número de temporadas" hint="Si TMDB no conoce el dato, la serie no se da por válida.">
            <ChoiceChips name={`duo-seasons-${index}`} options={SEASON_OPTIONS} value={person.seasonsMax} onChange={(seasonsMax) => set({ seasonsMax })} />
          </Question>
          <Question title="Estado de la serie">
            <ChoiceChips name={`duo-status-${index}`} options={SERIES_STATUS_OPTIONS} value={person.seriesStatus} onChange={(seriesStatus) => set({ seriesStatus })} />
          </Question>
        </>
      ) : (
        <Question title="Duración máxima de la película" hint="Una película sin duración confirmada no se da por válida.">
          <ChoiceChips name={`duo-runtime-${index}`} options={RUNTIME_OPTIONS} value={person.maxRuntime} onChange={(maxRuntime) => set({ maxRuntime })} />
        </Question>
      )}
    </div>
  );
}

/** Escena 2 · Mostrar gustos: una butaca por persona, con películas o con géneros, y sus límites. */
export default function DuoPersonStep({ index, size, person, type, nextName, onChange, onBack, onNext }) {
  const declared = person.genres.length + person.mustGenres.length + person.rejectedGenres.length + person.actors.length > 0;
  const [way, setWay] = useState(declared && !person.titles.length ? "genres" : "posters");
  const name = personName(person, index);
  const solo = size === 1;

  const submit = (event) => {
    event.preventDefault();
    onNext();
  };

  return (
    <form className="duo-step duo-scene duo-scene-taste" style={{ "--person-accent": seatColor(index) }} aria-labelledby={`duo-person-${index}-title`} onSubmit={submit}>
      <header className="duo-taste-head">
        <SeatAvatar index={index} name={name} className="is-lg" />
        <div>
          <p className="duo-overline">{solo ? "TU BUTACA" : `BUTACA ${index + 1} DE ${size}`}</p>
          <h2 id={`duo-person-${index}-title`}>
            {solo ? (
              "Muéstranos tus gustos"
            ) : (
              <>
                Turno de <span className="duo-accent">{name}</span>
              </>
            )}
          </h2>
          <p className="duo-lead">{solo ? "Con películas que conoces o con géneros. Puedes saltarlo." : `Responde solo por ti; al final buscamos lo que encaja con ${size === 2 ? "los dos" : "todo el grupo"}.`}</p>
        </div>
        <label className="duo-field duo-name-field">
          <span>Nombre</span>
          <input type="text" maxLength={20} autoComplete="off" placeholder={`Ej. ${PLACEHOLDERS[index % PLACEHOLDERS.length]}`} value={person.name} onChange={(event) => onChange({ ...person, name: event.target.value })} />
        </label>
      </header>

      <div className="duo-ways" role="group" aria-label="Cómo mostrar tus gustos">
        <button type="button" aria-pressed={way === "posters"} onClick={() => setWay("posters")}>
          <strong>Con películas</strong>
          <small>{person.titles.length ? `${person.titles.length} respondidas` : "Responde pósteres"}</small>
        </button>
        <button type="button" aria-pressed={way === "genres"} onClick={() => setWay("genres")}>
          <strong>Géneros y actores</strong>
          <small>{declared ? "Con selección" : "El editor completo"}</small>
        </button>
      </div>

      <div className="duo-way-panel" key={way}>
        {way === "posters" ? <DuoCalibration person={person} onChange={onChange} solo={solo} /> : <GenreEditor person={person} index={index} size={size} type={type} onChange={onChange} />}
      </div>

      <Limits person={person} index={index} type={type} onChange={onChange} />

      <div className="duo-actions duo-scene-cta">
        <Button variant="secondary" onClick={onBack}>
          ← Atrás
        </Button>
        <Button variant="primary" className="duo-cta" type="submit">
          {nextName ? `Turno de ${nextName} →` : "Continuar →"}
        </Button>
      </div>
    </form>
  );
}
