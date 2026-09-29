import Button from "../common/Button.jsx";
import ProfileForm from "./ProfileForm.jsx";
import UserAvatar from "./UserAvatar.jsx";
import { useAuth } from "../../hooks/useAuth.js";
import { useFavorites } from "../../hooks/useFavorites.js";
import { usePlans } from "../../hooks/usePlans.js";
import { useToast } from "../../hooks/useToast.js";

const ROLE_LABELS = { user: "Usuario", moderator: "Moderador", admin: "Admin" };

export default function ProfileCard() {
  const { user, profile, profileLoading, profileError, logout } = useAuth();
  const { favorites } = useFavorites();
  const { plans } = usePlans();
  const { showToast } = useToast();
  const ownPlans = plans.filter((plan) => plan.ownerEmail === user.email).length;

  const handleLogout = async () => {
    try {
      await logout();
      showToast("👋 Sesión cerrada");
    } catch (error) {
      showToast(`⚠️ ${error.message}`);
    }
  };

  return (
    <div className="signup-form profile-card">
      <div className="profile-header">
        <UserAvatar user={user} />
        <div>
          <h3>{user.name}</h3>
          <p>{profile?.username ? `@${profile.username} · ` : ""}{user.email}</p>
        </div>
        {/* Solo lectura: el rol se asigna desde la base de datos, nunca desde aquí. */}
        <span className="profile-role" title="Tu rol en CINET">{ROLE_LABELS[user.role] ?? user.role}</span>
      </div>

      {profile && <p className="profile-bio">{profile.bio}</p>}

      <div className="profile-stats">
        <span><strong>{favorites.length}</strong> favoritas</span>
        <span><strong>{ownPlans}</strong> planes organizados</span>
      </div>

      {profileLoading && <p className="profile-hint" role="status">Cargando tu perfil…</p>}
      {profileError && <p className="form-error" role="alert">No pudimos cargar tu perfil: {profileError}</p>}
      {profile && <ProfileForm key={profile.id} profile={profile} />}

      <div className="profile-actions">
        <Button variant="primary" to="/dashboard">Ir a mi dashboard →</Button>
        <Button variant="secondary" onClick={handleLogout}>Cerrar sesión</Button>
      </div>
    </div>
  );
}
