import { useState } from "react";
import Button from "../components/common/Button.jsx";
import { useAsync } from "../hooks/useAsync.js";
import { useDocumentTitle } from "../hooks/useDocumentTitle.js";
import { useToast } from "../hooks/useToast.js";
import { partnersAvailable, pendingOrganizations, setOrganizationStatus } from "../services/partnerRepository.js";
import { safeHostname, safeHttpsUrl } from "../utils/url.js";

// Herramientas de administración existentes. Cada una se trasladará aquí cuando
// sus datos vivan en Supabase con políticas RLS que solo permitan escribir a admins.
const TOOLS = [
  {
    title: "Carrusel de Inicio",
    description: "Elige qué películas aparecen primero en Inicio. Hoy se guarda solo en este navegador.",
    to: "/dashboard",
    action: "Abrir en el Dashboard",
  },
];

/** Aliados que pidieron cuenta. Verificar habilita publicar; no es un convenio. Lo decide el servidor (verify_organization). */
function PendingPartners() {
  const { showToast } = useToast();
  const [version, setVersion] = useState(0);
  const { data: pending, error } = useAsync(partnersAvailable() ? `pending-orgs-${version}` : null, pendingOrganizations);
  const decide = async (org, status) => {
    try {
      await setOrganizationStatus(org.id, status);
      showToast(status === "verified" ? `«${org.name}» verificada` : `«${org.name}» suspendida`);
      setVersion((value) => value + 1);
    } catch (decideError) {
      showToast(decideError.message);
    }
  };
  if (!partnersAvailable()) return null;
  return (
    <section className="admin-tool admin-partners">
      <h3>Aliados por verificar</h3>
      <p>Revisa que el sitio oficial sea de la organización antes de verificarla. Verificar solo habilita publicar funciones y eventos.</p>
      {error && <p className="error-message" role="alert">{error.message}</p>}
      {pending?.length === 0 && <p>No hay solicitudes pendientes.</p>}
      <ul>
        {pending?.map((org) => {
          // official_url lo escribe quien solicita la cuenta: nunca se asume que new URL() la acepte.
          const href = safeHttpsUrl(org.official_url);
          const host = safeHostname(org.official_url);
          const usable = Boolean(href && host);
          return (
            <li key={org.id}>
              <span>
                <strong>{org.name}</strong> · {org.kind === "cinema" ? "Cine" : "Organizador"} ·{" "}
                {usable ? (
                  <a href={href} target="_blank" rel="noopener noreferrer">{host}</a>
                ) : (
                  <span className="error-message">Sitio no válido: <code className="admin-raw-url">{org.official_url}</code></span>
                )}
              </span>
              <span className="admin-partner-actions">
                <Button
                  variant="primary"
                  disabled={!usable}
                  title={usable ? undefined : "No se puede verificar un sitio que no se puede abrir"}
                  onClick={() => decide(org, "verified")}
                >
                  Verificar
                </Button>
                <Button variant="secondary" onClick={() => decide(org, "suspended")}>Rechazar</Button>
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/** Punto de entrada de administración. Ruta protegida por rol (ver router y ProtectedRoute). */
export default function AdminPage() {
  useDocumentTitle("Administración");

  return (
    <section className="catalog-section dashboard">
      <div className="section-heading">
        <div>
          <p className="eyebrow">CINET</p>
          <h2>Administración</h2>
        </div>
        <p>Herramientas reservadas al equipo. Los permisos reales los aplica Supabase, no esta página.</p>
      </div>

      <ul className="admin-tools">
        {TOOLS.map((tool) => (
          <li key={tool.title} className="admin-tool">
            <h3>{tool.title}</h3>
            <p>{tool.description}</p>
            <Button variant="secondary" to={tool.to}>{tool.action}</Button>
          </li>
        ))}
      </ul>
      <PendingPartners />
    </section>
  );
}
