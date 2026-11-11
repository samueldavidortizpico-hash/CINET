import { NavLink } from "react-router-dom";

// Descubrimiento y Duo. Cuenta, dashboard, ajustes, legal y administración viven en el panel del avatar (UserMenu).
const LINKS = [
  { to: "/home", label: "Inicio" },
  { to: "/movies", label: "Películas" },
  { to: "/cine", label: "Cine", className: "nav-cine" },
  { to: "/duo", label: "Duo", className: "nav-duo" },
  { to: "/my-plans", label: "Mis planes" },
];

export default function Navbar() {
  return (
    <nav aria-label="Navegación principal">
      <ul className="nav-list">
        {LINKS.map(({ to, label, className }) => (
          <li key={to}>
            <NavLink to={to} className={className}>
              {label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
