import Button from "../common/Button.jsx";
import Icon from "../common/Icon.jsx";
import PosterImage from "../common/PosterImage.jsx";
import { useSceneMotion } from "../../hooks/useSceneMotion.js";

const CHAPTERS = [
  { icon: "film", title: "Preparen el plan", text: "Solo, en pareja o con todo el grupo. Película, serie o maratón." },
  { icon: "heart", title: "Cada quien, sus gustos", text: "Lo que les encanta y lo que prefieren evitar." },
  { icon: "sparkles", title: "Voten y elijan", text: "Una ronda de votos secretos revela el match del grupo." },
];

const POSTERS = [
  { id: "dune-part-two", label: "OTROS MUNDOS", title: "Dune: Parte dos" },
  { id: "interstellar", label: "ALGO QUE TE MUEVA", title: "Interstellar" },
  { id: "coco", label: "ALGO QUE LOS UNA", title: "Coco" },
  { id: "spider-man-into-the-spider-verse", label: "NUEVAS HISTORIAS", title: "Spider-Man: un nuevo universo" },
];

export default function DuoIntro({ hasSession, onStart, onResume }) {
  const sceneMotion = useSceneMotion();

  return (
    <section className="duo-intro duo-premiere" aria-labelledby="duo-intro-title" {...sceneMotion}>
      <div className="duo-premiere-grain" aria-hidden="true" />
      <div className="duo-premiere-topline"><span>UNA EXPERIENCIA CINET</span><span><Icon name="ticket" /> PARA 1, 2 O TODO EL GRUPO</span></div>
      <div className="duo-premiere-grid">
        <div className="duo-premiere-copy">
          <span className="duo-badge"><Icon name="sparkles" /> CINET <b>DUO</b></span>
          <h1 id="duo-intro-title">Diferentes<br />gustos.<br /><span>Mismo plan.</span></h1>
          <p className="duo-lead">Cada quien trae sus favoritas. Duo cruza los gustos de todos y encuentra esa historia a la que el grupo entero le dice <strong>«sí, esta».</strong></p>
          <div className="duo-actions">
            <Button variant="primary" className="duo-cta" onClick={hasSession ? onResume : onStart}>{hasSession ? "Continuar la sesión" : "Encontrar qué ver"} <Icon name="arrow" /></Button>
            {hasSession && <Button variant="secondary" onClick={onStart}>Crear una sesión nueva</Button>}
          </div>
          <p className="duo-premiere-note"><span>1 → 8</span> Muchas opiniones. Una elección justa.</p>
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
        <ol className="duo-premiere-chapters">
          {CHAPTERS.map(({ icon, title, text }, index) => (
            <li key={title}><span className="duo-premiere-chapter-number">0{index + 1}</span><div><Icon name={icon} /><h2>{title}</h2><p>{text}</p></div></li>
          ))}
        </ol>
      </div>
    </section>
  );
}
