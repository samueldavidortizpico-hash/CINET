import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import EmptyState from "../components/common/EmptyState.jsx";
import Button from "../components/common/Button.jsx";
import BookingSummary from "../components/functions/BookingSummary.jsx";
import { AmbienceOptions } from "../components/functions/HomePlanOptions.jsx";
import SelectedMovie from "../components/functions/SelectedMovie.jsx";
import ShowtimeStep from "../components/functions/ShowtimeStep.jsx";
import { CinemaOptions, DateOptions, TimeOptions } from "../components/functions/ShowtimeOptions.jsx";
import { AMBIENCES } from "../data/duo.js";
import { PLATFORMS } from "../data/platforms.js";
import { useAsync } from "../hooks/useAsync.js";
import { useDocumentTitle } from "../hooks/useDocumentTitle.js";
import { useMovie } from "../hooks/useMovie.js";
import { usePlans } from "../hooks/usePlans.js";
import { getShowtimes, getTitleExtras } from "../services/movieService.js";
import { HOME_TIMES, recommendedStart, toPlanMovie } from "../services/planService.js";
import { isTmdbEnabled } from "../services/tmdbClient.js";

const MODES = [
  ["cinema", "🎟️ En el cine"],
  ["home", "🏠 En casa"],
];

/** Plataformas donde está por suscripción (TMDB); si no se sabe, todas. */
function homePlaces(watch) {
  const available = PLATFORMS.filter((platform) =>
    watch?.offers.subscription.some((provider) => platform.tmdbIds.includes(provider.id))
  );
  const list = available.length ? available : PLATFORMS;
  return list.map((platform) => ({
    name: platform.name,
    location: available.length ? "Incluida en la suscripción" : "En casa",
    icon: "📺",
  }));
}

/**
 * Paso 1 del flujo de plan (/functions?movie=id): en el cine (cine, fecha, hora)
 * o en casa (&mode=home: plataforma, fecha, hora recomendada y ambiente).
 */
export default function FunctionsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const mode = searchParams.get("mode") === "home" ? "home" : "cinema";
  const { movie, notFound } = useMovie(searchParams.get("movie") || "interstellar");
  const { selectShowtime } = usePlans();
  const navigate = useNavigate();
  const [showtimes] = useState(() => getShowtimes());
  const [choice, setChoice] = useState({ cinema: null, date: null, time: null });
  const [home, setHome] = useState({ place: null, date: null, time: null, ambience: searchParams.get("ambience"), food: true });
  const choose = (key) => (value) => setChoice((current) => ({ ...current, [key]: value }));
  const chooseHome = (key) => (value) => setHome((current) => ({ ...current, [key]: value }));
  useDocumentTitle(movie ? `Plan para ${movie.title}` : "Funciones");

  const { data: extras } = useAsync(
    mode === "home" && movie?.tmdbId && isTmdbEnabled() ? `extras-${movie.id}` : null,
    () => getTitleExtras(movie)
  );
  const recommended = recommendedStart(movie?.runtime);
  const homeTime = home.time ?? recommended;
  const ambience = AMBIENCES.find((item) => item.key === home.ambience);

  const setMode = (next) =>
    setSearchParams(
      (params) => {
        const updated = new URLSearchParams(params);
        if (next === "home") updated.set("mode", "home");
        else updated.delete("mode");
        return updated;
      },
      { replace: true }
    );

  const handleContinue = () => {
    const base = { movie: toPlanMovie(movie) };
    selectShowtime(
      mode === "home"
        ? {
            ...base,
            cinema: home.place,
            date: home.date.label,
            dateISO: home.date.iso,
            time: homeTime,
            mode: "home",
            ambience: ambience ? `${ambience.icon} ${ambience.label}` : null,
            food: ambience && home.food ? ambience.food : null,
            duration: extras?.runtime ?? movie.duration,
          }
        : { ...base, cinema: choice.cinema, date: choice.date.label, dateISO: choice.date.iso, time: choice.time }
    );
    navigate("/create-plan");
  };

  return (
    <div className="showtimes-page">
      <div className="showtimes-container">
        <Link to="/movies" className="back-link">← Volver al catálogo</Link>

        {notFound && (
          <EmptyState title="Película no encontrada" action={<Button variant="primary" to="/movies">Ver catálogo</Button>}>
            Selecciona una película desde el catálogo para consultar sus funciones.
          </EmptyState>
        )}

        {movie && (
          <>
            <SelectedMovie movie={movie} />

            <div className="plan-mode" role="group" aria-label="¿Dónde la verán?">
              {MODES.map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  className={`filter-btn${mode === value ? " active" : ""}`}
                  aria-pressed={mode === value}
                  onClick={() => setMode(value)}
                >
                  {label}
                </button>
              ))}
            </div>

            {mode === "cinema" ? (
              <>
                <ShowtimeStep number="01" kicker="PRIMER PASO" title="Elige un cine">
                  <CinemaOptions cinemas={showtimes.cinemas} selected={choice.cinema} onSelect={choose("cinema")} />
                </ShowtimeStep>
                <ShowtimeStep number="02" kicker="SEGUNDO PASO" title="Selecciona una fecha">
                  <DateOptions dates={showtimes.dates} selected={choice.date} onSelect={choose("date")} />
                </ShowtimeStep>
                <ShowtimeStep number="03" kicker="TERCER PASO" title="Elige un horario">
                  <TimeOptions times={showtimes.times} selected={choice.time} onSelect={choose("time")} />
                </ShowtimeStep>
                <BookingSummary movie={movie} {...choice} onContinue={handleContinue} />
              </>
            ) : (
              <>
                <ShowtimeStep number="01" kicker="PRIMER PASO" title="¿En qué plataforma?">
                  {extras?.watch && !extras.watch.offers.subscription.length && (
                    <p className="plan-note">Según TMDB no está incluida en ninguna suscripción en Colombia; elijan dónde la verán.</p>
                  )}
                  <CinemaOptions cinemas={homePlaces(extras?.watch)} selected={home.place} onSelect={chooseHome("place")} />
                </ShowtimeStep>
                <ShowtimeStep number="02" kicker="SEGUNDO PASO" title="¿Qué día?">
                  <DateOptions dates={showtimes.dates} selected={home.date} onSelect={chooseHome("date")} />
                </ShowtimeStep>
                <ShowtimeStep number="03" kicker="TERCER PASO" title="Hora">
                  <p className="plan-note">
                    ⭐ Recomendada: <strong>{recommended}</strong>
                    {movie.runtime ? ` · dura ${movie.duration}, así terminan hacia las 23:00.` : "."}
                  </p>
                  <TimeOptions times={HOME_TIMES} selected={homeTime} onSelect={chooseHome("time")} />
                </ShowtimeStep>
                <ShowtimeStep number="04" kicker="OPCIONAL" title="Ambiente">
                  <AmbienceOptions
                    selected={home.ambience}
                    withFood={home.food}
                    onSelect={chooseHome("ambience")}
                    onToggleFood={chooseHome("food")}
                  />
                </ShowtimeStep>
                <BookingSummary
                  movie={movie}
                  cinema={home.place}
                  date={home.date}
                  time={homeTime}
                  placeLabel="📺 Plataforma"
                  extraRows={[
                    ["⏱️ Duración", extras?.runtime ?? movie.duration],
                    ["🎭 Ambiente", ambience && `${ambience.icon} ${ambience.label}`],
                    ["🍕 Comida", ambience && home.food ? ambience.food : null],
                  ]}
                  onContinue={handleContinue}
                />
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
