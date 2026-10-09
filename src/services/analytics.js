/* =========================================================
   analytics — contrato de eventos de producto y envío con consentimiento.
   - Solo eventos y propiedades de EVENTS; todo lo demás se descarta.
     Nunca: email, nombres, tokens de invitación, gustos ni votos individuales.
   - Sin VITE_ANALYTICS_ENDPOINT no se envía nada (no se simula medición).
   - Con endpoint, solo si la persona aceptó; retirar el consentimiento borra
     el id anónimo de este navegador. Retención y borrado en el servidor:
     docs/ANALITICA.md.
   ========================================================= */

import { clientEnv } from "../utils/env.js";
import { readStorage, writeStorage } from "../utils/storage.js";

/** Evento → propiedades permitidas (valores: booleano, número o texto corto). */
export const EVENTS = {
  duo_started: ["group_size", "mode"],
  preferences_completed: ["group_size"],
  round_started: ["group_size", "candidates"],
  round_completed: ["group_size", "result"], // result: match | top | none
  title_chosen: ["group_size", "source"], // source: round | card | match
  room_joined: ["group_size"],
  plan_created: ["mode", "shared"],
  invite_created: [],
  invite_accepted: [],
  rsvp_changed: ["rsvp"],
  official_booking_clicked: ["chain"],
  plan_completed_reported: [],
};

const CONSENT_KEY = "cinet-analytics-consent"; // "granted" | "denied"
const ID_KEY = "cinet-analytics-id";

/** Solo las propiedades permitidas y con valores simples y cortos. */
export function sanitize(name, props = {}) {
  const allowed = EVENTS[name];
  if (!allowed) return null;
  const clean = {};
  for (const key of allowed) {
    const value = props[key];
    if (typeof value === "boolean" || (typeof value === "number" && Number.isFinite(value))) clean[key] = value;
    else if (typeof value === "string" && value.length <= 40) clean[key] = value;
  }
  return clean;
}

export function createAnalytics({ endpoint, storage, send, now = () => new Date().toISOString(), randomId = () => crypto.randomUUID() }) {
  const getConsent = () => storage.read(CONSENT_KEY, null);
  return {
    enabled: Boolean(endpoint),
    getConsent,
    setConsent(choice) {
      storage.write(CONSENT_KEY, choice === "granted" ? "granted" : "denied");
      if (choice !== "granted") storage.write(ID_KEY, null);
    },
    /** true si el evento se envió. */
    track(name, props) {
      const clean = sanitize(name, props);
      if (!clean || !endpoint || getConsent() !== "granted") return false;
      let id = storage.read(ID_KEY, null);
      if (!id) {
        id = randomId();
        storage.write(ID_KEY, id);
      }
      send(endpoint, { event: name, props: clean, anonymous_id: id, at: now() });
      return true;
    },
  };
}

function beacon(endpoint, payload) {
  const body = JSON.stringify(payload);
  try {
    if (navigator.sendBeacon?.(endpoint, new Blob([body], { type: "application/json" }))) return;
    fetch(endpoint, { method: "POST", body, headers: { "content-type": "application/json" }, keepalive: true }).catch(() => {});
  } catch {
    /* la medición nunca rompe la app */
  }
}

const analytics = createAnalytics({
  endpoint: clientEnv.ANALYTICS_ENDPOINT,
  storage: { read: readStorage, write: writeStorage },
  send: beacon,
});

export const track = (name, props) => analytics.track(name, props);
export const analyticsEnabled = analytics.enabled;
export const getAnalyticsConsent = analytics.getConsent;
export const setAnalyticsConsent = analytics.setConsent;
