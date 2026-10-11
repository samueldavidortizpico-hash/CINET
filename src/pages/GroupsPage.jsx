import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import Button from "../components/common/Button.jsx";
import EmptyState from "../components/common/EmptyState.jsx";
import Loading from "../components/common/Loading.jsx";
import { useAsync } from "../hooks/useAsync.js";
import { useAuth } from "../hooks/useAuth.js";
import { useDocumentTitle } from "../hooks/useDocumentTitle.js";
import { useShare } from "../hooks/useShare.js";
import { useToast } from "../hooks/useToast.js";
import { isUpcoming } from "../services/planService.js";
import * as repo from "../services/groupRepository.js";
import { appUrl } from "../utils/share.js";

function Shell({ children, back = true }) {
  return (
    <div className="duo-page room-page groups-page">
      <div className="duo-container">
        {back && <Link to="/grupos" className="back-link">← Mis grupos</Link>}
        {children}
      </div>
    </div>
  );
}

const names = (members) => {
  const list = members.map((member) => member.name);
  return list.length > 4 ? `${list.slice(0, 4).join(", ")} y ${list.length - 4} más` : list.join(", ");
};

/** /grupos — los grupos de los que eres parte y crear uno nuevo. */
function GroupList({ user }) {
  const navigate = useNavigate();
  const { data: groups, error, loading } = useAsync(`groups-${user.id}`, () => repo.listGroups(user.id));
  const [name, setName] = useState("");
  const [state, setState] = useState({ busy: false, error: "" });

  const create = async (event) => {
    event.preventDefault();
    setState({ busy: true, error: "" });
    try {
      navigate(`/grupos/${await repo.createGroup(name, user.name ?? "")}`);
    } catch (createError) {
      setState({ busy: false, error: createError.message });
    }
  };

  return (
    <Shell back={false}>
      <header className="room-intro">
        <span className="duo-badge">CINET · GRUPOS</span>
        <h1>Tus grupos</h1>
        <p className="duo-lead">La familia, los del trabajo, el parche del colegio: guarda a tu gente una vez y compárteles planes o repítelos sin volver a invitar a cada quien.</p>
      </header>
      {loading && <Loading label="Cargando tus grupos" />}
      {error && <p className="error-message" role="alert">{error.message}</p>}
      {groups?.length > 0 && (
        <ul className="group-list">
          {groups.map((group) => (
            <li key={group.id}>
              <Link className="room-card group-card" to={`/grupos/${group.id}`}>
                <strong>{group.name}</strong>
                <small>{group.members.length} {group.members.length === 1 ? "persona" : "personas"} · {names(group.members)}</small>
              </Link>
            </li>
          ))}
        </ul>
      )}
      {groups?.length === 0 && <p className="plan-note">Aún no tienes grupos.</p>}
      {user.guest ? (
        <p className="plan-note">Como invitado puedes unirte a grupos con un enlace; para crearlos necesitas una cuenta.</p>
      ) : (
        <form className="room-card group-create" onSubmit={create}>
          <h2>Crear un grupo</h2>
          <label className="duo-field">
            <span>Nombre del grupo</span>
            <input value={name} onChange={(event) => setName(event.target.value)} maxLength={60} required placeholder="Ej. La familia" />
          </label>
          {state.error && <p className="error-message" role="alert">{state.error}</p>}
          <Button variant="primary" type="submit" disabled={state.busy || !name.trim()}>{state.busy ? "Creando…" : "Crear grupo"}</Button>
        </form>
      )}
    </Shell>
  );
}

