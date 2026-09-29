import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import MovieSearch from "../movies/MovieSearch.jsx";
import TrailerModal from "../movie-detail/TrailerModal.jsx";
import Icon from "../common/Icon.jsx";
import PosterImage from "../common/PosterImage.jsx";
import { useAsync } from "../../hooks/useAsync.js";
import { useFavorites } from "../../hooks/useFavorites.js";
import { useLocalStorage } from "../../hooks/useLocalStorage.js";
import { usePrefersReducedMotion } from "../../hooks/usePrefersReducedMotion.js";
import { useSceneMotion } from "../../hooks/useSceneMotion.js";
import { useSceneVisibility } from "../../hooks/useSceneVisibility.js";
import { HERO_PREFERENCES_KEY } from "../../services/heroPreferences.js";
import { getHeroSlides, getMovieById } from "../../services/movieService.js";
import { titleMeta } from "../../services/recommender.js";
import { fallbackPoster } from "../../utils/poster.js";

const INTERVAL = 7000; // tiempo para leer título, datos y sinopsis
const SWIPE = 50; // px de desplazamiento horizontal para cambiar con el dedo
const SCENE_COLORS = ["#b7a5ff", "#84e3d5", "#f4c992", "#91c6fa"];

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
  const sceneMotion = useSceneMotion();
  const [sceneRef, sceneVisible] = useSceneVisibility();
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
  const playback = useRef({ scene: null, remaining: INTERVAL });

  const count = slides.length;
  const active = count ? index % count : 0;
  const current = slides[active];
  const nextSlide = count > 1 ? slides[(active + 1) % count] : null;
  const running = count > 1 && sceneVisible && !paused && !hovered && !focused && !reduced && !trailerOpen;
  // El tráiler de TMDB llega con el detalle: solo se pide el de la diapositiva visible.
  const { data: detail } = useAsync(current ? `hero-detail-${current.id}` : null, () => getMovieById(current.id));
  const trailerKey = current?.trailerKey ?? detail?.trailerKey ?? null;
  const closeTrailer = useCallback(() => setTrailerOpen(false), []);

  useEffect(() => {
    const scene = `${slidesKey}:${active}`;
    if (playback.current.scene !== scene) playback.current = { scene, remaining: INTERVAL };
    if (!running) return undefined;
    const clock = playback.current;
    const started = performance.now();
    const timer = setTimeout(() => setPosition({ key: slidesKey, index: (active + 1) % count }), clock.remaining);
    return () => {
      clearTimeout(timer);
      clock.remaining = Math.max(0, clock.remaining - (performance.now() - started));
    }; // Al pausar se conserva el tiempo, igual que la barra de progreso.
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
      <h1 id="hero-heading" className="visually-hidden">CINET: buenas historias, mejores planes</h1>

      <div
        ref={sceneRef}
        className={`hero-carousel${running ? " is-running" : ""}`}
        style={{ "--hero-tint": SCENE_COLORS[active % SCENE_COLORS.length] }}
        role="region"
        aria-roledescription="carrusel"
        aria-label="Tendencias de hoy"
        {...sceneMotion}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        // Foco de teclado dentro del carrusel = pausa (el de un clic o el del propio botón de pausa, no).
        onFocus={(event) => setFocused(event.target.matches(":focus-visible") && !event.target.classList.contains("hero-pause"))}
        onBlur={(event) => !event.currentTarget.contains(event.relatedTarget) && setFocused(false)}
        onKeyDown={onKeyDown}
        onTouchStart={(event) => (touchX.current = event.touches[0].clientX)}
        onTouchEnd={onTouchEnd}
      >
        <div className="hero-stage-label" aria-hidden="true">
          <span className="hero-live-dot" /> TU PRÓXIMA GRAN HISTORIA
          {count > 0 && <span className="hero-stage-count">{String(active + 1).padStart(2, "0")} <span>/ {String(count).padStart(2, "0")}</span></span>}
        </div>
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
                <div className="hero-projection" aria-hidden="true"><span /><span /></div>
                <div className="hero-content">
                  <p className="eyebrow">
                    {featuredIds.includes(slide.id) ? "Selección CINET" : "Para tu próxima función"}
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
                      Ver detalles <Icon name="arrow" />
                    </Link>
                    <button
                      type="button"
                      className={`btn hero-fav${favorite ? " is-active" : ""}`}
                      aria-pressed={favorite}
                      onClick={() => toggleFavorite(slide.id)}
                    >
                      <Icon name="heart" /> {favorite ? "En favoritos" : "Favoritos"}
                    </button>
                    <button type="button" className="btn" disabled={!isActive || !trailerKey} onClick={() => setTrailerOpen(true)}>
                      <Icon name="play" /> Tráiler
                    </button>
                    <Link className="btn btn-duo" to={`/duo?from=${encodeURIComponent(slide.id)}`}>
                      <Icon name="ticket" /> Usar en Duo
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
                  <span className="hero-dot-thumb" aria-hidden="true"><PosterImage src={slide.backdrop || slide.poster} alt="" /></span>
                  <span className="hero-dot-number" aria-hidden="true">{String(slideIndex + 1).padStart(2, "0")}</span>
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
            {nextSlide && (
              <button type="button" className="hero-next" onClick={() => goTo(active + 1)} aria-label={`Ver siguiente destacada: ${nextSlide.title}`}>
                <span className="hero-next-art"><PosterImage src={nextSlide.poster} alt="" /></span>
                <span className="hero-next-copy"><small>A CONTINUACIÓN</small><strong>{nextSlide.title}</strong></span>
                <Icon name="arrow" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* La búsqueda vive en MovieContext: al enviar, /movies ya muestra los resultados. */}
      <div className="hero-search">
        <div className="hero-search-intro"><span className="landing-eyebrow">LA PRÓXIMA PUEDE SER TU FAVORITA</span><h2>¿Qué vemos hoy?</h2></div>
        <MovieSearch className="featured-search" onSubmit={() => navigate("/movies")} />
      </div>

      {current && <TrailerModal open={trailerOpen} onClose={closeTrailer} movie={{ ...current, trailerKey }} />}
    </section>
  );
}
