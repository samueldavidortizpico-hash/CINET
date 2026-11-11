import { useMemo, useState } from "react";
import Button from "../common/Button.jsx";
import Icon from "../common/Icon.jsx";
import PosterImage from "../common/PosterImage.jsx";
import { useSceneMotion } from "../../hooks/useSceneMotion.js";
import { DUO_OCCASIONS } from "../../services/duoExperience.js";
import { describeQuery, parseQuery } from "../../services/naturalQuery.js";

const CHAPTERS = [
  { icon: "film", title: "Preparen el plan", text: "Solo, en pareja o con todo el grupo. Película, serie o maratón." },
  { icon: "heart", title: "Cada quien, sus gustos", text: "Lo que les encanta y lo que prefieren evitar." },
  { icon: "sparkles", title: "Elijan y hagan el plan", text: "Comparen tres opciones o voten por turnos pasando el celular." },
];

const POSTERS = [
  { id: "dune-part-two", label: "OTROS MUNDOS", title: "Dune: Parte dos" },
  { id: "interstellar", label: "ALGO QUE TE MUEVA", title: "Interstellar" },
  { id: "coco", label: "ALGO QUE LOS UNA", title: "Coco" },
  { id: "spider-man-into-the-spider-verse", label: "NUEVAS HISTORIAS", title: "Spider-Man: un nuevo universo" },
];

export default function DuoIntro({ hasSession, onStart, onResume }) {
  const sceneMotion = useSceneMotion();
  const [query, setQuery] = useState("");
  const parsed = useMemo(() => parseQuery(query), [query]);
  const understood = describeQuery(parsed);

  return (
    <section className="duo-intro duo-premiere" aria-labelledby="duo-intro-title" {...sceneMotion}>
      <div className="duo-premiere-grain" aria-hidden="true" />
      <div className="duo-premiere-topline"><span>UNA EXPERIENCIA CINET</span><span><Icon name="ticket" /> PARA 1, 2 O TODO EL GRUPO</span></div>
      <div className="duo-premiere-grid">
        <div className="duo-premiere-copy">
          <span className="duo-badge"><Icon name="sparkles" /> CINET <b>DUO</b></span>
          <p className="duo-overline">BUENAS HISTORIAS. MEJORES PLANES.</p>
          <h1 id="duo-intro-title">Menos buscar.<br /><span>Más compartir.</span></h1>
          <p className="duo-lead">Una cita, una noche de amigos o un rato para ti. Encuentren qué ver, comparen lo que encaja y conviértanlo en un plan.</p>
          <div className="duo-actions">
            <Button variant="primary" className="duo-cta" onClick={hasSession ? onResume : () => onStart()}>{hasSession ? "Continuar la sesión" : "Preparar mi plan"} <Icon name="arrow" /></Button>
            {hasSession && <Button variant="secondary" onClick={() => onStart()}>Crear una sesión nueva</Button>}
            <Button variant="secondary" to="/duo/sala"><Icon name="screen" /> Cada quien en su celular</Button>
          </div>
          <p className="duo-premiere-note"><span>1 → 8</span> Sin contraseñas de streaming. En un teléfono o en una sala con código.</p>
        </div>
        <div className="duo-poster-stage" aria-hidden="true">
          <span className="duo-stage-word">DUO</span>
          <span className="duo-stage-orbit" /><span className="duo-stage-orbit duo-stage-orbit-small" />
          {POSTERS.map((poster, index) => (
            <div className={`duo-premiere-poster duo-premiere-poster-${index}`} key={poster.id}>
              <PosterImage src={`${import.meta.env.BASE_URL}images/${poster.id}.jpg`} alt="" />
              <span><small>{poster.label}</small><strong>{poster.title}</strong></span>
            </div>
          ))}
          <span className="duo-taste-label duo-taste-you"><Icon name="heart" /> TUS GUSTOS</span>
          <span className="duo-taste-label duo-taste-them">SUS GUSTOS <Icon name="sparkles" /></span>
          <div className="duo-match-ticket"><span className="duo-ticket-icon"><Icon name="ticket" /></span><div><small>LA MEJOR PARTE</small><strong>Elegirla juntos.</strong></div><span className="duo-ticket-stub">1–8<br /><small>BUTACAS</small></span></div>
          <span className="duo-stage-caption">MUCHAS HISTORIAS. SU PRÓXIMA FAVORITA.</span>
        </div>
        <div className="duo-occasion-section">
          <div className="duo-occasion-heading"><span className="duo-overline">EMPIECEN POR EL MOMENTO</span><h2>¿Qué plan tienen en mente?</h2><p>Un punto de partida. Después eligen sus propios gustos.</p></div>
          <form className="duo-ask" onSubmit={(event) => { event.preventDefault(); if (understood.length) onStart(null, parsed); }}>
            <label htmlFor="duo-ask-input">Cuéntanos qué quieren ver, con tus palabras</label>
            <div className="duo-ask-row">
              <input id="duo-ask-input" type="text" maxLength={200} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Una comedia corta en pareja en Netflix, nada de terror" autoComplete="off" />
              <Button type="submit" variant="primary" disabled={!understood.length}>Empezar con esto <Icon name="arrow" /></Button>
            </div>
            <div className="duo-ask-understood" aria-live="polite">
              {query.trim() && (understood.length
                ? <><span>Entendí:</span>{understood.map((part) => <span className="duo-ask-chip" key={part}>{part}</span>)}<small>Lo puedes cambiar en los siguientes pasos.</small></>
                : <small>No reconocí criterios. Prueba con un género, cuántas personas, una plataforma o cuánto tiempo tienen.</small>)}
            </div>
          </form>
          <div className="duo-occasions">
            {DUO_OCCASIONS.map((occasion) => (
              <button type="button" key={occasion.id} className="duo-occasion" onClick={() => onStart(occasion.id)}>
                <span className="duo-occasion-icon"><Icon name={occasion.icon} /></span>
                <strong>{occasion.title}</strong><small>{occasion.subtitle}</small>
                <span className="duo-occasion-meta">{occasion.people} {occasion.people === 1 ? "persona" : "personas"} · {occasion.mode === "marathon" ? "Maratón" : "Película"}<Icon name="arrow" /></span>
              </button>
            ))}
          </div>
        </div>
        <ol className="duo-premiere-chapters">
          {CHAPTERS.map(({ icon, title, text }, index) => (
            <li key={title}><span className="duo-premiere-chapter-number">0{index + 1}</span><div><Icon name={icon} /><h2>{title}</h2><p>{text}</p></div></li>
          ))}
        </ol>
      </div>
    </section>
  );
}
