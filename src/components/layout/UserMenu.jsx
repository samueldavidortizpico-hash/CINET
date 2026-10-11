import { useEffect, useId, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import UserAvatar from "../auth/UserAvatar.jsx";
import Icon from "../common/Icon.jsx";
import { useAuth } from "../../hooks/useAuth.js";
import { usePrefersReducedMotion } from "../../hooks/usePrefersReducedMotion.js";
import { useToast } from "../../hooks/useToast.js";

// Solo accesos a páginas que existen: el panel enlaza, no duplica su lógica.
const LINKS = [
  { to: "/dashboard", label: "Dashboard", hint: "Tus favoritas y los planes que organizas" },
  { to: "/profile", label: "Perfil y ajustes", hint: "Nombre, foto, gustos e importación" },
  { to: "/my-plans", label: "Mis planes" },
  { to: "/grupos", label: "Mis grupos" },
  { to: "/resumen", label: "Tu año en CINET" },
  { to: "/plus", label: "CINET Plus" },
  { to: "/legal", label: "Legal y privacidad" },
];

// Opciones extra por rol (role viene de public.profiles). Ocultarlas es solo UI:
// lo que protege los datos son ProtectedRoute y las políticas RLS de Supabase.
const STAFF_LINKS = {
  admin: [{ to: "/admin", label: "Administración" }],
  moderator: [], // Aquí irán las herramientas de moderación cuando existan.
};

const CLOSE_MS = 160; // igual que la animación de salida en app.css

/**
 * Avatar del header → centro de cuenta. <dialog> modal: anclado al avatar en escritorio y hoja inferior
 * en móvil. El navegador atrapa el foco, bloquea lo que queda detrás y devuelve el foco al avatar.
 * Se cierra con Escape, el botón de cerrar, un toque fuera (también sobre el avatar) o al navegar.
 */
export default function UserMenu() {
  const { user, profile, loading, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const reducedMotion = usePrefersReducedMotion();
  const dialog = useRef(null);
  const trigger = useRef(null);
  const closing = useRef(null);
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const titleId = useId();

  // Al cambiar de ruta (enlace, atrás/adelante) el panel queda cerrado.
  useEffect(() => {
    dialog.current?.close();
  }, [location.pathname]);

  if (loading) return null;
  if (!user) {
    return (
      <Link className="btn btn-primary header-login" to="/login" state={{ from: location.pathname + location.search }}>
        Entrar
      </Link>
    );
  }

  const staffLinks = STAFF_LINKS[user.role] ?? [];

  const openPanel = () => {
    const element = dialog.current;
    const rect = trigger.current.getBoundingClientRect();
    clearTimeout(closing.current);
    delete element.dataset.closing;
    element.style.setProperty("--anchor-top", `${Math.round(rect.bottom + 10)}px`);
    element.style.setProperty("--anchor-right", `${Math.max(16, Math.round(window.innerWidth - rect.right))}px`);
    element.showModal();
    setOpen(true);
  };

  const closePanel = () => {
    const element = dialog.current;
    if (!element?.open || element.dataset.closing) return;
    if (reducedMotion) return element.close();
    element.dataset.closing = "true";
    closing.current = setTimeout(() => {
      delete element.dataset.closing;
      element.close();
    }, CLOSE_MS);
  };

  const handleLogout = async () => {
    dialog.current?.close();
    try {
      await logout();
      navigate("/login", { replace: true }); // sin destino: la siguiente cuenta empieza limpia
      showToast("👋 Sesión cerrada");
    } catch (error) {
      showToast(`⚠️ ${error.message}`);
    }
  };

  const linkProps = (to) => ({
    to,
    "aria-current": location.pathname === to ? "page" : undefined,
    onClick: () => dialog.current?.close(),
  });

  return (
    <div className="user-menu">
      <button
        ref={trigger}
        type="button"
        className="user-menu-trigger"
        aria-label={`Tu cuenta: ${user.name}`}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => (open ? closePanel() : openPanel())}
      >
        <UserAvatar user={user} className="profile-avatar user-menu-avatar" />
      </button>

      <dialog
        ref={dialog}
        id={panelId}
        className="account-panel"
        aria-labelledby={titleId}
        onCancel={(event) => {
          event.preventDefault(); // Escape: misma salida animada que el resto
          closePanel();
        }}
        onClose={() => {
          setOpen(false);
          trigger.current?.focus();
        }}
        // Un toque en el fondo (fuera de la tarjeta) cierra.
        onClick={(event) => event.target === dialog.current && closePanel()}
      >
        <div className="account-panel-inner">
          <header className="account-panel-head">
            <UserAvatar user={user} className="profile-avatar" />
            <div>
              <p id={titleId} className="account-panel-name">{user.name}</p>
              <p className="account-panel-handle">{profile?.username ? `@${profile.username}` : user.guest ? "Cuenta de invitado" : user.email}</p>
            </div>
            <button type="button" className="account-panel-close" aria-label="Cerrar panel de cuenta" onClick={closePanel}>
              <Icon name="close" />
            </button>
          </header>

          <nav aria-label="Tu cuenta">
            <ul>
              {LINKS.map(({ to, label, hint }) => (
                <li key={to}>
                  <Link {...linkProps(to)}>
                    <span>{label}</span>
                    {hint && <small>{hint}</small>}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {staffLinks.length > 0 && (
            <nav aria-label="Administración" className="account-panel-staff">
              <p className="account-panel-label">Por tu rol</p>
              <ul>
                {staffLinks.map(({ to, label }) => (
                  <li key={to}>
                    <Link {...linkProps(to)}>
                      <span>{label}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          )}

          <button type="button" className="account-panel-logout" onClick={handleLogout}>Cerrar sesión</button>
        </div>
      </dialog>
    </div>
  );
}
