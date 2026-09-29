import { Link } from "react-router-dom";
import TmdbStatus from "../common/TmdbStatus.jsx";
import BrandLogo from "../common/BrandLogo.jsx";

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-brand">
        <Link className="logo logo-brand" to="/home" aria-label="CINET — Inicio"><BrandLogo /></Link>
        <p>Buenas historias. Mejores planes.</p>
        <p>Universidad de La Sabana</p>
      </div>

      <div className="footer-links">
        <Link to="/about">Acerca de</Link>
        <Link to="/movies">Películas</Link>
        <Link to="/my-plans">Mis planes</Link>
      </div>

      <TmdbStatus className="footer-tmdb" />

      <p className="footer-copy">© {new Date().getFullYear()} CINET</p>
    </footer>
  );
}
