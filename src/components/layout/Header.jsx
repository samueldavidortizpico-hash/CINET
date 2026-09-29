import { Link } from "react-router-dom";
import Navbar from "./Navbar.jsx";
import { useTheme } from "../../hooks/useTheme.js";
import BrandLogo from "../common/BrandLogo.jsx";
import Icon from "../common/Icon.jsx";

export default function Header() {
  const { isDark, toggleTheme } = useTheme();

  return (
    <header className="site-header">
      <Link className="logo logo-brand" to="/home" aria-label="CINET — Inicio">
        <BrandLogo />
      </Link>

      <Navbar />

      <button
        id="theme-toggle"
        className="theme-button"
        type="button"
        aria-label={isDark ? "Activar modo claro" : "Activar modo oscuro"}
        title={isDark ? "Activar modo claro" : "Activar modo oscuro"}
        aria-pressed={isDark}
        onClick={toggleTheme}
      >
        <Icon name={isDark ? "sun" : "moon"} />
      </button>
    </header>
  );
}
