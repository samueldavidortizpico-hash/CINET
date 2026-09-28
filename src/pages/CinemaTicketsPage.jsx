import { Link, useParams } from "react-router-dom";
import { CINEMA_CHAINS } from "../data/showtimes.js";
import { useDocumentTitle } from "../hooks/useDocumentTitle.js";
import { useMovie } from "../hooks/useMovie.js";
import { useToast } from "../hooks/useToast.js";
import { titleMeta } from "../services/recommender.js";
import { fallbackPoster } from "../utils/poster.js";

/** /cine/:id — escoger la cadena de cine; cada una abre su página oficial para comprar boletas. */
export default function CinemaTicketsPage() {
  const { id } = useParams();
  const { movie, loading, notFound } = useMovie(id);
  const { showToast } = useToast();
  useDocumentTitle(movie ? `Boletas para ${movie.title}` : "Boletas");

  const copyTitle = async () => {
    try {
      await navigator.clipboard.writeText(movie.title);
      showToast("📋 Título copiado: pégalo en el buscador del cine");
    } catch {
      showToast("No se pudo copiar el título");
    }
  };

  return (
    <div className="cine-page">
      <Link className="cine-back" to={movie ? `/movie/${movie.id}?cine=1` : "/cine"}>
        ← {movie ? "Volver a la película" : "Volver a la cartelera"}
      </Link>

      {loading && <div className="cine-skeleton cine-skeleton-wide" role="status" aria-label="Cargando película" />}

      {notFound && (
        <div className="cine-empty" role="status">
          <h2>No encontramos esa película</h2>
          <p>
            <Link to="/cine">Vuelve a la cartelera</Link> y elige otra.
          </p>
        </div>
      )}

      {movie && (
        <section className="cine-tickets" aria-labelledby="cine-tickets-title">
          <div className="cine-tickets-movie">
            <img
              src={movie.poster || fallbackPoster(movie)}
              alt={`Póster de ${movie.title}`}
              onError={(event) => {
                event.currentTarget.onerror = null;
                event.currentTarget.src = fallbackPoster(movie);
              }}
            />
            <div>
              <p className="cine-kicker">Comprar boletas</p>
              <h1 id="cine-tickets-title">{movie.title}</h1>
              <p className="cine-card-meta">
                {titleMeta(movie)}
                {movie.rating > 0 && ` · ★ ${movie.rating}`}
              </p>
              <button type="button" className="cine-copy" onClick={copyTitle}>
                📋 Copiar título para buscarla
              </button>
            </div>
          </div>

          <div className="cine-chains">
            <h2>¿En qué cine la quieres ver?</h2>
            <p>
              Se abre la página oficial de la cadena en una pestaña nueva. Elige tu ciudad y busca «{movie.title}» para comprar tus boletas.
            </p>
            <ul className="cine-chain-list">
              {CINEMA_CHAINS.map((chain) => (
                <li key={chain.id}>
                  <a
                    className="cine-chain"
                    href={chain.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Comprar boletas de ${movie.title} en ${chain.name} (abre su página oficial en una pestaña nueva)`}
                  >
                    <span className="cine-chain-mark" style={{ "--chain": chain.color }} aria-hidden="true">
                      {chain.initials}
                    </span>
                    <span className="cine-chain-name">
                      <strong>{chain.name}</strong>
                      <small>{new URL(chain.url).hostname.replace(/^www\./, "")}</small>
                    </span>
                    <span className="cine-chain-go" aria-hidden="true">
                      Comprar ↗
                    </span>
                  </a>
                </li>
              ))}
            </ul>
            <p className="cine-source">
              CINET no vende boletas ni ve la disponibilidad de cada sala: la compra, los horarios y los precios son de cada cadena.
            </p>
          </div>
        </section>
      )}
    </div>
  );
}
