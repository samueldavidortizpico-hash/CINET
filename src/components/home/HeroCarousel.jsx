import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import MovieSearch from "../movies/MovieSearch.jsx";
import TrailerModal from "../movie-detail/TrailerModal.jsx";
import { useAsync } from "../../hooks/useAsync.js";
import { useFavorites } from "../../hooks/useFavorites.js";
import { useLocalStorage } from "../../hooks/useLocalStorage.js";
import { usePrefersReducedMotion } from "../../hooks/usePrefersReducedMotion.js";
import { HERO_PREFERENCES_KEY } from "../../services/heroPreferences.js";
import { getHeroSlides, getMovieById } from "../../services/movieService.js";
import { titleMeta } from "../../services/recommender.js";
import { fallbackPoster } from "../../utils/poster.js";

const INTERVAL = 7000; // tiempo para leer título, datos y sinopsis
const SWIPE = 50; // px de desplazamiento horizontal para cambiar con el dedo

const shorten = (text, max = 200) => (text.length > max ? `${text.slice(0, max).replace(/\s+\S*$/, "")}…` : text);

/**
 * Imagen de la diapositiva. Con fondo horizontal (backdrop): a pantalla completa.
 * Sin él (o si no carga): el póster nítido — tarjeta a la derecha sobre un ambiente de su color
 * en escritorio, a pantalla completa en móvil — y, si tampoco hay póster, uno generado con el título.
 */
function SlideMedia({ slide, priority }) {
  const [backdropFailed, setBackdropFailed] = useState(false);
  const [posterFailed, setPosterFailed] = useState(false);
  const loading = { loading: priority ? "eager" : "lazy", fetchPriority: priority ? "high" : "low", decoding: "async" };

  if (slide.backdrop && !backdropFailed) {
    return <img className="hero-image" src={slide.backdrop} alt="" {...loading} onError={() => setBackdropFailed(true)} />;
  }
  const poster = slide.poster && !posterFailed ? slide.poster : fallbackPoster(slide);
  return (
    <>
      <img className="hero-ambient" src={poster} alt="" aria-hidden="true" {...loading} />
      <img className="hero-poster" src={poster} alt={`Póster de ${slide.title}`} {...loading} onError={() => setPosterFailed(true)} />
    </>
  );
}

/**
 * Carrusel del inicio: avance cada 7 s, flechas, indicadores, pausa (botón, cursor, foco),
 * teclado (← →), gestos táctiles y sin autoplay con movimiento reducido.
 */
