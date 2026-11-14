import { useEffect, useRef } from "react";
import { TURNSTILE_SITE_KEY as SITE_KEY } from "./captchaConfig.js";

/* CAPTCHA de Cloudflare Turnstile para registro, acceso, recuperación e invitado (auditoría H-04).
   Solo se activa con VITE_TURNSTILE_SITE_KEY (clave PÚBLICA del sitio) y con el CAPTCHA encendido en
   Supabase Auth > Attack Protection; el secreto vive solo en Supabase. Cada token sirve una vez:
   el formulario cambia `resetKey` tras cada envío para pedir otro. */
let loader = null;
function loadTurnstile() {
  loader ??= new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    script.async = true;
    script.onload = () => resolve(window.turnstile);
    script.onerror = () => {
      loader = null; // permite reintentar al volver a montar
      reject(new Error("turnstile"));
    };
    document.head.append(script);
  });
  return loader;
}

export default function Captcha({ onToken, resetKey = 0 }) {
  const box = useRef(null);
  useEffect(() => {
    if (!SITE_KEY) return undefined;
    let widget;
    let cancelled = false;
    onToken("");
    loadTurnstile()
      .then((turnstile) => {
        if (cancelled || !box.current) return;
        widget = turnstile.render(box.current, {
          sitekey: SITE_KEY,
          language: "es",
          callback: onToken,
          "expired-callback": () => onToken(""),
          "error-callback": () => onToken(""),
        });
      })
      .catch(() => onToken(""));
    return () => {
      cancelled = true;
      if (widget !== undefined) window.turnstile?.remove(widget);
    };
  }, [onToken, resetKey]);

  if (!SITE_KEY) return null;
  return <div ref={box} className="auth-captcha" aria-label="Verificación de seguridad" />;
}
