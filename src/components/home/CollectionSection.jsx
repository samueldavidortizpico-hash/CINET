import { useRef } from "react";
import SkeletonRow from "../common/SkeletonRow.jsx";
import MovieGrid from "../movies/MovieGrid.jsx";
import { useAsync } from "../../hooks/useAsync.js";
import { useReveal } from "../../hooks/useReveal.js";
import { getCollection } from "../../services/movieService.js";

/**
 * Carrusel del inicio (tendencias, estrenos, para ti…). Pide sus datos solo
 * cuando entra en pantalla, así el móvil no lanza todas las consultas a la vez.
 * Sin TMDB usa el catálogo local; si no hay títulos, se oculta o muestra `empty`.
 */
export default function CollectionSection({ collection, kicker, title, description, limit = 12, id, context, action, empty, reason }) {
  const [ref, revealClass] = useReveal();
  const rowRef = useRef(null);
  const visible = revealClass.includes("visible");
  const key = visible ? `${collection}-${limit}-${JSON.stringify(context ?? {})}` : null;
  const { data } = useAsync(key, () => getCollection(collection, limit, context));

  if (data && data.titles.length === 0 && !empty) return null;

  const scroll = (direction) =>
    rowRef.current?.scrollBy({ left: direction * rowRef.current.clientWidth * 0.85, behavior: "smooth" });

  return (
    <section ref={ref} id={id} data-collection={collection} className={`collection-section ${revealClass}`} aria-labelledby={`${collection}-title`}>
      <div className="collection-head">
        <div>
          <p className="eyebrow">{kicker}</p>
          <h2 id={`${collection}-title`}>{title}</h2>
          {description && <p className="collection-desc">{description}</p>}
        </div>
        <div className="collection-controls">
          {action}
          {data?.titles.length > 0 && (
            <>
              <button type="button" className="row-arrow" aria-label={`Anteriores en ${title}`} onClick={() => scroll(-1)}>
                ‹
              </button>
              <button type="button" className="row-arrow" aria-label={`Siguientes en ${title}`} onClick={() => scroll(1)}>
                ›
              </button>
            </>
          )}
        </div>
      </div>

      {!data && <SkeletonRow />}
      {data?.titles.length > 0 && <MovieGrid movies={data.titles} layout="row" rowRef={rowRef} reason={reason} />}
      {data?.titles.length === 0 && <div className="collection-empty">{empty}</div>}
    </section>
  );
}
