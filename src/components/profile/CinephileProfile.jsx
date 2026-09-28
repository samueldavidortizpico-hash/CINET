import { Link } from "react-router-dom";
import Button from "../common/Button.jsx";
import PosterImage from "../common/PosterImage.jsx";
import SkeletonRow from "../common/SkeletonRow.jsx";
import { useAsync } from "../../hooks/useAsync.js";
import { useDuoHistory } from "../../hooks/useDuoHistory.js";
import { useFavorites } from "../../hooks/useFavorites.js";
import { getMoviesByIds, getTasteStats } from "../../services/movieService.js";

function PosterList({ title, titles, empty }) {
  return (
    <div className="cinephile-list">
      <h3>
        {title} <span>{titles.length}</span>
      </h3>
      {titles.length ? (
        <ul className="extras-similar">
          {titles.map((item) => (
            <li key={item.id}>
              <Link to={`/movie/${item.id}`}>
                <PosterImage src={item.poster} alt={`Póster de ${item.title}`} />
                <span>{item.title}</span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="collection-empty">{empty}</p>
      )}
    </div>
  );
}

/** Perfil cinéfilo: vistas (historial Duo / "Marcar como vista"), favoritas y estadísticas de gustos. */
export default function CinephileProfile() {
  const { favorites } = useFavorites();
  const { history } = useDuoHistory();
  const seenIds = history.seen;
  const ids = [...new Set([...seenIds, ...favorites])];
  const { data: titles } = useAsync(`cinephile-${ids.join(",")}`, () => getMoviesByIds(ids));

  const seen = (titles ?? []).filter((title) => seenIds.includes(title.id));
  const liked = (titles ?? []).filter((title) => favorites.includes(title.id));
  const stats = getTasteStats(titles ?? []);
  const topGenres = stats.genres.slice(0, 5);
  const maxCount = topGenres[0]?.count ?? 1;

  return (
    <section className="cinephile" aria-labelledby="cinephile-title">
      <div className="section-heading">
        <div>
          <p className="eyebrow">TU PERFIL CINÉFILO</p>
          <h2 id="cinephile-title">Lo que dicen tus películas</h2>
        </div>
        <p>Se calcula con lo que marcas como visto y con tus favoritas. Se guarda solo en este navegador.</p>
      </div>

      {!titles ? (
        <SkeletonRow count={4} label="Calculando tu perfil…" />
      ) : (
        <>
          <div className="cinephile-stats">
            {[
              ["👀", "Vistas", seen.length],
              ["❤️", "Favoritas", liked.length],
              ["🎭", "Género más visto", stats.topGenre ?? "—"],
              ["⏱️", "Duración promedio", stats.avgRuntime ? `${stats.avgRuntime} min` : "—"],
              ["📅", "Década favorita", stats.favoriteDecade ?? "—"],
            ].map(([icon, label, value]) => (
              <div key={label} className="cinephile-stat">
                <span aria-hidden="true">{icon}</span>
                <strong>{value}</strong>
                <small>{label}</small>
              </div>
            ))}
          </div>

          {topGenres.length > 0 && (
            <div className="cinephile-genres">
              <h3>Géneros favoritos</h3>
              <ul>
                {topGenres.map(({ label, count }) => (
                  <li key={label}>
                    <span>{label}</span>
                    <span className="cinephile-bar" style={{ "--w": `${(count / maxCount) * 100}%` }} aria-hidden="true" />
                    <small>{count}</small>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <PosterList title="👀 Vistas" titles={seen} empty="Marca títulos con «👀 Marcar como vista» en su ficha o en Duo." />
          <PosterList title="❤️ Favoritas" titles={liked} empty="Marca películas con ♥ para verlas aquí." />

          {ids.length === 0 && (
            <div className="section-cta">
              <Button variant="primary" to="/movies">
                Explorar películas
              </Button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
