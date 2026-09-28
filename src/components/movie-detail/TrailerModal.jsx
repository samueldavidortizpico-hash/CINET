import { useState } from "react";
import Modal from "../common/Modal.jsx";

function TrailerPlayer({ movie }) {
  const [ready, setReady] = useState(false);
  const autoplay = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 1;
  const origin = encodeURIComponent(window.location.origin);

  return (
    <>
      {!ready && (
        <div className="trailer-loading">
          <div className="trailer-spinner" aria-hidden="true"></div>
          <span>Cargando tráiler…</span>
        </div>
      )}
      <iframe
        id="trailer-iframe"
        className={ready ? "is-ready" : undefined}
        title={`Tráiler de ${movie.title}`}
        src={`https://www.youtube.com/embed/${movie.trailerKey}?autoplay=${autoplay}&rel=0&modestbranding=1&enablejsapi=1&origin=${origin}`}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
        onLoad={() => setReady(true)}
      />
    </>
  );
}

/** El reproductor solo se monta con el modal abierto: al cerrar, el video se detiene. */
export default function TrailerModal({ open, onClose, movie }) {
  return (
    <Modal open={open} onClose={onClose} prefix="trailer" label="Tráiler de la película">
      <div className="trailer-header">
        <span className="trailer-title">▶ {movie.title} — Tráiler oficial</span>
        <button className="trailer-close" type="button" aria-label="Cerrar tráiler" onClick={onClose}>
          ✕
        </button>
      </div>

      <div className="trailer-player-wrap">
        {open && movie.trailerKey && <TrailerPlayer movie={movie} />}
        <div className={`trailer-message${movie.trailerKey ? "" : " is-visible"}`} role="status">
          <span className="trailer-message-icon" aria-hidden="true">🎬</span>
          <span className="trailer-message-text">Tráiler no disponible para esta película.</span>
        </div>
      </div>

      <div className="trailer-attribution">
        Datos de tráiler proporcionados por <strong>TMDB</strong>. This product uses the TMDB API
        but is not endorsed or certified by TMDB.
      </div>
    </Modal>
  );
}
