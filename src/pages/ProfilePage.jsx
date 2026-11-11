import { Link, Navigate } from "react-router-dom";
import PreferencesPanel from "../components/auth/PreferencesPanel.jsx";
import ProfileCard from "../components/auth/ProfileCard.jsx";
import CinephileProfile from "../components/profile/CinephileProfile.jsx";
import Loading from "../components/common/Loading.jsx";
import { useAuth } from "../hooks/useAuth.js";
import { useDocumentTitle } from "../hooks/useDocumentTitle.js";

/** Mi perfil. El acceso vive en la entrada (AuthPage): sin sesión, /profile lleva allí y vuelve aquí. */
export default function ProfilePage() {
  const { isAuthenticated, loading } = useAuth();
  useDocumentTitle("Mi perfil");

  if (loading) return <Loading label="Comprobando sesión" />;
  if (!isAuthenticated) return <Navigate to="/login" replace state={{ from: "/profile" }} />;

  return (
    <section id="registro" className="signup signup-section">
      <div className="section-inner">
        <p className="eyebrow">TU CUENTA</p>
        <h2>Mi perfil</h2>
        <p>Personaliza tu experiencia cinematográfica.</p>
        <ProfileCard />
        <PreferencesPanel />
        <p className="auth-notice">
          ¿Ya llevas tu historial en Letterboxd o IMDb? <Link to="/importar">Importa lo que ya viste</Link> y Duo no te lo volverá a proponer.
        </p>
      </div>
      <CinephileProfile />
    </section>
  );
}
