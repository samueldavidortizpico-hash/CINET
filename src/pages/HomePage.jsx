import { useMemo } from "react";
import Button from "../components/common/Button.jsx";
import HeroCarousel from "../components/home/HeroCarousel.jsx";
import CollectionSection from "../components/home/CollectionSection.jsx";
import PlansPreview from "../components/home/PlansPreview.jsx";
import FaqSection from "../components/home/FaqSection.jsx";
import { HomeExperiences, DuoSpotlight } from "../components/home/HomeExperiences.jsx";
import { DUO_PREFERENCES_KEY } from "../data/duo.js";
import { useDocumentTitle } from "../hooks/useDocumentTitle.js";
import { useFavorites } from "../hooks/useFavorites.js";
import { useLocalStorage } from "../hooks/useLocalStorage.js";

/** Portada: carrusel de tendencias, filas de descubrimiento, planes recientes y preguntas frecuentes. */
export default function HomePage() {
  const { favorites } = useFavorites();
  const [duoPrefs] = useLocalStorage(DUO_PREFERENCES_KEY, null);
  const forYou = useMemo(() => ({ favorites }), [favorites]);
  const couple = useMemo(() => ({ genres: Array.isArray(duoPrefs?.genres) ? duoPrefs.genres : [] }), [duoPrefs]);
  useDocumentTitle();

  return (
    <>
      <HeroCarousel />
      <HomeExperiences />
      <div className="home-rows">
        <CollectionSection
          id="peliculas"
          collection="trending"
          kicker="LO MÁS VISTO HOY"
          title="En boca de todos"
          action={<Button to="/movies" className="row-link">Ver todo →</Button>}
        />
        <CollectionSection
          collection="for-you"
          kicker="SEGÚN TUS FAVORITAS"
          title="Tu próxima favorita"
          context={forYou}
          reason="Recomendada por TMDB a partir de tus favoritas"
          empty={<p>Marca películas con ♥ y aquí aparecerán recomendaciones hechas para ti.</p>}
        />
        <DuoSpotlight />
        <CollectionSection collection="top-rated" kicker="LAS MEJORES" title="De esas que dejan huella" />
        <CollectionSection collection="upcoming" kicker="EN COLOMBIA" title="Lo que viene a la gran pantalla" />
        <CollectionSection collection="popular-tv" kicker="PARA MARATONEAR" title="Solo un capítulo más" />
        <CollectionSection
          collection="discover-new"
          kicker="JOYAS POCO VISTAS"
          title="Fuera del radar"
          description="Bien valoradas y fuera del radar. Cambian en cada visita."
        />
        <CollectionSection
          collection="couple"
          kicker="CINET DUO"
          title="Mejor si la vemos juntos"
          context={couple}
          reason={couple.genres.length ? "Coincide con los géneros de su última sesión Duo" : null}
          description={couple.genres.length ? "Según su última sesión Duo." : "Comedia y romance bien valorados."}
          action={<Button to="/duo" className="row-link btn-duo">Probar Duo →</Button>}
        />
      </div>
      <PlansPreview />
      <FaqSection />
    </>
  );
}
