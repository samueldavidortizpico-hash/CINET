import Button from "../components/common/Button.jsx";
import EmptyState from "../components/common/EmptyState.jsx";
import { useDocumentTitle } from "../hooks/useDocumentTitle.js";

/** 403: hay sesión pero el rol (claim app_role del JWT) no alcanza. Los datos los protege la RLS igual. */
export function ForbiddenPage() {
  useDocumentTitle("Acceso restringido");

  return (
    <section className="plans-section">
      <div className="section-inner">
        <EmptyState heading="h1" title="Acceso restringido" action={<Button variant="primary" to="/home">Volver al inicio</Button>}>
          Tu cuenta no tiene permiso para ver esta página (error 403). Si crees que es un error, cierra sesión y vuelve a entrar para actualizar tu rol.
        </EmptyState>
      </div>
    </section>
  );
}

export default function NotFoundPage() {
  useDocumentTitle("Página no encontrada");

  return (
    <section className="plans-section">
      <div className="section-inner">
        <EmptyState heading="h1" title="Página no encontrada" action={<Button variant="primary" to="/home">Volver al inicio</Button>}>
          La ruta que buscas no existe en CINET.
        </EmptyState>
      </div>
    </section>
  );
}
