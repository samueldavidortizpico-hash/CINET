import { Link } from "react-router-dom";
import Navbar from "./Navbar.jsx";
import { useTheme } from "../../hooks/useTheme.js";
import cinetLogo from "../../../images/cinet-logo.png"; // Vite lo copia a dist con el base de GitHub Pages
import headerBackground from "../../assets/cinet-header-bg.png";

export default function Header() {
  const { isDark, toggleTheme } = useTheme();

  return (
    <header className="site-header" style={{ "--header-bg": `url(${headerBackground})` }}>
      <Link className="logo logo-brand" to="/home" aria-label="CINET — Inicio">
        <img className="logo-img" src={cinetLogo} alt="CINET" width="2172" height="724" />
        <span className="logo-caption">Tu próxima función</span>
      </Link>

      <Navbar />

      <button
        id="theme-toggle"
        className="theme-button"
        type="button"
        aria-label="Cambiar tema"
        aria-pressed={isDark}
        onClick={toggleTheme}
      >
        {isDark ? "☀️ Modo claro" : "🌙 Modo oscuro"}
      </button>
    </header>
  );
}
