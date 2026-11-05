import { useEffect, useState } from "react";
import { getMovieById } from "../services/movieService.js";

/** Obtiene una película por id (acepta alias antiguos). */
export function useMovie(id) {
  const [result, setResult] = useState({ id: null, movie: null, error: null });

  useEffect(() => {
    let active = true; // ignora respuestas tardías si el id cambia o el componente se desmonta
    getMovieById(id).then(
      (movie) => active && setResult({ id, movie, error: null }),
      (error) => active && setResult({ id, movie: null, error })
    );
    return () => {
      active = false;
    };
  }, [id]);

  const loading = result.id !== id;
  return {
    movie: loading ? null : result.movie,
    loading,
    error: loading ? null : result.error,
    notFound: !loading && !result.movie && !result.error,
  };
}
