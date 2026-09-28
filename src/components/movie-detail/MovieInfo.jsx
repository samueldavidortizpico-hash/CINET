/**
 * Ficha de la película o serie. `children` (las acciones) va entre las etiquetas
 * y los datos extra. Con `extras` (TMDB) muestra duración real, idioma, país y géneros.
 */
export default function MovieInfo({ movie, extras, children }) {
  const meta = [
    `📅 ${movie.year}`,
    `⏱️ ${extras?.runtime ?? movie.duration}`,
    extras?.seasons && `📺 ${extras.seasons} temporada${extras.seasons === 1 ? "" : "s"}`,
    extras?.language && `🗣️ ${extras.language}`,
    extras?.countries?.length && `🌎 ${extras.countries.slice(0, 2).join(", ")}`,
    extras?.certification && `🔞 ${extras.certification}`,
  ].filter(Boolean);
  const chips = extras?.genres?.length ? extras.genres : (movie.tags ?? []);
  const directors = extras?.directors?.map((person) => person.name).join(", ");
  // Solo datos reales: sin valores de relleno ("CineHub", "HD") cuando TMDB o el catálogo no los tienen.
  const universe = movie.universe && movie.universe !== "Serie" ? movie.universe : null;
  const extra = [
    [movie.type === "tv" ? "Creación" : "Dirección", directors || movie.director],
    [extras?.collection ? "Saga" : "Universo", extras?.collection?.name || universe],
    ["Calidad", movie.quality],
  ].filter(([, value]) => value);

  return (
    <div className="movie-info">
      <div className="movie-kicker">{movie.type === "tv" ? "SERIE" : movie.genre}</div>
      <h1 id="movie-title" className="movie-title">
        {movie.title}
      </h1>

      <div className="movie-meta">
        <span className="movie-meta-item movie-rating">⭐ {movie.rating}</span>
        {meta.map((item) => (
          <span key={item} className="movie-meta-item">
            {item}
          </span>
        ))}
      </div>

      <p className="movie-description">{movie.description}</p>

      <div className="movie-tags">
        {chips.map((tag) => (
          <span key={tag} className="movie-tag">
            {tag}
          </span>
        ))}
      </div>

      {children}

      {extra.length > 0 && (
        <div className="movie-extra">
          {extra.map(([label, value]) => (
            <div key={label} className="movie-extra-card">
              <span className="movie-extra-label">{label}</span>
              <strong>{value}</strong>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
