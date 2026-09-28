import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth.js";

/** Solo deja pasar a usuarios autenticados; al resto lo envía a /profile. */
export default function ProtectedRoute() {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/profile" replace state={{ from: location.pathname }} />;
  }
  return <Outlet />;
}
