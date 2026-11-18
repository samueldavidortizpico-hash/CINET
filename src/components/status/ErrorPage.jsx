export default function ErrorPage({ code = 500, title = "Algo salió mal", message = "No pudimos completar tu solicitud. Inténtalo de nuevo más tarde." }) {
  return (
    <div className="status-card status-card--error" role="alert">
      <span className="status-code">{code}</span>
      <h1>{title}</h1>
      <p>{message}</p>
    </div>
  );
}
