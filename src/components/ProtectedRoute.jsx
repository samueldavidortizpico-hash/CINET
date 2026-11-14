import { Navigate, Outlet, useLocation } from "react-router-dom";
import Loading from "./common/Loading.jsx";
import { ForbiddenPage } from "../pages/NotFoundPage.jsx";
import { useAuth } from "../hooks/useAuth.js";

/**
 * Solo deja pasar a usuarios autenticados; al resto lo envía a /login.
 * Con `roles`, además exige uno de esos roles (leído de public.profiles).
 * Es control de interfaz: los datos los protegen las políticas RLS de Supabase.
 */
export default function ProtectedRoute({ roles }) {
  const { user, isAuthenticated, loading, profileLoading, restoreError, retryRestore } = useAuth();
  const location = useLocation();

  // Al recargar, espera a que Supabase restaure la sesión (y el perfil, si hay roles) antes de decidir.
  if (loading && restoreError) return (
    <section className="section-inner" role="alert">
      <p>{restoreError}</p>
      <button type="button" className="btn btn-secondary" onClick={retryRestore}>Reintentar</button>
    </section>
  );
  if (loading || (roles && profileLoading)) return <Loading label="Comprobando sesión" />;
  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search + location.hash }} />;
  }
  if (roles && !roles.includes(user.role)) return <ForbiddenPage />;
  return <Outlet />;
}