/** /grupos/:id — personas, enlace para invitar y planes del grupo. */
function GroupDetail({ id, user }) {
  const navigate = useNavigate();
  const share = useShare();
  const { showToast } = useToast();
  const [version, setVersion] = useState(0);
  const [link, setLink] = useState("");
  const [busy, setBusy] = useState(false);
  const { data, error, loading } = useAsync(`group-${id}-${user.id}-${version}`, async () => {
    const group = await repo.getGroup(id, user.id);
    if (!group) return null;
    const [plans, invites] = await Promise.all([repo.groupPlans(id, user.id), group.isOwner ? repo.listInvites(id) : []]);
    return { group, plans, invites };
  });
  const reload = () => setVersion((value) => value + 1);

  const run = async (action, message, after = reload) => {
    setBusy(true);
    try {
      const result = await action();
      if (message) showToast(message);
      after(result);
    } catch (actionError) {
      showToast(actionError.message);
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <Loading label="Abriendo el grupo" />;
  if (error || !data) {
    return (
      <Shell>
        <EmptyState heading="h1" icon="👥" title={error ? "No pudimos cargar el grupo" : "No encontramos el grupo"} action={<Button variant="primary" to="/grupos">Mis grupos</Button>}>
          {error ? error.message : "No existe o ya no eres parte de él."}
        </EmptyState>
      </Shell>
    );
  }

  const { group, plans, invites } = data;
  const upcoming = plans.filter((plan) => isUpcoming(plan) && plan.status !== "cancelled");
  const past = plans.filter((plan) => !upcoming.includes(plan));

  const invite = () =>
    run(() => repo.createInvite(id), null, (token) => {
      const url = appUrl(`grupos/unirse/${token}`);
      setLink(url);
      share({ title: `CINET · ${group.name}`, text: `Únete al grupo «${group.name}» en CINET`, url });
      reload();
    });

  return (
    <Shell>
      <header className="room-intro">
        <span className="duo-badge">CINET · GRUPO</span>
        <h1>{group.name}</h1>
        <p className="room-status">{group.members.length} {group.members.length === 1 ? "persona" : "personas"}</p>
      </header>

      <section className="room-card">
        <h2>Personas</h2>
        <ul className="plan-member-list">
          {group.members.map((member) => (
            <li key={member.userId}>
              <span>{member.name}{member.userId === user.id ? " (tú)" : ""}{member.role === "owner" ? " · creó el grupo" : ""}</span>
              {group.isOwner && member.role !== "owner" && (
                <button type="button" className="duo-link" disabled={busy} onClick={() => window.confirm(`¿Retirar a ${member.name} del grupo?`) && run(() => repo.removeMember(id, member.userId), "Persona retirada")}>
                  Retirar
                </button>
              )}
            </li>
          ))}
        </ul>
        {group.isOwner && (
          <>
            <div className="plan-actions">
              <Button variant="primary" disabled={busy} onClick={invite}>🔗 Invitar con un enlace</Button>
            </div>
            {link && (
              <p className="plan-invite-link">
                <label htmlFor="group-invite-link">Enlace para unirse (caduca en 14 días)</label>
                <input id="group-invite-link" readOnly value={link} onFocus={(event) => event.target.select()} />
              </p>
            )}
            {invites.length > 0 && (
              <ul className="plan-invite-list" aria-label="Enlaces activos">
                {invites.map((item) => (
                  <li key={item.id}>
                    <span>Enlace del {new Date(item.created_at).toLocaleDateString("es-CO")} · {item.uses} {item.uses === 1 ? "se unió" : "se unieron"}</span>
                    <button type="button" className="duo-link" disabled={busy} onClick={() => run(() => repo.revokeInvite(item.id), "Enlace revocado")}>Revocar</button>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </section>

      <section className="room-card">
        <h2>Planes del grupo</h2>
        <p className="plan-note">Crea un plan y compártelo con el grupo desde su página; también puedes repetir uno pasado con otra fecha. Quien entra al grupo ve los planes nuevos, no los anteriores.</p>
        {plans.length === 0 && <p className="plan-note">Todavía no hay planes compartidos con este grupo.</p>}
        {[["Próximos", upcoming], ["Anteriores", past]].map(([label, list]) =>
          list.length ? (
            <div key={label}>
              <h3>{label}</h3>
              <ul className="group-plans">
                {list.map((plan) => (
                  <li key={plan.id}>
                    <Link to={`/plan/${plan.id}`}>{plan.name}</Link>
                    <small>{plan.movie.title} · {plan.date}{plan.time ? ` · ${plan.time}` : ""}{plan.status === "cancelled" ? " · cancelado" : ""}</small>
                  </li>
                ))}
              </ul>
            </div>
          ) : null
        )}
        <div className="plan-actions">
          <Button variant="secondary" to="/movies">Elegir una película</Button>
          <Button variant="secondary" to="/duo/sala">Elegir en una sala de Duo</Button>
        </div>
      </section>

      <div className="plan-actions plan-danger-zone">
        {group.isOwner ? (
          <Button variant="secondary" disabled={busy} onClick={() => window.confirm(`¿Eliminar «${group.name}»? Los planes siguen, sin grupo.`) && run(() => repo.deleteGroup(id), "Grupo eliminado", () => navigate("/grupos", { replace: true }))}>
            Eliminar grupo
          </Button>
        ) : (
          <Button variant="secondary" disabled={busy} onClick={() => window.confirm("¿Salir del grupo?") && run(() => repo.leaveGroup(id), "Saliste del grupo", () => navigate("/grupos", { replace: true }))}>
            Salir del grupo
          </Button>
        )}
      </div>
    </Shell>
  );
}

/** /grupos/unirse/:token — vista previa y unirse con el nombre visible. */
function JoinGroup({ token, user }) {
  const navigate = useNavigate();
  const { data: preview, error, loading } = useAsync(`group-invite-${token}-${user.id}`, () => repo.previewInvite(token));
  const [name, setName] = useState(user.name ?? "");
  const [state, setState] = useState({ busy: false, error: "" });

  if (loading) return <Loading label="Abriendo la invitación" />;
  if (error || !preview) {
    const gone = error?.code === "CN410";
    return (
      <Shell>
        <EmptyState heading="h1" icon="⌛" title={gone ? "Esta invitación ya no sirve" : "No encontramos la invitación"} action={<Button variant="primary" to="/grupos">Mis grupos</Button>}>
          {gone ? `${error.message} Pide un enlace nuevo.` : "Revisa que el enlace esté completo o pide uno nuevo."}
        </EmptyState>
      </Shell>
    );
  }

  const join = async (event) => {
    event.preventDefault();
    setState({ busy: true, error: "" });
    try {
      navigate(`/grupos/${await repo.acceptInvite(token, name)}`, { replace: true });
    } catch (joinError) {
      setState({ busy: false, error: joinError.message });
    }
  };

  return (
    <Shell>
      <section className="room-card room-signin">
        <span className="duo-badge">INVITACIÓN A UN GRUPO</span>
        <h1>{preview.name}</h1>
        <p>{preview.owner_name} te invita · {preview.member_count} {preview.member_count === 1 ? "persona" : "personas"}</p>
        {preview.already_member ? (
          <Button variant="primary" to={`/grupos/${preview.group_id}`}>Ya estás en el grupo: verlo</Button>
        ) : (
          <form className="invite-form" onSubmit={join}>
            <label className="duo-field">
              <span>Cómo te verán en el grupo</span>
              <input value={name} onChange={(event) => setName(event.target.value)} maxLength={40} required />
            </label>
            {state.error && <p className="error-message" role="alert">{state.error}</p>}
            <Button variant="primary" type="submit" disabled={state.busy || !name.trim()}>{state.busy ? "Uniéndote…" : "Unirme al grupo"}</Button>
          </form>
        )}
      </section>
    </Shell>
  );
}

/** /grupos, /grupos/:id y /grupos/unirse/:token. */
export default function GroupsPage() {
  const { id, token } = useParams();
  const { user, loading } = useAuth();
  useDocumentTitle("Grupos");

  if (!repo.groupsAvailable()) {
    return (
      <Shell back={false}>
        <EmptyState heading="h1" icon="👥" title="Grupos">Los grupos necesitan cuentas, que no están disponibles ahora mismo.</EmptyState>
      </Shell>
    );
  }
  if (loading) return <Loading label="Cargando" />;
  if (!user) {
    const from = { from: token ? `/grupos/unirse/${token}` : id ? `/grupos/${id}` : "/grupos" };
    return (
      <Shell back={false}>
        <EmptyState
          heading="h1"
          icon="👥"
          title={token ? "Te invitaron a un grupo" : "Tus grupos"}
          action={
            <div className="plan-actions">
              <Button variant="primary" to="/login" state={from}>Iniciar sesión</Button>
              <Button variant="secondary" to="/register" state={from}>Crear cuenta</Button>
            </div>
          }
        >
          Inicia sesión para ver y guardar tus grupos.
        </EmptyState>
      </Shell>
    );
  }
  if (token) return <JoinGroup key={token} token={token} user={user} />;
  if (id) return <GroupDetail key={id} id={id} user={user} />;
  return <GroupList user={user} />;
}
