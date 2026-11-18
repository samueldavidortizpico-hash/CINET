import { useParams } from "react-router-dom";
import { useDocumentTitle } from "../../hooks/useDocumentTitle.js";
import Button from "../common/Button.jsx";
import ErrorPage from "./ErrorPage.jsx";
import NotFound from "./NotFound.jsx";

const statusContent = {
  200: { title: "Todo está en orden", message: "La solicitud se completó correctamente." },
  301: { title: "Te estamos redirigiendo", message: "Esta dirección cambió de forma permanente." },
  400: { title: "Solicitud inválida", message: "Revisa la dirección o los datos enviados e inténtalo de nuevo." },
  500: { title: "Error del servidor", message: "No pudimos completar tu solicitud. Inténtalo de nuevo más tarde." },
};

export default function StatusPage() {
  const { code: routeCode } = useParams();
  const code = Number(routeCode);
  const status = statusContent[code];
  useDocumentTitle(status?.title ?? "Página no encontrada");

  return (
    <section className="status-page">
      <div className="status-page-inner">
        {code === 404 || !status ? <NotFound /> : <ErrorPage code={code} title={status.title} message={status.message} />}
        <div className="status-actions">
          <Button variant="primary" to="/home">Volver al inicio</Button>
        </div>
      </div>
    </section>
  );
}
