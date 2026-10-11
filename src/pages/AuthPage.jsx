import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import AuthForm from "../components/auth/AuthForm.jsx";
import PasswordField from "../components/auth/PasswordField.jsx";
import BrandLogo from "../components/common/BrandLogo.jsx";
import Toast from "../components/common/Toast.jsx";
import { useAuth } from "../hooks/useAuth.js";
import { useDocumentTitle } from "../hooks/useDocumentTitle.js";
import { usePrefersReducedMotion } from "../hooks/usePrefersReducedMotion.js";
import { useToast } from "../hooks/useToast.js";
import { clearPendingNext, pendingNext, rememberNext, safeNext } from "../utils/authRedirect.js";
import { hasErrors, validateEmail, validateNewPassword } from "../utils/validation.js";

const SPLASH_KEY = "cinet-splash-seen"; // la bienvenida se ve una vez por sesión del navegador
const EASE = "cubic-bezier(0.2, 0.7, 0.2, 1)";
const TABS = [
  ["login", "Iniciar sesión"],
  ["register", "Crear cuenta"],
];
const TITLES = { login: "Iniciar sesión", register: "Crear cuenta", forgot: "Recuperar contraseña", reset: "Nueva contraseña" };

function splashSeen() {
  try {
    return sessionStorage.getItem(SPLASH_KEY) === "1";
  } catch {
    return false;
  }
}

function markSplashSeen() {
  try {
    sessionStorage.setItem(SPLASH_KEY, "1");
  } catch {
    /* sin almacenamiento: la bienvenida volverá a verse, nada más */
  }
}

/**
 * Entrada de la app: bienvenida animada (/, una vez por sesión) → autenticación integrada.
 * Con sesión válida va directo al contenido (o al destino pendiente: invitación, plan…) sin pedir acceso.
 * /login, /register, /recuperar y /nueva-contrasena abren la misma pantalla en su vista.
 */
