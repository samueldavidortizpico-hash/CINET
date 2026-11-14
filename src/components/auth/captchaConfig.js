import { clientEnv } from "../../utils/env.js";

/** CAPTCHA (Turnstile) activo solo con VITE_TURNSTILE_SITE_KEY. Ver Captcha.jsx. */
export const TURNSTILE_SITE_KEY = clientEnv.TURNSTILE_SITE_KEY;
export const captchaEnabled = Boolean(TURNSTILE_SITE_KEY);
export const CAPTCHA_MISSING = "Completa la verificación de seguridad antes de continuar.";
