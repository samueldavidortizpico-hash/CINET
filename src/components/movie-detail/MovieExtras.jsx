import { Link } from "react-router-dom";
import PosterImage from "../common/PosterImage.jsx";
import { OFFER_TYPES } from "../../data/platforms.js";
import { regionName } from "../../data/tmdb.js";

// Mediodía local: "2014-11-05" no se corre al día anterior por zona horaria.
const formatDate = (iso) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString("es-CO", { day: "numeric", month: "long", year: "numeric" });

function Block({ title, children, className = "" }) {
  return (
    <div className={`extras-block ${className}`.trim()}>
      <h2>{title}</h2>
      {children}
    </div>
  );
}

function WhereToWatch({ watch }) {
  const groups = OFFER_TYPES.filter(([key]) => watch.offers[key].length > 0);
  return (
    <Block title={`Disponible en ${regionName(watch.region)}`} className="extras-watch">
      {groups.length === 0 && <p>TMDB no registra plataformas para este título en esta región.</p>}
      <div className="extras-offers">
        {groups.map(([key, label]) => (
          <div key={key} className="extras-offer">
            <h3>{label}</h3>
            <ul className="extras-providers">
              {watch.offers[key].map((provider) => (
                <li key={provider.id}>
                  {provider.logo && <img src={provider.logo} alt="" loading="lazy" width="36" height="36" />}
                  {provider.name}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <p className="extras-note">
        Disponibilidad según JustWatch vía TMDB; puede cambiar.{" "}
        {watch.link && (
          <a href={watch.link} target="_blank" rel="noopener noreferrer">
            Ver opciones ↗
          </a>
        )}
      </p>
    </Block>
  );
}

function PeopleRow({ people }) {
  return (
    <ul className="extras-people">
      {people.map((person) => (
        <li key={person.id}>
          <span className="extras-photo">
            <PosterImage src={person.photo} alt="" fallback="👤" />
          </span>
          <strong>{person.name}</strong>
          {person.role && <small>{person.role}</small>}
        </li>
      ))}
    </ul>
  );
}

/**
 * Información de TMDB bajo la ficha: disponibilidad, dirección, reparto,
 * "También te puede gustar" e información adicional. Sin token o sin tmdbId no se muestra.
 */
export default function MovieExtras({ extras }) {
  if (!extras) return null;
  const { cast, directors, crew, keywords, related, watch, collection } = extras;
  const facts = [
    ["Estreno", extras.releaseDate && formatDate(extras.releaseDate)],
    ["Duración", extras.runtime],
    ["Idioma original", extras.language],
    ["País", extras.countries.join(", ")],
    ["Clasificación", extras.certification],
  ].filter(([, value]) => value);

  return (
    <section className="movie-extras" aria-label="Más información de TMDB">
      <div className="movie-extras-inner">
        {watch && <WhereToWatch watch={watch} />}

        {directors.length > 0 && (
          <Block title={directors[0].role === "Creación" ? "Creación" : "Dirección"}>
            <PeopleRow people={directors} />
          </Block>
        )}

        {cast.length > 0 && (
          <Block title="Reparto principal">
            <PeopleRow people={cast} />
          </Block>
        )}

        {related.length > 0 && (
          <Block title="También te puede gustar">
            <ul className="extras-similar">
              {related.map((title) => (
                <li key={title.id}>
                  <Link to={`/movie/${title.id}`}>
                    <PosterImage src={title.poster} alt={`Póster de ${title.title}`} />
                    <span>{title.title}</span>
                    <small>
                      ★ {title.rating} · {title.type === "tv" ? "Serie" : title.year}
                    </small>
                  </Link>
                </li>
              ))}
            </ul>
          </Block>
        )}

        <Block title="Información adicional" className="extras-info">
          {facts.length > 0 && (
            <dl className="extras-facts">
              {facts.map(([label, value]) => (
                <div key={label}>
                  <dt>{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
          )}
          {collection && (
            <p className="extras-collection">
              {collection.poster && <img src={collection.poster} alt="" loading="lazy" width="46" height="69" />}
              <span>
                Parte de la saga <strong>{collection.name}</strong>
              </span>
            </p>
          )}
          {crew.length > 0 && (
            <ul className="extras-crew">
              {crew.map((person) => (
                <li key={person.id}>
                  <strong>{person.name}</strong> <small>{person.role}</small>
                </li>
              ))}
            </ul>
          )}
          {keywords.length > 0 && (
            <div className="movie-tags extras-keywords">
              {keywords.map((keyword) => (
                <span key={keyword} className="movie-tag">
                  {keyword}
                </span>
              ))}
            </div>
          )}
        </Block>

        <p className="tmdb-attribution">This product uses the TMDB API but is not endorsed or certified by TMDB.</p>
      </div>
    </section>
  );
}