export default function AuthPage({ view = "entry" }) {
  const { user, loading, restoreError, retryRestore, accountsAvailable } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const reducedMotion = usePrefersReducedMotion();
  const from = safeNext(location.state?.from);

  const [splash] = useState(() => view === "entry" && !splashSeen());
  const [splashDone, setSplashDone] = useState(false);
  const [tab, setTab] = useState(view === "register" ? "register" : "login");
  const [confirmEmail, setConfirmEmail] = useState("");
  const brand = useRef(null);
  const brandFrom = useRef(null);
  const heading = useRef(null);
  const panel = useRef(null);
  const panelFrom = useRef(0);
  const tabButtons = useRef({});

  // Un invitado (sesión anónima) puede abrir /login para entrar con una cuenta real.
  const leaving = !loading && Boolean(user) && view !== "reset" && !(user.guest && view !== "entry");
  // La bienvenida termina cuando acabó (o se omitió) la animación y se sabe que no hay sesión.
  // Mientras Supabase restaura la sesión solo se ve la marca: ni formulario ni contenido privado.
  const animating = splash && !splashDone;
  const inAuth = !animating && (!loading || view === "reset");
  const formView = view === "forgot" || view === "reset" ? view : tab;
  useDocumentTitle(inAuth ? TITLES[formView] : null);

  useEffect(() => {
    if (!leaving) return;
    const target = from ?? pendingNext() ?? "/home";
    clearPendingNext();
    navigate(target, { replace: true });
  }, [leaving, from, navigate]);

  const endSplash = () => {
    brandFrom.current = brand.current?.getBoundingClientRect() ?? null;
    setSplashDone(true);
  };

  // Secuencia breve y finita; no espera nada real (la sesión se decide aparte).
  useEffect(() => {
    if (!splash || splashDone) return undefined;
    const timer = setTimeout(() => {
      brandFrom.current = brand.current?.getBoundingClientRect() ?? null;
      setSplashDone(true);
    }, reducedMotion ? 700 : 1900);
    return () => clearTimeout(timer);
  }, [splash, splashDone, reducedMotion]);

  // Transición conectada: el logo viaja de su posición centrada a la cabecera (FLIP, solo transform).
  useLayoutEffect(() => {
    if (!splash || !inAuth) return;
    markSplashSeen();
    const first = brandFrom.current;
    brandFrom.current = null;
    if (!document.activeElement || document.activeElement === document.body) heading.current?.focus({ preventScroll: true });
    const last = brand.current?.getBoundingClientRect();
    if (!first || !last?.width || reducedMotion) return;
    const dx = first.left + first.width / 2 - (last.left + last.width / 2);
    const dy = first.top + first.height / 2 - (last.top + last.height / 2);
    brand.current.animate([{ transform: `translate(${dx}px, ${dy}px) scale(${first.width / last.width})` }, { transform: "none" }], { duration: 560, easing: EASE });
  }, [splash, inAuth, reducedMotion]);

  // Cambio de pestaña sin salto brusco de alto.
  useLayoutEffect(() => {
    const element = panel.current;
    const fromHeight = panelFrom.current;
    panelFrom.current = 0;
    if (!element || !fromHeight || reducedMotion) return;
    const toHeight = element.offsetHeight;
    if (fromHeight !== toHeight) {
      element.animate([{ height: `${fromHeight}px`, overflow: "hidden" }, { height: `${toHeight}px`, overflow: "hidden" }], { duration: 240, easing: EASE });
    }
  }, [tab, reducedMotion]);

  const switchTab = (next, { focus = false } = {}) => {
    if (next === tab) return;
    panelFrom.current = panel.current?.offsetHeight ?? 0;
    setTab(next);
    if (focus) tabButtons.current[next]?.focus();
  };

  const onTabKey = (event) => {
    const keys = { ArrowRight: 1, ArrowLeft: -1, Home: "first", End: "last" };
    if (!(event.key in keys)) return;
    event.preventDefault();
    const index = TABS.findIndex(([value]) => value === tab);
    const move = keys[event.key];
    const nextIndex = move === "first" ? 0 : move === "last" ? TABS.length - 1 : (index + move + TABS.length) % TABS.length;
    switchTab(TABS[nextIndex][0], { focus: true });
  };

  const handleSuccess = (result) => {
    if (result?.needsConfirmation) {
      // Registrarse no inicia sesión hasta confirmar: se guarda el destino para cuando vuelva del correo.
      rememberNext(from);
      setConfirmEmail(result.user.email);
      switchTab("login");
      return;
    }
    showToast(tab === "register" ? "✅ Cuenta creada" : `👋 Hola de nuevo, ${result.name}`);
    // La navegación la hace el efecto de arriba en cuanto Supabase confirma la sesión.
  };

  if (leaving) return null; // nunca se pinta nada mientras se sale hacia el contenido

  const tabIndex = TABS.findIndex(([value]) => value === tab);

  return (
    <main className={`auth-screen ${inAuth ? "is-auth" : "is-splash"}`} data-intro={splash ? "on" : "off"}>
      <div className="auth-light" aria-hidden="true" />

      <div className="auth-brand" ref={brand}>
        <BrandLogo stacked />
      </div>

      {!inAuth ? (
        <section className="auth-splash" aria-labelledby="auth-splash-title">
          <h1 id="auth-splash-title" className="visually-hidden">CINET</h1>
          <p className="auth-tagline">Buenas historias. Mejores planes.</p>
          {!animating && (
            <p className="auth-status" role="status">
              {restoreError || "Comprobando tu sesión…"}
            </p>
          )}
          {restoreError && (
            <button type="button" className="btn btn-secondary auth-retry" onClick={retryRestore}>Reintentar</button>
          )}
          {animating && (
            <button type="button" className="auth-skip" onClick={endSplash}>Omitir</button>
          )}
        </section>
      ) : (
        <section className="auth-card" aria-labelledby="auth-title">
          {view === "forgot" ? (
            <ForgotView headingRef={heading} from={from} />
          ) : view === "reset" ? (
            <ResetView headingRef={heading} />
          ) : (
            <>
              <header className="auth-intro">
                <h1 id="auth-title" ref={heading} tabIndex={-1}>Qué bueno verte.</h1>
                <p>Tu próxima noche empieza aquí.</p>
              </header>

              {!accountsAvailable && (
                <p className="auth-notice auth-notice--warn" role="status">
                  Las cuentas no están disponibles ahora mismo. Puedes <Link to="/home">explorar el catálogo sin cuenta</Link>.
                </p>
              )}
              {restoreError && (
                <div className="auth-notice auth-notice--warn" role="alert">
                  <p>{restoreError}</p>
                  <button type="button" className="btn btn-secondary" onClick={retryRestore}>Reintentar</button>
                </div>
              )}
              {confirmEmail ? (
                <p className="auth-notice" role="status">
                  📩 Te enviamos un correo a <strong>{confirmEmail}</strong>. Abre el enlace para confirmar tu cuenta: hasta entonces no hay sesión iniciada.
                  {from ? " Después volverás a donde estabas." : " Después podrás entrar aquí."}
                </p>
              ) : (
                from && (
                  <p className="auth-notice" role="status">
                    🔒 Inicia sesión o crea una cuenta para continuar; después volverás a donde estabas.
                  </p>
                )
              )}

              <div className="auth-tabs" role="tablist" aria-label="Tipo de acceso" onKeyDown={onTabKey} style={{ "--tab-index": tabIndex }}>
                {TABS.map(([value, label]) => (
                  <button
                    key={value}
                    ref={(element) => {
                      tabButtons.current[value] = element;
                    }}
                    id={`auth-tab-${value}`}
                    type="button"
                    role="tab"
                    aria-selected={tab === value}
                    aria-controls="auth-tabpanel"
                    tabIndex={tab === value ? 0 : -1}
                    onClick={() => switchTab(value)}
                  >
                    {label}
                  </button>
                ))}
                <span className="auth-tab-indicator" aria-hidden="true" />
              </div>

              <div id="auth-tabpanel" ref={panel} className="auth-tabpanel" role="tabpanel" aria-labelledby={`auth-tab-${tab}`}>
                <AuthForm key={tab} mode={tab} initialEmail={confirmEmail} onSuccess={handleSuccess} forgotState={{ from }} />
              </div>
            </>
          )}

          <footer className="auth-footer">
            <Link to="/home" className="auth-explore">Explorar sin cuenta →</Link>
            <p>
              Lee los <Link to="/legal/terminos">Términos del servicio</Link> y la <Link to="/legal/privacidad">Política de privacidad</Link> (borradores
              en revisión) en <Link to="/legal">Legal y privacidad</Link>.
            </p>
          </footer>
        </section>
      )}
      <Toast />
    </main>
  );
}

