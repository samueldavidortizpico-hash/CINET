import { Link } from "react-router-dom";
import Navbar from "./Navbar.jsx";
import UserMenu from "./UserMenu.jsx";
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

      <div className="header-actions">
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
        <UserMenu />
      </div>
    </header>
  );
}
