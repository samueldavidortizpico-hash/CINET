import { useNavigate, useRouteError } from "react-router-dom";
import Button from "./Button.jsx";
import EmptyState from "./EmptyState.jsx";
import { DUO_SESSION_KEY } from "../../data/duo.js";
import { removeStorage } from "../../utils/storage.js";

/**
 * Recuperación por ruta (N11/N22): una excepción de una página no tumba la app ni muestra el error
 * técnico. La cabecera sigue; se ofrece reintentar o volver. En Duo, «Restablecer Duo» borra SOLO la
 * sesión de Duo (cinehub-duo-session): favoritos, planes y demás datos del navegador no se tocan.
 */
export default function RouteError({ area = "page" }) {
  const error = useRouteError();
  const navigate = useNavigate();
  console.error("Error de ruta", error?.name ?? "Error"); // sin mensaje ni datos: pueden incluir contenido del usuario
  const resetDuo = () => {
    removeStorage(DUO_SESSION_KEY);
    navigate(0);
  };

  return (
    <section className="plans-section">
      <div className="section-inner">
        <EmptyState
          heading="h1"
          title={area === "duo" ? "No pudimos abrir tu sesión de Duo" : "Algo salió mal en esta página"}
          action={
            <>
              {area === "duo" && <Button variant="primary" onClick={resetDuo}>Restablecer Duo</Button>}
              <Button variant={area === "duo" ? "secondary" : "primary"} onClick={() => navigate(0)}>Reintentar</Button>
              <Button variant="secondary" to="/home">Volver al inicio</Button>
            </>
          }
        >
          {area === "duo"
            ? "Parte de la sesión guardada está dañada. Restablecer Duo empieza una sesión nueva y conserva tus favoritas y planes."
            : "Tus datos guardados siguen intactos. Puedes reintentar o volver al inicio."}
        </EmptyState>
      </div>
    </section>
  );
}
