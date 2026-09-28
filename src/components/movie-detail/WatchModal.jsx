import { useEffect, useState } from "react";
import Modal from "../common/Modal.jsx";
import PlatformLogo from "./PlatformLogo.jsx";
import { OFFER_TYPES, PLATFORMS, STATUS_LABELS } from "../../data/platforms.js";
import { regionName } from "../../data/tmdb.js";

/** Con datos de TMDB: disponible (y cómo) o no disponible en la región. */
function withAvailability(platform, watch) {
  if (!watch) return platform;
  const kinds = OFFER_TYPES.filter(([key]) => watch.offers[key].some((provider) => platform.tmdbIds.includes(provider.id)));
  if (!kinds.length) return { ...platform, status: "unavailable" };
  return { ...platform, status: "available", url: watch.link, badge: kinds.map(([, label]) => label).join(" · ") };
}

function WatchCard({ platform }) {
  const [feedback, setFeedback] = useState(false);
  const available = platform.status === "available" && Boolean(platform.url);
  const statusLabel = platform.badge ?? STATUS_LABELS[platform.status] ?? platform.status;

  // Animación breve de "aún no disponible"; el timer se limpia al desmontar.
  useEffect(() => {
    if (!feedback) return undefined;
    const timer = setTimeout(() => setFeedback(false), 500);
    return () => clearTimeout(timer);
  }, [feedback]);

  const activate = () =>
    available ? window.open(platform.url, "_blank", "noopener,noreferrer") : setFeedback(true);

  return (
    <div
      className={`watch-card${feedback ? " is-feedback" : ""}`}
      data-platform={platform.id}
      data-status={platform.status}
      style={{ "--brand": platform.brand }}
      role="button"
      tabIndex={0}
      aria-label={available ? `Ver en ${platform.name}` : `${platform.name} — ${statusLabel}`}
      aria-disabled={available ? undefined : true}
      onClick={activate}
      onKeyDown={(event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        activate();
      }}
    >
      <div className="watch-card-logo" aria-hidden="true">
        <PlatformLogo id={platform.id} />
      </div>
      <div className="watch-card-name">{platform.name}</div>
      <div className="watch-card-badge" data-status={platform.status}>
        {statusLabel}
      </div>
    </div>
  );
}

export default function WatchModal({ open, onClose, movie, watch = null }) {
  return (
    <Modal open={open} onClose={onClose} prefix="watch" labelledBy="watch-headline">
      <div className="watch-header">
        <div>
          <h2 id="watch-headline" className="watch-headline">
            ¿Dónde quieres ver <span id="watch-movie-name">{movie.title}</span>?
          </h2>
          <p className="watch-subline">Elige tu plataforma de streaming</p>
        </div>
        <button className="watch-close" type="button" aria-label="Cerrar selector de plataformas" onClick={onClose}>
          ✕
        </button>
      </div>

      <div className="watch-body">
        <div id="watch-grid" className="watch-grid" role="group" aria-label="Plataformas disponibles">
          {PLATFORMS.map((platform) => (
            <WatchCard key={platform.id} platform={withAvailability(platform, watch)} />
          ))}
        </div>
        <div className="watch-footer">
          <span className="watch-footer-icon" aria-hidden="true">ℹ️</span>
          <p className="watch-footer-text">
            {watch
              ? `Disponibilidad en ${regionName(watch.region)} según JustWatch vía TMDB; puede cambiar. Al elegir una plataforma disponible se abren las opciones oficiales.`
              : "Los enlaces a plataformas estarán disponibles próximamente. La disponibilidad real de cada película se confirmará en una actualización futura."}
          </p>
        </div>
      </div>
    </Modal>
  );
}