/** Pedir el enlace de recuperación. El resultado mostrado es la respuesta real de Supabase. */
function ForgotView({ headingRef, from }) {
  const { requestPasswordReset } = useAuth();
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [state, setState] = useState({ busy: false, error: "", sentTo: "" });
  const input = useRef(null);
  const error = submitted ? validateEmail(email) : "";

  const submit = async (event) => {
    event.preventDefault();
    if (state.busy) return;
    setSubmitted(true);
    if (validateEmail(email)) {
      input.current?.focus();
      return;
    }
    setState({ busy: true, error: "", sentTo: "" });
    try {
      await requestPasswordReset(email);
      setState({ busy: false, error: "", sentTo: email.trim() });
    } catch (requestError) {
      setState({ busy: false, error: requestError.message, sentTo: "" });
    }
  };

  return (
    <>
      <header className="auth-intro">
        <h1 id="auth-title" ref={headingRef} tabIndex={-1}>Recupera tu acceso.</h1>
        <p>Te enviaremos un enlace para crear una contraseña nueva.</p>
      </header>
      <form className="auth-form" noValidate aria-busy={state.busy} onSubmit={submit}>
        <div className="auth-field">
          <label htmlFor="reset-email">Correo electrónico</label>
          <input
            ref={input}
            id="reset-email"
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            spellCheck="false"
            placeholder="correo@ejemplo.com"
            value={email}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? "reset-email-error" : undefined}
            onChange={(event) => setEmail(event.target.value)}
          />
          {error && <p id="reset-email-error" className="field-error">{error}</p>}
        </div>
        {state.error && <p className="form-error" role="alert">{state.error}</p>}
        {state.sentTo && (
          <p className="auth-notice" role="status">
            📩 Si existe una cuenta con <strong>{state.sentTo}</strong>, te llegará un enlace en unos minutos. Revisa también la carpeta de spam.
          </p>
        )}
        <button type="submit" className="btn btn-primary auth-submit" disabled={state.busy}>
          {state.busy && <span className="auth-spinner" aria-hidden="true" />}
          {state.busy ? "Enviando…" : state.sentTo ? "Enviar de nuevo" : "Enviar enlace"}
        </button>
      </form>
      <Link className="auth-back" to="/login" state={{ from }}>← Volver a iniciar sesión</Link>
    </>
  );
}

