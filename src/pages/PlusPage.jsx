import { useState } from "react";
import { Link } from "react-router-dom";
import Button from "../components/common/Button.jsx";
import Loading from "../components/common/Loading.jsx";
import { useAsync } from "../hooks/useAsync.js";
import { useAuth } from "../hooks/useAuth.js";
import { useDocumentTitle } from "../hooks/useDocumentTitle.js";
import { track } from "../services/analytics.js";
import { PLUS_PRICE_COP, cancelPlusSandbox, getPlusStatus, startPlusSandbox } from "../services/plusRepository.js";

// Lo básico de Duo, invitar, votar y el modo familia es gratis siempre. «En diseño» no está disponible.
const FREE = [
  "Duo de 1 a 8 personas, en un teléfono o en salas con código",
  "Planes, invitaciones, confirmaciones y encuesta de horarios",
  "Modo familia y vetos",
  "Grupos guardados y repetir un plan a mano",
  "Importar tu historial y tu resumen",
];
const PLUS = [
  { title: "Noche fija", text: "El plan se repite cada semana, cada 2 semanas o cada mes, y la siguiente se programa en un clic con las mismas personas.", ready: true },
  { title: "Coorganizar", text: "Otra persona puede editar y recordar el plan contigo.", ready: false },
  { title: "Planes con tu estilo", text: "Portada y colores propios para tus planes y grupos.", ready: false },
];
const price = new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(PLUS_PRICE_COP);
const day = (iso) => new Date(iso).toLocaleDateString("es-CO", { day: "numeric", month: "long", year: "numeric" });

function Status({ user }) {
  const [version, setVersion] = useState(0);
  const { data: status, error, loading } = useAsync(`plus-${user?.id ?? "anon"}-${version}`, () => getPlusStatus(user?.id));
  const [state, setState] = useState({ busy: false, error: "" });

  const act = async (action) => {
    setState({ busy: true, error: "" });
    try {
      await action();
      setVersion((value) => value + 1);
      setState({ busy: false, error: "" });
    } catch (actionError) {
      setState({ busy: false, error: actionError.message });
    }
  };

  if (loading) return <Loading label="Revisando tu cuenta" />;
  if (error) return <p className="error-message" role="alert">{error.message}</p>;
  const plus = status?.plus;
  return (
    <section className="plus-status" aria-label="Tu estado">
      {plus?.active ? (
        <>
          <h2>{plus.status === "canceled" ? "Plus cancelado" : "Tienes Plus"} {plus.source === "sandbox" && <span className="plus-tag">PRUEBA</span>}</h2>
          <p>{plus.status === "canceled" ? `Sigue activo hasta el ${day(plus.endsAt)}; después vuelves a lo gratuito sin perder nada.` : `Activo hasta el ${day(plus.endsAt)}.`}{plus.source === "sandbox" && " Es una prueba: no se cobró nada."}</p>
          {plus.status === "active" && plus.source === "sandbox" && <Button variant="secondary" disabled={state.busy} onClick={() => act(cancelPlusSandbox)}>Cancelar la prueba</Button>}
        </>
      ) : !status?.sandbox ? (
        <>
          <h2>Plus aún no está disponible</h2>
          <p>Estamos definiendo precio, pasarela y condiciones. Hoy no se cobra nada y todo lo gratuito sigue igual.</p>
        </>
      ) : !user || user.guest ? (
        <>
          <h2>Prueba Plus con tu cuenta</h2>
          <p><Link to="/login">Inicia sesión o crea una cuenta</Link> para probarlo. Las invitadas e invitados sin cuenta no lo necesitan para participar.</p>
        </>
      ) : (
        <>
          <h2>Pruébalo 30 días</h2>
          <p>Modo de prueba: no pedimos tarjeta ni se cobra nada. Al terminar vuelves a lo gratuito.</p>
          <Button variant="primary" disabled={state.busy} onClick={() => act(async () => { await startPlusSandbox(); track("plus_sandbox_started"); })}>Activar la prueba</Button>
        </>
      )}
      {state.error && <p className="error-message" role="alert">{state.error}</p>}
    </section>
  );
}

/** /plus — qué es gratis, qué sería Plus y una prueba de precio honesta (sin cobros). */
export default function PlusPage() {
  const { user } = useAuth();
  const [answer, setAnswer] = useState(null);
  useDocumentTitle("CINET Plus");

  const answerPrice = (value) => {
    setAnswer(value);
    track("plus_price_answer", { price_cop: PLUS_PRICE_COP, answer: value });
  };

  return (
    <div className="duo-page room-page plus-page">
      <div className="duo-container">
        <header className="room-intro">
          <span className="duo-badge">CINET · PLUS</span>
          <h1>Para quien siempre organiza el plan</h1>
          <p className="duo-lead">Elegir juntos, invitar y votar es gratis para siempre. Plus suma comodidad para quien arma la noche de cine cada semana.</p>
        </header>

        <Status user={user} />

        <div className="plus-matrix">
          <section aria-labelledby="plus-free">
            <h2 id="plus-free">Gratis, siempre</h2>
            <ul>{FREE.map((item) => <li key={item}>{item}</li>)}</ul>
          </section>
          <section aria-labelledby="plus-plus">
            <h2 id="plus-plus">Plus</h2>
            <ul>
              {PLUS.map((item) => (
                <li key={item.title}>
                  <strong>{item.title}</strong> {!item.ready && <span className="plus-tag">EN DISEÑO</span>}
                  <small>{item.text}</small>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <section className="plus-price" aria-labelledby="plus-price-title">
          <h2 id="plus-price-title">¿Lo pagarías?</h2>
          <p>Estamos probando un precio de <strong>{price} al mes</strong>. Es una hipótesis, no un precio definitivo, y hoy no se cobra nada.</p>
          {answer ? (
            <p role="status">Gracias. Tu respuesta nos ayuda a decidir; no te suscribe a nada.</p>
          ) : (
            <div className="plan-actions">
              <Button variant="secondary" onClick={() => answerPrice("interested")}>Me interesa a ese precio</Button>
              <Button variant="secondary" onClick={() => answerPrice("too_expensive")}>Me parece caro</Button>
            </div>
          )}
          <p className="plan-note">La respuesta solo se registra si aceptaste la analítica, y sin datos personales.</p>
        </section>
      </div>
    </div>
  );
}
