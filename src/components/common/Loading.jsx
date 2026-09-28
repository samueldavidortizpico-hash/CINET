/** Pantalla de carga a pantalla completa; `done` la desvanece. */
export default function Loading({ done = false, label = "Cargando" }) {
  return (
    <div className={`movie-loading${done ? " hidden" : ""}`} aria-hidden={done}>
      <div className="movie-loader" role="status" aria-label={label}></div>
    </div>
  );
}
