import { useState } from "react";
import { useAsync } from "../../hooks/useAsync.js";
import { track } from "../../services/analytics.js";
import { formatBudget } from "../../services/planService.js";
import { getListingsForTitle, getOffersForTitle } from "../../services/showtimeService.js";

const updated = (iso) => {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "" : ` · actualizado ${date.toLocaleString("es-CO", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}`;
};

function RetryNotice({ text, onRetry }) {
  return (
    <p className="cine-source" role="status">
      {text}{" "}
      <button type="button" className="btn btn-secondary" onClick={onRetry}>Reintentar</button>
    </p>
  );
}

/**
 * Funciones publicadas por aliados verificados (con fuente y actualización) y, aparte, ofertas patrocinadas.
 * Funciones y ofertas se cargan por separado: si una falla, la otra se sigue viendo, y el fallo se
 * explica con un reintento en vez de esconderse. Sin datos, no se muestra nada: CINET no inventa horarios.
 */
export default function PartnerListings({ titleId }) {
  const [attempt, setAttempt] = useState(0);
  const listings = useAsync(`partner-listings-${titleId}-${attempt}`, () => getListingsForTitle(titleId));
  const offers = useAsync(`partner-offers-${titleId}-${attempt}`, () => getOffersForTitle(titleId));
  const retry = () => setAttempt((value) => value + 1);

  const items = listings.data?.items ?? [];
  const skipped = listings.data?.skipped ?? 0;
  const offerItems = offers.data ?? [];
  if (!items.length && !offerItems.length && !listings.error && !offers.error) return null;

  return (
    <>
      {(items.length > 0 || listings.error) && (
        <section className="partner-listings" aria-labelledby="partner-listings-title">
          <h2 id="partner-listings-title">Funciones publicadas por cines aliados</h2>
          {listings.error && <RetryNotice text="No pudimos cargar las funciones de los aliados." onRetry={retry} />}
          {items.length > 0 && (
            <ul>
              {items.map((item) => (
                <li key={item.id}>
                  <div>
                    <strong>{item.venue}{item.city ? ` · ${item.city}` : ""}</strong>
                    <span>{item.date} · {item.time}{item.format ? ` · ${item.format}` : ""}{item.language ? ` · ${item.language}` : ""}{item.price != null ? ` · ${formatBudget(item.price)}` : ""}</span>
                    <small>Fuente: {item.exhibitor} (lo publica el aliado){updated(item.updatedAt)}{item.kind === "event" ? " · evento" : ""}</small>
                  </div>
                  <a href={item.officialUrl} target="_blank" rel="noopener noreferrer" onClick={() => track("partner_listing_clicked", { kind: item.kind })}>
                    Comprar en su sitio oficial ↗
                  </a>
                </li>
              ))}
            </ul>
          )}
          {skipped > 0 && <p className="cine-source">Algunas funciones no se muestran porque sus datos están incompletos.</p>}
          {items.length > 0 && <p className="cine-source">Precio y disponibilidad se confirman en el sitio del cine.</p>}
        </section>
      )}
      {(offerItems.length > 0 || offers.error) && (
        <aside className="sponsored-offers" aria-label="Ofertas patrocinadas">
          <span className="sponsored-label">Patrocinado</span>
          {offers.error && <RetryNotice text="No pudimos cargar las ofertas." onRetry={retry} />}
          {offerItems.map((offer) => (
            <a key={offer.id} href={offer.url} target="_blank" rel="noopener noreferrer sponsored" onClick={() => track("sponsored_offer_clicked")}>
              <strong>{offer.headline}</strong>
              <small>{offer.exhibitor}</small>
            </a>
          ))}
        </aside>
      )}
    </>
  );
}
