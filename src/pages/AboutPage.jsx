import { STEPS, TEAM } from "../data/about.js";
import { useDocumentTitle } from "../hooks/useDocumentTitle.js";

export default function AboutPage() {
  useDocumentTitle("Acerca de");

  return (
    <div className="about-page">
      <section className="about-block" aria-labelledby="titulo-proyecto">
        <div className="about-container about-container--narrow">
          <p className="about-kicker">Sobre el proyecto</p>
          <h1 id="titulo-proyecto" className="about-title">Acerca de CINET</h1>
          <p className="about-lead">
            CINET es una aplicación diseñada para que los grupos de amigos dejen de perder tiempo
            poniéndose de acuerdo sobre qué película ver. La plataforma permite buscar películas,
            revisar opciones y organizar un plan de cine de forma sencilla.
          </p>
        </div>
      </section>

      <section id="funcionamiento" className="about-block about-block--alt" aria-labelledby="titulo-funcionamiento">
        <div className="about-container">
          <h2 id="titulo-funcionamiento" className="about-heading">¿Cómo funciona CINET?</h2>
          <div className="about-steps">
            {STEPS.map((step, index) => (
              <article key={step.title} className="team-card">
                <span className="about-step-number">{index + 1}</span>
                <h3>{step.title}</h3>
                <p>{step.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="equipo" className="about-block" aria-labelledby="titulo-equipo">
        <div className="about-container">
          <h2 id="titulo-equipo" className="about-heading">Equipo</h2>
          <div className="team-grid">
            {TEAM.map((member) => (
              <article key={member.name} className="team-card">
                <h3>{member.name}</h3>
                <p className="about-role">{member.role}</p>
                <p>{member.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="atribucion" className="about-block about-attribution" aria-labelledby="titulo-atribucion">
        <div className="about-container about-container--narrow">
          <h2 id="titulo-atribucion" className="about-subheading">Fuentes de datos</h2>
          <div className="about-note">
            <p>
              Los datos de películas y tráilers son proporcionados por{" "}
              <a href="https://www.themoviedb.org" target="_blank" rel="noopener noreferrer">
                The Movie Database (TMDB)
              </a>
              .
            </p>
            <p className="about-disclaimer">
              This product uses the TMDB API but is not endorsed or certified by TMDB.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
