import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./styles/index.css";
import "./hooks/useInstallPrompt.js"; // escucha beforeinstallprompt desde el arranque (la oferta llega después de elegir)
import App from "./App.jsx";

// Solo en producción: en desarrollo una caché del service worker escondería los cambios.
if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {}));
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>
);
