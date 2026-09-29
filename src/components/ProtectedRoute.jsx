import { Navigate, Outlet, useLocation } from "react-router-dom";
import Loading from "./common/Loading.jsx";
import { useAuth } from "../hooks/useAuth.js";

/**
 * Solo deja pasar a usuarios autenticados; al resto lo envía a /login.
 * Con `roles`, además exige uno de esos roles (leído de public.profiles).
 * Es control de interfaz: los datos los protegen las políticas RLS de Supabase.
 */
export default function ProtectedRoute({ roles }) {
  const { user, isAuthenticated, loading, profileLoading } = useAuth();
  const location = useLocation();

  // Al recargar, espera a que Supabase restaure la sesión (y el perfil, si hay roles) antes de decidir.
  if (loading || (roles && profileLoading)) return <Loading label="Comprobando sesión" />;
  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  if (roles && !roles.includes(user.role)) return <Navigate to="/dashboard" replace />;
  return <Outlet />;
}
