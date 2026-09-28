import Button from "../components/common/Button.jsx";
import EmptyState from "../components/common/EmptyState.jsx";
import { useDocumentTitle } from "../hooks/useDocumentTitle.js";

export default function NotFoundPage() {
  useDocumentTitle("Página no encontrada");

  return (
    <section className="plans-section">
      <div className="section-inner">
        <EmptyState title="Página no encontrada" action={<Button variant="primary" to="/home">Volver al inicio</Button>}>
          La ruta que buscas no existe en CINET.
        </EmptyState>
      </div>
    </section>
  );
}