export default function HeroCarousel() {
  const navigate = useNavigate();
  const { isFavorite, toggleFavorite } = useFavorites();
  const reduced = usePrefersReducedMotion();
  // Las películas fijadas en el dashboard mandan; cambiarlas actualiza el carrusel al momento.
  const [heroPreferences] = useLocalStorage(HERO_PREFERENCES_KEY, { featuredIds: [] });
  const featuredIds = Array.isArray(heroPreferences?.featuredIds) ? heroPreferences.featuredIds : [];
  const slidesKey = `hero-slides-${featuredIds.join(",")}`;
  const { data: slides = [], error } = useAsync(slidesKey, () => getHeroSlides(6, featuredIds));
  const [position, setPosition] = useState({ key: slidesKey, index: 0 });
  const index = position.key === slidesKey ? position.index : 0; // otra selección: vuelve a la primera
  const [paused, setPaused] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [trailerOpen, setTrailerOpen] = useState(false);
  const touchX = useRef(null);

  const count = slides.length;
  const active = count ? index % count : 0;
  const current = slides[active];
  const running = count > 1 && !paused && !hovered && !focused && !reduced && !trailerOpen;
  // El tráiler de TMDB llega con el detalle: solo se pide el de la diapositiva visible.
  const { data: detail } = useAsync(current ? `hero-detail-${current.id}` : null, () => getMovieById(current.id));
  const trailerKey = current?.trailerKey ?? detail?.trailerKey ?? null;
  const closeTrailer = useCallback(() => setTrailerOpen(false), []);

  useEffect(() => {
    if (!running) return undefined;
    const timer = setTimeout(() => setPosition({ key: slidesKey, index: (active + 1) % count }), INTERVAL);
    return () => clearTimeout(timer); // cualquier cambio manual reinicia el tiempo
  }, [running, active, count, slidesKey]);

  const goTo = (next) => setPosition({ key: slidesKey, index: (next + count) % count });

  const onKeyDown = (event) => {
    if (event.key === "ArrowRight") goTo(active + 1);
    else if (event.key === "ArrowLeft") goTo(active - 1);
    else return;
    event.preventDefault();
  };

  const onTouchEnd = (event) => {
    const start = touchX.current;
    touchX.current = null;
    if (start == null) return;
    const delta = event.changedTouches[0].clientX - start;
    if (Math.abs(delta) >= SWIPE) goTo(active + (delta < 0 ? 1 : -1));
  };

  return (
    <section id="inicio" className="hero" aria-labelledby="hero-heading">
      <h1 id="hero-heading" className="visually-hidden">
        CINET: películas y series para hoy
      </h1>

      <div
        className={`hero-carousel${running ? " is-running" : ""}`}
        role="region"
        aria-roledescription="carrusel"
        aria-label="Tendencias de hoy"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        // Foco de teclado dentro del carrusel = pausa (el de un clic o el del propio botón de pausa, no).
        onFocus={(event) => setFocused(event.target.matches(":focus-visible") && !event.target.classList.contains("hero-pause"))}
        onBlur={(event) => !event.currentTarget.contains(event.relatedTarget) && setFocused(false)}
        onKeyDown={onKeyDown}
        onTouchStart={(event) => (touchX.current = event.touches[0].clientX)}
        onTouchEnd={onTouchEnd}
      >
        {!count && (
          <div className="hero-slide is-active hero-placeholder" role="status">
            <span className="visually-hidden">{error ? "No se pudieron cargar las destacadas." : "Cargando destacadas…"}</span>
            <div className="hero-content">
              <div className="skeleton-line wide" />
              <div className="skeleton-line title" />
              <div className="skeleton-line" />
            </div>
          </div>
        )}

        <div className="hero-slides" aria-live={running ? "off" : "polite"}>
          {slides.map((slide, slideIndex) => {
            const isActive = slideIndex === active;
            const favorite = isFavorite(slide.id);
            return (
              <div
                key={slide.id}
                className={`hero-slide${isActive ? " is-active" : ""}`}
                role="group"
                aria-roledescription="diapositiva"
                aria-label={`${slideIndex + 1} de ${count}: ${slide.title}`}
                aria-hidden={!isActive}
                inert={!isActive}
              >
                <SlideMedia slide={slide} priority={slideIndex === 0} />
                <div className="hero-shade" aria-hidden="true" />
                <div className="hero-content">
                  <p className="eyebrow">
                    {featuredIds.includes(slide.id) ? "Destacada por CINET" : "Tendencia hoy"} · {slideIndex + 1} de {count}
                  </p>
                  <h2 className="hero-title">{slide.title}</h2>
                  <p className="hero-meta">
                    {slide.rating > 0 && <span className="hero-rating">★ {slide.rating}</span>}
                    <span>{titleMeta(slide)}</span>
                    {slide.genre && <span>{slide.genre}</span>}
                  </p>
                  <p className="hero-overview">{shorten(slide.description ?? "")}</p>
                  <div className="hero-actions">
                    <Link className="btn btn-primary" to={`/movie/${slide.id}`}>
                      Ver detalles
                    </Link>
                    <button
                      type="button"
                      className={`btn hero-fav${favorite ? " is-active" : ""}`}
                      aria-pressed={favorite}
                      onClick={() => toggleFavorite(slide.id)}
                    >
                      {favorite ? "♥ En favoritos" : "♡ Añadir a favoritos"}
                    </button>
                    <button type="button" className="btn" disabled={!isActive || !trailerKey} onClick={() => setTrailerOpen(true)}>
                      ▶ Tráiler
                    </button>
                    <Link className="btn btn-duo" to={`/duo?from=${encodeURIComponent(slide.id)}`}>
                      💑 Usar en Duo
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {count > 1 && (
          <div className="hero-controls">
            <button type="button" className="hero-arrow" aria-label="Diapositiva anterior" onClick={() => goTo(active - 1)}>
              ‹
            </button>
            <div className="hero-dots" role="group" aria-label="Elegir diapositiva">
              {slides.map((slide, slideIndex) => (
                <button
                  key={slide.id}
                  type="button"
                  className="hero-dot"
                  aria-label={`Ir a la diapositiva ${slideIndex + 1}: ${slide.title}`}
                  aria-current={slideIndex === active ? "true" : undefined}
                  onClick={() => goTo(slideIndex)}
                >
                  {slideIndex === active && <span key={active} className="hero-dot-progress" style={{ "--duration": `${INTERVAL}ms` }} />}
                </button>
              ))}
            </div>
            <button type="button" className="hero-arrow" aria-label="Diapositiva siguiente" onClick={() => goTo(active + 1)}>
              ›
            </button>
            <button
              type="button"
              className="hero-pause"
              aria-label={paused ? "Reanudar el carrusel" : "Pausar el carrusel"}
              aria-pressed={paused}
              onClick={() => setPaused((value) => !value)}
            >
              <span aria-hidden="true">{paused ? "▶" : "❚❚"}</span>
            </button>
          </div>
        )}
      </div>

      {/* La búsqueda vive en MovieContext: al enviar, /movies ya muestra los resultados. */}
      <div className="hero-search">
        <MovieSearch className="featured-search" onSubmit={() => navigate("/movies")} />
      </div>

      {current && <TrailerModal open={trailerOpen} onClose={closeTrailer} movie={{ ...current, trailerKey }} />}
    </section>
  );
}