/** Nueva contraseña: la abre el enlace del correo, que trae una sesión de recuperación. */
function ResetView({ headingRef }) {
  const { user, loading, updatePassword } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();
  // Supabase devuelve los fallos del enlace en el fragmento (#error_description=…).
  const [linkError] = useState(() => new URLSearchParams(window.location.hash.slice(1)).get("error_description"));
  const [values, setValues] = useState({ password: "", confirm: "" });
  const [submitted, setSubmitted] = useState(false);
  const [state, setState] = useState({ busy: false, error: "" });
  const errors = validateNewPassword(values.password, values.confirm);

  const submit = async (event) => {
    event.preventDefault();
    if (state.busy) return;
    setSubmitted(true);
    if (hasErrors(errors)) {
      event.currentTarget.elements.namedItem(errors.password ? "new-password" : "new-password-confirm")?.focus();
      return;
    }
    setState({ busy: true, error: "" });
    try {
      await updatePassword(values.password);
      showToast("🔐 Contraseña actualizada");
      const target = pendingNext() ?? "/home";
      clearPendingNext();
      navigate(target, { replace: true });
    } catch (updateError) {
      setState({ busy: false, error: updateError.message });
    }
  };

  const title = (
    <header className="auth-intro">
      <h1 id="auth-title" ref={headingRef} tabIndex={-1}>Crea una contraseña nueva.</h1>
      <p>Úsala la próxima vez que entres a CINET.</p>
    </header>
  );

  if (loading) {
    return (
      <>
        {title}
        <p className="auth-status" role="status">Comprobando el enlace…</p>
      </>
    );
  }

  if (!user) {
    return (
      <>
        {title}
        <div className="auth-notice auth-notice--warn" role="alert">
          <p>El enlace no es válido o ya caducó{linkError ? ` (${linkError})` : ""}. Pide uno nuevo para continuar.</p>
        </div>
        <Link className="btn btn-primary auth-submit" to="/recuperar">Pedir otro enlace</Link>
        <Link className="auth-back" to="/login">← Volver a iniciar sesión</Link>
      </>
    );
  }

  return (
    <>
      {title}
      <form className="auth-form" noValidate aria-busy={state.busy} onSubmit={submit}>
        {/* Ayuda a los gestores de contraseñas a asociar la nueva con la cuenta. */}
        <input type="email" name="email" autoComplete="username" value={user.email ?? ""} readOnly hidden />
        <PasswordField
          id="new-password"
          label="Nueva contraseña"
          autoComplete="new-password"
          value={values.password}
          onChange={(password) => setValues((current) => ({ ...current, password }))}
          error={submitted ? errors.password : ""}
          hint={values.password.length >= 8 ? "✓ Tiene al menos 8 caracteres." : "Mínimo 8 caracteres."}
        />
        <PasswordField
          id="new-password-confirm"
          label="Confirma la contraseña"
          autoComplete="new-password"
          value={values.confirm}
          onChange={(confirm) => setValues((current) => ({ ...current, confirm }))}
          error={submitted ? errors.confirm : ""}
        />
        {state.error && <p className="form-error" role="alert">{state.error}</p>}
        <button type="submit" className="btn btn-primary auth-submit" disabled={state.busy}>
          {state.busy && <span className="auth-spinner" aria-hidden="true" />}
          {state.busy ? "Guardando…" : "Guardar contraseña"}
        </button>
      </form>
    </>
  );
}
