import { useState } from "react";
import { analyticsEnabled, getAnalyticsConsent, setAnalyticsConsent } from "../../services/analytics.js";

/**
 * Medición anónima (va en el pie): pregunta una vez con un aviso y deja cambiar de opinión cuando se quiera
 * (retirarla borra el id anónimo de este navegador). Sin endpoint configurado no se muestra: no se mide nada.
 */
export default function AnalyticsConsent() {
  const [choice, setChoice] = useState(getAnalyticsConsent);
  if (!analyticsEnabled) return null;

  const decide = (value) => {
    setAnalyticsConsent(value);
    setChoice(value);
  };
  const granted = choice === "granted";

  return (
    <>
      <button type="button" className="footer-consent" aria-pressed={granted} onClick={() => decide(granted ? "denied" : "granted")}>
        Medición anónima: {granted ? "activada" : "desactivada"}
      </button>
      {!choice && (
        <section className="consent-banner" aria-label="Medición anónima">
          <p>
            ¿Nos ayudas a mejorar CINET con medición anónima? Solo contamos acciones (por ejemplo, «se creó un plan»), nunca tu nombre, tu correo ni tus gustos.
          </p>
          <div>
            <button type="button" className="btn btn-primary" onClick={() => decide("granted")}>Aceptar</button>
            <button type="button" className="btn btn-secondary" onClick={() => decide("denied")}>No, gracias</button>
          </div>
        </section>
      )}
    </>
  );
}
