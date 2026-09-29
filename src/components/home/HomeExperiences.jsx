import { Link } from "react-router-dom";
import Icon from "../common/Icon.jsx";
import { useReveal } from "../../hooks/useReveal.js";
import { useSceneMotion } from "../../hooks/useSceneMotion.js";

const PATHS = [
  { to: "/movies", icon: "film", number: "01", title: "Déjate sorprender", copy: "Explora películas, series y nuevas favoritas.", art: "dune-part-two" },
  { to: "/cine", icon: "ticket", number: "02", title: "Nos vemos en el cine", copy: "Cartelera y próximos estrenos en Colombia.", art: "top-gun-maverick" },
  { to: "/my-plans", icon: "heart", number: "03", title: "Hazlo un plan", copy: "Organiza esa salida que tienen pendiente.", art: "coco" },
];

export function HomeExperiences() {
  const [ref, revealClass] = useReveal();
  return (
    <nav ref={ref} className={`home-experiences ${revealClass}`} aria-label="Encuentra tu próximo plan">
      {PATHS.map(({ to, icon, number, title, copy, art }) => (
        <Link className="experience-link" key={to} to={to}>
          <img className="experience-art" src={`${import.meta.env.BASE_URL}images/${art}.jpg`} alt="" loading="lazy" />
          <span className="experience-icon"><Icon name={icon} /></span>
          <span className="experience-content"><span className="experience-number">{number} / A TU MANERA</span><strong>{title}</strong><span>{copy}</span></span>
          <Icon name="diagonal" className="experience-arrow" />
        </Link>
      ))}
    </nav>
  );
}

export function DuoSpotlight() {
  const [ref, revealClass] = useReveal();
  const sceneMotion = useSceneMotion();
  return (
    <section ref={ref} className={`duo-spotlight ${revealClass}`} aria-labelledby="duo-spotlight-title" {...sceneMotion}>
      <div className="duo-spotlight-copy">
        <p className="landing-eyebrow"><Icon name="heart" /> CINET DUO</p>
        <h2 id="duo-spotlight-title">Dos gustos.<br /><span>Una gran película.</span></h2>
        <p>Menos «elige tú». Más darle al play. Combinen sus gustos y descubran qué ver juntos.</p>
        <Link className="btn duo-spotlight-cta" to="/duo">Encontrar nuestra película <Icon name="arrow" /></Link>
        <span className="duo-spotlight-note">DOS OPINIONES. UNA GRAN ELECCIÓN.</span>
      </div>
      <div className="duo-art" aria-hidden="true">
        <span className="duo-art-aura duo-art-aura-one" /><span className="duo-art-aura duo-art-aura-two" />
        <span className="duo-art-orbit" /><span className="duo-art-orbit duo-art-orbit-inner" />
        <div className="duo-art-poster duo-art-poster-one"><img src={`${import.meta.env.BASE_URL}images/interstellar.jpg`} alt="" loading="lazy" width="200" height="300" /><span>TU UNIVERSO</span></div>
        <div className="duo-art-poster duo-art-poster-two"><img src={`${import.meta.env.BASE_URL}images/coco.jpg`} alt="" loading="lazy" width="200" height="300" /><span>SU UNIVERSO</span></div>
        <span className="duo-art-match"><Icon name="heart" /></span>
        <span className="duo-art-caption">EL CINE SE DISFRUTA MÁS EN COMPAÑÍA</span>
      </div>
    </section>
  );
}
