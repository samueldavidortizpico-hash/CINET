import { useAsync } from "../../hooks/useAsync.js";
import { track } from "../../services/analytics.js";
import { formatBudget } from "../../services/planService.js";
import { getListingsForTitle, getOffersForTitle } from "../../services/showtimeService.js";

const updated = (iso) => new Date(iso).toLocaleString("es-CO", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

/**
 * Funciones publicadas por aliados verificados (con fuente y actualización) y, aparte, ofertas patrocinadas.
 * Si no hay datos de un aliado, no se muestra nada: CINET no inventa horarios, cupos ni precios.
 */
export default function PartnerListings({ titleId }) {
  const { data } = useAsync(`partner-${titleId}`, async () => {
    const [listings, offers] = await Promise.all([getListingsForTitle(titleId), getOffersForTitle(titleId)]);
    return { listings, offers };
  });
  if (!data || (!data.listings.length && !data.offers.length)) return null;

  return (
    <>
      {data.listings.length > 0 && (
        <section className="partner-listings" aria-labelledby="partner-listings-title">
          <h2 id="partner-listings-title">Funciones publicadas por cines aliados</h2>
          <ul>
            {data.listings.map((item) => (
              <li key={item.id}>
                <div>
                  <strong>{item.venue}{item.city ? ` · ${item.city}` : ""}</strong>
                  <span>{item.date} · {item.time}{item.format ? ` · ${item.format}` : ""}{item.language ? ` · ${item.language}` : ""}{item.price != null ? ` · ${formatBudget(item.price)}` : ""}</span>
                  <small>Fuente: {item.exhibitor} (lo publica el aliado) · actualizado {updated(item.updatedAt)}{item.kind === "event" ? " · evento" : ""}</small>
                </div>
                <a href={item.officialUrl} target="_blank" rel="noopener noreferrer" onClick={() => track("partner_listing_clicked", { kind: item.kind })}>
                  Comprar en su sitio oficial ↗
                </a>
              </li>
            ))}
          </ul>
          <p className="cine-source">Precio y disponibilidad se confirman en el sitio del cine.</p>
        </section>
      )}
      {data.offers.length > 0 && (
        <aside className="sponsored-offers" aria-label="Ofertas patrocinadas">
          <span className="sponsored-label">Patrocinado</span>
          {data.offers.map((offer) => (
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
