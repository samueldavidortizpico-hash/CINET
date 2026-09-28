import Button from "../common/Button.jsx";
import { useAuth } from "../../hooks/useAuth.js";
import { useFavorites } from "../../hooks/useFavorites.js";
import { usePlans } from "../../hooks/usePlans.js";
import { useToast } from "../../hooks/useToast.js";

export default function ProfileCard() {
  const { user, logout } = useAuth();
  const { favorites } = useFavorites();
  const { plans } = usePlans();
  const { showToast } = useToast();
  const ownPlans = plans.filter((plan) => plan.ownerEmail === user.email).length;

  const handleLogout = () => {
    logout();
    showToast("👋 Sesión cerrada");
  };

  return (
    <div className="signup-form profile-card">
      <div className="profile-header">
        <span className="profile-avatar" aria-hidden="true">
          {user.name.charAt(0).toUpperCase()}
        </span>
        <div>
          <h3>{user.name}</h3>
          <p>{user.email}</p>
        </div>
      </div>

      <div className="profile-stats">
        <span><strong>{favorites.length}</strong> favoritas</span>
        <span><strong>{ownPlans}</strong> planes organizados</span>
      </div>

      <div className="profile-actions">
        <Button variant="primary" to="/dashboard">Ir a mi dashboard →</Button>
        <Button variant="secondary" onClick={handleLogout}>Cerrar sesión</Button>
      </div>
    </div>
  );
}
