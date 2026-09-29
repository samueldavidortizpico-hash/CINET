import Button from "../components/common/Button.jsx";
import { useDocumentTitle } from "../hooks/useDocumentTitle.js";

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
    </section>
  );
}
