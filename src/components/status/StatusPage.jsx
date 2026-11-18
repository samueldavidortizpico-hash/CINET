import { useParams } from "react-router-dom";
import { useDocumentTitle } from "../../hooks/useDocumentTitle.js";
import { HTTP_STATUS_MESSAGES } from "../../data/statusMessages.js";
import Button from "../common/Button.jsx";
import ErrorPage from "./ErrorPage.jsx";
import NotFound from "./NotFound.jsx";

const statusContent = HTTP_STATUS_MESSAGES;

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
