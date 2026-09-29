import { useEffect, useId, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import UserAvatar from "../auth/UserAvatar.jsx";
import { useAuth } from "../../hooks/useAuth.js";
import { useToast } from "../../hooks/useToast.js";

const LINKS = [
  { to: "/profile", label: "Ver perfil" },
  { to: "/dashboard", label: "Dashboard" },
];

// Opciones extra por rol (role viene de public.profiles). Ocultarlas es solo UI:
// lo que protege los datos son las políticas RLS de Supabase.
const STAFF_LINKS = {
  admin: [{ to: "/admin", label: "Administración" }],
  moderator: [], // Aquí irán las herramientas de moderación cuando existan.
};

/** Avatar circular del header con menú desplegable (patrón disclosure: Tab, Escape, clic fuera). */
export default function UserMenu() {
  const { user, profile, logout } = useAuth();
  const { showToast } = useToast();
  const { pathname } = useLocation();
  const menuId = useId();
  const root = useRef(null);
  const button = useRef(null);
  // Se guarda la ruta en la que se abrió: al navegar (enlace, atrás/adelante) queda cerrado solo.
  const [openAt, setOpenAt] = useState(null);
  const open = openAt === pathname;
  const close = () => setOpenAt(null);

  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (event) => {
      if (!root.current?.contains(event.target)) setOpenAt(null);
    };
    const onKeyDown = (event) => {
      if (event.key !== "Escape") return;
      setOpenAt(null);
      button.current?.focus();
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  if (!user) return null;
  const staffLinks = STAFF_LINKS[user.role] ?? [];

  const handleLogout = async () => {
    close();
    try {
      await logout();
      showToast("👋 Sesión cerrada");
    } catch (error) {
      showToast(`⚠️ ${error.message}`);
    }
  };

  return (
    <div
      ref={root}
      className="user-menu"
      // Si el foco sale del menú con Tab, se cierra.
      onBlur={(event) => !root.current.contains(event.relatedTarget) && close()}
    >
      <button
        ref={button}
        type="button"
        className="user-menu-trigger"
        aria-label={`Menú de ${user.name}`}
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpenAt(open ? null : pathname)}
      >
        <UserAvatar user={user} className="profile-avatar user-menu-avatar" />
      </button>

      <div id={menuId} className="user-menu-panel" hidden={!open}>
        <div className="user-menu-identity">
          <UserAvatar user={user} className="profile-avatar" />
          <div>
            <p className="user-menu-name">{user.name}</p>
            <p className="user-menu-handle">{profile?.username ? `@${profile.username}` : user.email}</p>
          </div>
        </div>

        <nav aria-label="Menú de usuario">
          <ul>
            {LINKS.map(({ to, label }) => (
              <li key={to}>
                <Link to={to} onClick={close} aria-current={pathname === to ? "page" : undefined}>{label}</Link>
              </li>
            ))}
            {staffLinks.map(({ to, label }) => (
              <li key={to}>
                <Link to={to} onClick={close} className="user-menu-staff" aria-current={pathname === to ? "page" : undefined}>{label}</Link>
              </li>
            ))}
            <li>
              <button type="button" className="user-menu-logout" onClick={handleLogout}>Cerrar sesión</button>
            </li>
          </ul>
        </nav>
      </div>
    </div>
  );
}
