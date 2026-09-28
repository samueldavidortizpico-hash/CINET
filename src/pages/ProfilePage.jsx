import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import AuthForm from "../components/auth/AuthForm.jsx";
import ProfileCard from "../components/auth/ProfileCard.jsx";
import CinephileProfile from "../components/profile/CinephileProfile.jsx";
import { useAuth } from "../hooks/useAuth.js";
import { useDocumentTitle } from "../hooks/useDocumentTitle.js";
import { useToast } from "../hooks/useToast.js";

const MODES = [
  ["register", "Crear cuenta"],
  ["login", "Iniciar sesión"],
];

/** Registro / inicio de sesión, o el perfil si ya hay sesión. Destino de ProtectedRoute. */
export default function ProfilePage() {
  const { isAuthenticated } = useAuth();
  const { showToast } = useToast();
  const [mode, setMode] = useState("register");
  const location = useLocation();
  const navigate = useNavigate();
  const redirectTo = location.state?.from;
  useDocumentTitle(isAuthenticated ? "Mi perfil" : "Registro");

  const handleSuccess = (user) => {
    showToast(mode === "register" ? "✅ Cuenta creada correctamente" : `👋 Hola de nuevo, ${user.name}`);
    if (redirectTo) navigate(redirectTo, { replace: true });
  };

  const title = isAuthenticated ? "Mi perfil" : mode === "register" ? "Crea tu cuenta" : "Inicia sesión";

  return (
    <section id="registro" className="signup signup-section">
      <div className="section-inner">
        <p className="eyebrow">{isAuthenticated ? "TU CUENTA" : "ÚNETE A CINEHUB"}</p>
        <h2>{title}</h2>
        <p>Personaliza tu experiencia cinematográfica.</p>

        {isAuthenticated ? (
          <ProfileCard />
        ) : (
          <>
            {redirectTo && (
              <p className="auth-notice" role="status">
                🔒 Inicia sesión o crea una cuenta para entrar a tu dashboard.
              </p>
            )}
            <div className="filter-group auth-modes" role="group" aria-label="Tipo de acceso">
              {MODES.map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  className={`filter-btn${mode === value ? " active" : ""}`}
                  aria-pressed={mode === value}
                  onClick={() => setMode(value)}
                >
                  {label}
                </button>
              ))}
            </div>
            <AuthForm key={mode} mode={mode} onSuccess={handleSuccess} />
          </>
        )}
      </div>
      <CinephileProfile />
    </section>
  );
}
