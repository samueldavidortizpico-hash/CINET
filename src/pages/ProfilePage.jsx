import { useLocation, useNavigate } from "react-router-dom";
import AuthForm from "../components/auth/AuthForm.jsx";
import ProfileCard from "../components/auth/ProfileCard.jsx";
import CinephileProfile from "../components/profile/CinephileProfile.jsx";
import Loading from "../components/common/Loading.jsx";
import { useAuth } from "../hooks/useAuth.js";
import { useDocumentTitle } from "../hooks/useDocumentTitle.js";
import { useToast } from "../hooks/useToast.js";

const MODES = [
  ["register", "Crear cuenta"],
  ["login", "Iniciar sesión"],
];

/** Registro (/register, /profile) o inicio de sesión (/login), o el perfil si ya hay sesión. */
export default function ProfilePage({ mode = "register" }) {
  const { isAuthenticated, loading } = useAuth();
  const { showToast } = useToast();
  const location = useLocation();
  const navigate = useNavigate();
  const redirectTo = location.state?.from;
  const confirmEmail = location.state?.confirmEmail;
  useDocumentTitle(isAuthenticated ? "Mi perfil" : mode === "register" ? "Registro" : "Iniciar sesión");

  const handleSuccess = (result) => {
    if (mode === "register" && result.needsConfirmation) {
      navigate("/login", { replace: true, state: { from: redirectTo, confirmEmail: result.user.email } });
      return;
    }
    const user = mode === "register" ? result.user : result;
    showToast(mode === "register" ? "✅ Cuenta creada correctamente" : `👋 Hola de nuevo, ${user.name}`);
    navigate(redirectTo ?? "/profile", { replace: true });
  };

  const title = isAuthenticated ? "Mi perfil" : mode === "register" ? "Crea tu cuenta" : "Inicia sesión";

  return (
    <section id="registro" className="signup signup-section">
      <div className="section-inner">
        <p className="eyebrow">{isAuthenticated ? "TU CUENTA" : "ÚNETE A CINEHUB"}</p>
        <h2>{title}</h2>
        <p>Personaliza tu experiencia cinematográfica.</p>

        {loading ? (
          <Loading label="Comprobando sesión" />
        ) : isAuthenticated ? (
          <ProfileCard />
        ) : (
          <>
            {confirmEmail && (
              <p className="auth-notice" role="status">
                📩 Te enviamos un correo a <strong>{confirmEmail}</strong>. Confirma tu cuenta con el enlace y luego inicia sesión.
              </p>
            )}
            {redirectTo && !confirmEmail && (
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
                  onClick={() => navigate(`/${value}`, { state: { from: redirectTo } })}
                >
                  {label}
                </button>
              ))}
            </div>
            <AuthForm key={mode} mode={mode} initialEmail={confirmEmail} onSuccess={handleSuccess} />
          </>
        )}
      </div>
      <CinephileProfile />
    </section>
  );
}
