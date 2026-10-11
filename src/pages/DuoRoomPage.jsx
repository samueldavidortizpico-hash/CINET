import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import qrcode from "qrcode-generator";
import Button from "../components/common/Button.jsx";
import EmptyState from "../components/common/EmptyState.jsx";
import Loading from "../components/common/Loading.jsx";
import PosterImage from "../components/common/PosterImage.jsx";
import { Chip } from "../components/duo/DuoFields.jsx";
import { SeatAvatar } from "../components/duo/DuoSeats.jsx";
import TasteFields from "../components/duo/TasteFields.jsx";
import { useAccountPreferences } from "../hooks/useAccountPreferences.js";
import { useAuth } from "../hooks/useAuth.js";
import { useDocumentTitle } from "../hooks/useDocumentTitle.js";
import { useShare } from "../hooks/useShare.js";
import { track } from "../services/analytics.js";
import { getDuoCandidates } from "../services/duoService.js";
import { describeResult, ROOM_VOTES, roomSession, roundProgress, toDeck } from "../services/duoRoom.js";
import { buildProfile, rankTitles } from "../services/recommender.js";
import * as repo from "../services/roomRepository.js";
import { appUrl } from "../utils/share.js";

const STATUS_TEXT = {
  lobby: "Marcando gustos",
  voting: "Votando",
  revealed: "Resultado",
  chosen: "Título elegido",
  closed: "Sala cerrada",
};

function Shell({ children }) {
  return (
    <div className="duo-page room-page">
      <div className="duo-container">
        <Link to="/duo" className="back-link">← Duo en un solo teléfono</Link>
        {children}
      </div>
    </div>
  );
}

/** QR dibujado con React (sin innerHTML): módulos oscuros en un solo path. */
function QrCode({ text, label }) {
  const { size, path } = useMemo(() => {
    const qr = qrcode(0, "M");
    qr.addData(text);
    qr.make();
    const count = qr.getModuleCount();
    let d = "";
    for (let row = 0; row < count; row++) for (let col = 0; col < count; col++) if (qr.isDark(row, col)) d += `M${col} ${row}h1v1h-1z`;
    return { size: count, path: d };
  }, [text]);
  return (
    <svg className="room-qr" viewBox={`-2 -2 ${size + 4} ${size + 4}`} role="img" aria-label={label} shapeRendering="crispEdges">
      <rect x="-2" y="-2" width={size + 4} height={size + 4} fill="#fff" />
      <path d={path} fill="#000" />
    </svg>
  );
}

/** /duo/sala — abrir una sala (cuenta permanente) o entrar con un código. */
function RoomStart({ user }) {
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [mode, setMode] = useState("movie");
  const [state, setState] = useState({ busy: false, error: "" });

  const open = async () => {
    setState({ busy: true, error: "" });
    try {
      const room = await repo.createRoom({ displayName: user.name, mode });
      navigate(`/duo/sala/${room.code}`);
    } catch (error) {
      setState({ busy: false, error: error.message });
    }
  };

  return (
    <Shell>
      <header className="room-intro">
        <span className="duo-badge">CINET <b>DUO</b> · SALA</span>
        <h1>Cada quien vota desde su celular</h1>
        <p className="duo-lead">Abre una sala, compartan el código o el QR y elijan juntos sin pasarse el teléfono. Nadie ve lo que votan los demás hasta el resultado.</p>
      </header>

      <div className="room-start">
        <form className="room-card" onSubmit={(event) => { event.preventDefault(); navigate(`/duo/sala/${repo.normalizeCode(code)}`); }}>
          <h2>Tengo un código</h2>
          <label className="duo-field">
            <span>Código de la sala</span>
            <input className="room-code-input" value={code} onChange={(event) => setCode(event.target.value)} maxLength={9} autoComplete="off" autoCapitalize="characters" placeholder="ABC234" required />
          </label>
          <Button variant="primary" type="submit" disabled={repo.normalizeCode(code).length !== 6}>Entrar a la sala</Button>
        </form>

        <section className="room-card">
          <h2>Abrir una sala</h2>
          {!user ? (
            <>
              <p>Para abrir una sala necesitas una cuenta. Para unirte basta el código.</p>
              <div className="plan-actions">
                <Button variant="primary" to="/login" state={{ from: "/duo/sala" }}>Iniciar sesión</Button>
                <Button variant="secondary" to="/register" state={{ from: "/duo/sala" }}>Crear cuenta</Button>
              </div>
            </>
          ) : user.guest ? (
            <p>Como invitado puedes unirte a salas, pero no abrirlas. Crea una cuenta para organizar.</p>
          ) : (
            <>
              <div className="duo-chips" role="radiogroup" aria-label="Qué van a ver">
                <Chip type="radio" name="room-mode" checked={mode === "movie"} onChange={() => setMode("movie")}>🎬 Película</Chip>
                <Chip type="radio" name="room-mode" checked={mode === "tv"} onChange={() => setMode("tv")}>📺 Serie</Chip>
              </div>
              {state.error && <p className="error-message" role="alert">{state.error}</p>}
              <Button variant="primary" disabled={state.busy} onClick={open}>{state.busy ? "Abriendo…" : "Abrir sala"}</Button>
              <p className="duo-fineprint">Hasta 8 personas. La sala caduca en 24 horas.</p>
            </>
          )}
        </section>
      </div>
    </Shell>
  );
}

/** Con código pero sin sesión: iniciar sesión, crear cuenta o entrar como invitado (si está habilitado). */
function RoomSignIn({ code, continueAsGuest }) {
  const [name, setName] = useState("");
  const [state, setState] = useState({ busy: false, error: "" });
  const from = { from: `/duo/sala/${code}` };

  const guest = async (event) => {
    event.preventDefault();
    setState({ busy: true, error: "" });
    try {
      await continueAsGuest(name); // la sesión nueva vuelve a pintar la página
    } catch (error) {
      setState({ busy: false, error: error.message });
    }
  };

  return (
    <Shell>
      <section className="room-card room-signin">
        <span className="duo-badge">SALA {code}</span>
        <h1>Te invitaron a elegir qué ver</h1>
        <p>Entra con tu cuenta o como invitado. Tu voto queda a tu nombre: nadie puede votar por ti.</p>
        <div className="plan-actions">
          <Button variant="primary" to="/login" state={from}>Iniciar sesión</Button>
          <Button variant="secondary" to="/register" state={from}>Crear cuenta</Button>
        </div>
        <form className="invite-form" onSubmit={guest}>
          <label className="duo-field">
            <span>O entra como invitado con tu nombre</span>
            <input value={name} onChange={(event) => setName(event.target.value)} maxLength={40} required />
          </label>
          {state.error && <p className="error-message" role="alert">{state.error}</p>}
          <Button variant="secondary" type="submit" disabled={state.busy || !name.trim()}>{state.busy ? "Entrando…" : "Entrar como invitado"}</Button>
          <p className="duo-fineprint">El acceso de invitado vive solo en este navegador: si cierras sesión o borras sus datos, pierdes la sala.</p>
        </form>
      </section>
    </Shell>
  );
}

/** Ya hay sesión: si eres miembro entras directo; si no, eliges tu nombre visible y te unes. */
function RoomGate({ code, user }) {
  const [state, setState] = useState({ step: "checking", roomId: null, error: null });
  const [name, setName] = useState(user.name ?? "");

  useEffect(() => {
    let active = true;
    repo.findMyRoom(code).then(
      (roomId) => active && setState({ step: roomId ? "ready" : "join", roomId, error: null }),
      (error) => active && setState({ step: "join", roomId: null, error })
    );
    return () => {
      active = false;
    };
  }, [code]);

  const join = async (event) => {
    event.preventDefault();
    setState((current) => ({ ...current, step: "joining", error: null }));
    try {
      const roomId = await repo.joinRoom(code, name);
      track("room_joined");
      setState({ step: "ready", roomId, error: null });
    } catch (error) {
      setState({ step: "join", roomId: null, error });
    }
  };

  if (state.step === "checking") return <Loading label="Buscando la sala" />;
  if (state.step === "ready") return <Room roomId={state.roomId} user={user} />;
  return (
    <Shell>
      <form className="room-card room-signin" onSubmit={join}>
        <span className="duo-badge">SALA {code}</span>
        <h1>Únete a la sala</h1>
        <label className="duo-field">
          <span>Cómo te verán en la sala</span>
          <input value={name} onChange={(event) => setName(event.target.value)} maxLength={40} required />
        </label>
        {state.error && <p className="error-message" role="alert">{state.error.message}</p>}
        <Button variant="primary" type="submit" disabled={state.step === "joining" || !name.trim()}>
          {state.step === "joining" ? "Entrando…" : "Entrar a la sala"}
        </Button>
      </form>
    </Shell>
  );
}

/** Estado de la sala: se lee del servidor; Realtime y volver a la pestaña solo avisan de que hay que releer. */
function useRoomState(roomId) {
  const [state, setState] = useState({ data: undefined, error: null });
  const reload = useCallback(
    () =>
      repo.loadRoom(roomId).then(
        (data) => setState({ data, error: null }),
        (error) => setState((current) => ({ ...current, error }))
      ),
    [roomId]
  );
  useEffect(() => {
    reload();
    const unsubscribe = repo.subscribeRoom(roomId, reload);
    const onVisible = () => document.visibilityState === "visible" && reload();
    window.addEventListener("online", reload);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      unsubscribe();
      window.removeEventListener("online", reload);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [roomId, reload]);
  return { ...state, reload };
}

function RoomPreferences({ room, initial, fromAccount, onSaved }) {
  const [prefs, setPrefs] = useState(() => {
    const start = initial ?? fromAccount;
    return { genres: start?.genres ?? [], rejectedGenres: start?.rejectedGenres ?? [], maxRuntime: start?.maxRuntime ?? 0 };
  });
  const [state, setState] = useState({ busy: false, error: "" });

  const save = async (event) => {
    event.preventDefault();
    setState({ busy: true, error: "" });
    try {
      await repo.savePreferences(room.id, { genres: prefs.genres, mustGenres: [], rejectedGenres: prefs.rejectedGenres, maxRuntime: prefs.maxRuntime });
      setState({ busy: false, error: "" });
      onSaved();
    } catch (error) {
      setState({ busy: false, error: error.message });
    }
  };

  return (
    <form className="room-card room-prefs" onSubmit={save}>
      <h2>Tus gustos para esta sala</h2>
      <p className="duo-fineprint">🔒 Solo tú ves lo que marcas. Para armar la baraja, quien abrió la sala recibe los gustos de todos sin nombres.</p>
      {!initial && fromAccount && <p className="duo-fineprint">Partimos de los gustos guardados en tu cuenta. Cámbialos para esta sala si quieres.</p>}
      <TasteFields value={prefs} onChange={setPrefs} showRuntime={room.mode === "movie"} />
      {state.error && <p className="error-message" role="alert">{state.error}</p>}
      <Button variant="primary" type="submit" disabled={state.busy}>{state.busy ? "Guardando…" : initial ? "Actualizar mis gustos" : "Listo, guardar mis gustos"}</Button>
    </form>
  );
}

function DeckCard({ title, children }) {
  return (
    <article className="room-title">
      <PosterImage src={title.image} alt={`Póster de ${title.title}`} />
      <div>
        <h3>{title.title}</h3>
        {title.year && <p>{title.year} · {title.type === "tv" ? "Serie" : "Película"}</p>}
      </div>
      {children /* debajo, a todo el ancho: en 390 px los tres botones caben sin partirse */}
    </article>
  );
}

function Room({ roomId, user }) {
  const navigate = useNavigate();
  const share = useShare();
  const { data, error, reload } = useRoomState(roomId);
  const account = useAccountPreferences();
  const [busy, setBusy] = useState("");
  const [notice, setNotice] = useState("");
  const [editingPrefs, setEditingPrefs] = useState(false);
  const [bigScreen, setBigScreen] = useState(false);

  if (data === undefined && !error) return <Loading label="Abriendo la sala" />;
  if (!data) {
    return (
      <Shell>
        <EmptyState heading="h1" icon="🚪" title={error ? "No pudimos cargar la sala" : "Ya no estás en esta sala"} action={<Button variant="primary" to="/duo/sala">Volver</Button>}>
          {error ? error.message : "Saliste o quien la abrió te retiró. Pide el código otra vez si quieres volver."}
        </EmptyState>
      </Shell>
    );
  }

  const { room, members, round, myVotes, myPrefs } = data;
  const isHost = room.host_id === user.id;
  const host = members.find((member) => member.role === "host");
  const expired = new Date(room.expires_at) <= new Date();
  const status = expired ? "closed" : room.status;
  const link = appUrl(`duo/sala/${room.code}`);
  const progress = roundProgress(round, members);
  const participant = round?.status === "open" && round.participants.includes(user.id);
  const result = round?.status === "closed" ? describeResult(round.result, round.candidates) : null;
  const ready = members.filter((member) => member.ready).length;

  const run = async (label, action) => {
    setBusy(label);
    setNotice("");
    try {
      await action();
      await reload();
    } catch (actionError) {
      setNotice(actionError.message);
    } finally {
      setBusy("");
    }
  };

  const startRound = () =>
    run("deck", async () => {
      const prefs = await repo.deckPreferences(room.id);
      const profile = buildProfile(roomSession(room, prefs));
      const candidates = await getDuoCandidates(profile);
      const deck = toDeck(rankTitles(candidates.titles, profile).items);
      if (deck.length < 2) throw new Error("Con estos gustos no salen suficientes títulos. Aflojen algún «evitar» o la duración.");
      await repo.startRound(room.id, deck);
      track("round_started", { group_size: members.length, candidates: deck.length });
    });

  const vote = (candidateId, value) =>
    run(`vote-${candidateId}`, async () => {
      const outcome = await repo.castVote(round.id, candidateId, value);
      if (outcome === "closed") track("round_completed", { group_size: round.participants.length });
    });

  const closeRound = () => {
    const missing = progress.filter((item) => item.done < item.total).length;
    if (missing && !window.confirm(`Faltan ${missing} ${missing === 1 ? "persona" : "personas"} por terminar. ¿Cerrar con los votos que hay?`)) return;
    run("close", async () => {
      const closed = await repo.closeRound(round.id);
      track("round_completed", { group_size: round.participants.length, result: closed.outcome });
    });
  };

  const choose = (candidateId) =>
    run("choose", async () => {
      await repo.chooseTitle(room.id, candidateId);
      track("title_chosen", { group_size: members.length, source: "round" });
    });

  const leave = () => {
    if (!window.confirm("¿Salir de la sala? Tus votos de la ronda abierta se borran.")) return;
    run("leave", async () => {
      await repo.leaveRoom(room.id);
      navigate("/duo/sala", { replace: true });
    });
  };

  const closeRoom = () => {
    if (!window.confirm("¿Cerrar la sala para todas las personas?")) return;
    run("close-room", () => repo.closeRoom(room.id));
  };

  const removeMember = (member) => {
    if (!window.confirm(`¿Retirar a ${member.display_name} de la sala?`)) return;
    run(`remove-${member.user_id}`, () => repo.removeMember(room.id, member.user_id));
  };

  const showPrefs = status !== "closed" && status !== "voting" && (!myPrefs || editingPrefs);

  return (
    <Shell>
      <header className="room-header">
        <div>
          <span className="duo-badge">CINET <b>DUO</b> · SALA</span>
          <h1>Sala {room.code}</h1>
          <p className="room-status" role="status" aria-live="polite">
            {STATUS_TEXT[status]}{round ? ` · ronda ${round.number}` : ""} · {room.mode === "tv" ? "serie" : "película"}
          </p>
        </div>
        <ul className="room-members" aria-label="Personas en la sala">
          {members.map((member) => (
            <li key={member.user_id}>
              <SeatAvatar index={member.seat - 1} name={member.display_name} />
              <span>
                {member.display_name}
                {member.user_id === user.id ? " (tú)" : ""}
                <small>{member.role === "host" ? "Abrió la sala" : member.ready ? "Gustos listos" : "Marcando gustos"}</small>
              </span>
              {isHost && member.role !== "host" && status !== "closed" && (
                <button type="button" className="duo-link" disabled={Boolean(busy)} onClick={() => removeMember(member)} aria-label={`Retirar a ${member.display_name}`}>
                  Retirar
                </button>
              )}
            </li>
          ))}
        </ul>
      </header>

      {notice && <p className="duo-notice" role="alert">{notice}</p>}

      {status !== "closed" && (
        <section className={`room-card room-invite${bigScreen ? " is-big" : ""}`} aria-label="Invitar a la sala">
          <QrCode text={link} label={`Código QR para entrar a la sala ${room.code}`} />
          <div>
            <p className="room-code" aria-label={`Código ${room.code.split("").join(" ")}`}>{room.code}</p>
            <p>{members.length} de 8 personas · caduca {new Date(room.expires_at).toLocaleString("es-CO", { weekday: "long", hour: "2-digit", minute: "2-digit" })}</p>
            <div className="plan-actions">
              <Button variant="secondary" onClick={() => share({ title: "Sala de CINET Duo", text: `Entra a la sala ${room.code} para elegir qué ver`, url: link })}>🔗 Compartir enlace</Button>
              <Button variant="secondary" aria-pressed={bigScreen} onClick={() => setBigScreen((value) => !value)}>{bigScreen ? "Vista normal" : "📺 Pantalla grande"}</Button>
            </div>
          </div>
        </section>
      )}

      {status === "voting" && round && (
        <section className="room-card room-round" aria-labelledby="room-round-title">
          <h2 id="room-round-title">Ronda {round.number}: voten en privado</h2>
          <ul className="room-progress" aria-label="Progreso">
            {progress.map((item) => (
              <li key={item.userId}>
                <SeatAvatar index={item.seat - 1} name={item.name} />
                <span>{item.name}</span>
                <progress max={item.total} value={item.done} aria-label={`${item.name}: ${item.done} de ${item.total}`} />
                <small>{item.done === item.total ? "Listo" : `${item.done}/${item.total}`}</small>
              </li>
            ))}
          </ul>
          {participant && <p className="plan-note">Tienes un 🚫 veto por ronda: ese título no podrá ganar. Nadie sabrá quién vetó.</p>}
          {participant ? (
            <div className="room-deck">
              {round.candidates.map((title) => (
                <DeckCard key={title.id} title={title}>
                  <div className="room-votes" role="group" aria-label={`Tu voto para ${title.title}`}>
                    {ROOM_VOTES.map((option) => (
                      <button key={option.key} type="button" aria-pressed={myVotes[title.id] === option.key} disabled={Boolean(busy)} onClick={() => vote(title.id, option.key)}>
                        <span aria-hidden="true">{option.icon}</span> {option.label}
                      </button>
                    ))}
                  </div>
                </DeckCard>
              ))}
            </div>
          ) : (
            <p className="plan-note">Entraste con la ronda empezada: votas en la siguiente.</p>
          )}
          {isHost && (
            <Button variant="secondary" disabled={Boolean(busy)} onClick={closeRound}>{busy === "close" ? "Cerrando…" : "Cerrar ronda ahora"}</Button>
          )}
        </section>
      )}

      {result && status !== "voting" && (
        <section className={`room-card room-result is-${result.outcome}`} aria-labelledby="room-result-title">
          <h2 id="room-result-title">{result.text}</h2>
          {room.chosen && status === "chosen" && (
            <DeckCard title={room.chosen}>
              <p><strong>Van a ver esta.</strong></p>
              <div className="plan-actions">
                {room.chosen.type !== "tv" && <Button variant="primary" to={`/functions?movie=${room.chosen.id}`}>🎟️ Planear salida al cine</Button>}
                <Button variant={room.chosen.type === "tv" ? "primary" : "secondary"} to={`/functions?movie=${room.chosen.id}&mode=home`}>🏠 Plan en casa</Button>
                <Button variant="secondary" to={`/movie/${room.chosen.id}`}>Ver ficha</Button>
              </div>
            </DeckCard>
          )}
          <ol className="room-tallies" aria-label="Conteo de votos">
            {result.tallies.map((tally) => (
              <li key={tally.id} className={tally.id === result.winner?.id ? "is-winner" : undefined}>
                <span>{tally.title?.title ?? tally.id}</span>
                <span className="room-tally-counts">❤️ {tally.yes} · 🤔 {tally.maybe} · ❌ {tally.no}{tally.vetoed ? " · 🚫 vetado" : ""}</span>
                {isHost && status !== "closed" && !tally.vetoed && room.chosen?.id !== tally.id && (
                  <button type="button" className="duo-link" disabled={Boolean(busy)} onClick={() => choose(tally.id)}>Elegir esta</button>
                )}
              </li>
            ))}
          </ol>
          {!isHost && status === "revealed" && <p className="plan-note">{host?.display_name ?? "Quien abrió la sala"} elige el título final.</p>}
        </section>
      )}

      {/* Después del resultado (si lo hay): gustos y, para el anfitrión, la siguiente ronda. */}
      {showPrefs && !account.loading && (
        <RoomPreferences room={room} initial={myPrefs} fromAccount={account.prefs} onSaved={() => { setEditingPrefs(false); reload(); }} />
      )}
      {!showPrefs && myPrefs && status !== "closed" && status !== "voting" && (
        <p className="plan-note">✅ Tus gustos están guardados. <button type="button" className="duo-link" onClick={() => setEditingPrefs(true)}>Cambiarlos</button></p>
      )}

      {isHost && ["lobby", "revealed", "chosen"].includes(status) && (
        <section className="room-card">
          <h2>{round ? "¿Otra ronda?" : "Cuando estén listas, armen la baraja"}</h2>
          <p>
            {ready} de {members.length} con gustos listos. La baraja usa los gustos de quienes estén listos; quien entre después vota en la siguiente ronda.
            {members.length === 2 ? " En una sala de 2, al armar la baraja se deduce qué marcó la otra persona." : ""}
          </p>
          <Button variant="primary" disabled={Boolean(busy) || ready === 0} onClick={startRound}>
            {busy === "deck" ? "Armando la baraja…" : "Armar baraja y votar"}
          </Button>
        </section>
      )}
      {!isHost && status === "lobby" && <p className="plan-note">Esperando a que {host?.display_name ?? "quien abrió la sala"} arme la baraja.</p>}

      {status === "closed" && <p className="plan-mode-notice is-cancelled" role="status">La sala está cerrada{expired ? " (caducó)" : ""}.</p>}

      {status !== "closed" && (
        <div className="plan-actions plan-danger-zone">
          {isHost ? (
            <Button variant="secondary" disabled={Boolean(busy)} onClick={closeRoom}>Cerrar sala</Button>
          ) : (
            <Button variant="secondary" disabled={Boolean(busy)} onClick={leave}>Salir de la sala</Button>
          )}
        </div>
      )}
    </Shell>
  );
}

/** /duo/sala y /duo/sala/:code — Duo con cada persona en su teléfono. */
export default function DuoRoomPage() {
  const { code } = useParams();
  const { user, loading, continueAsGuest } = useAuth();
  useDocumentTitle(code ? `Sala ${code}` : "Sala de Duo");

  if (!repo.roomsAvailable()) {
    return (
      <Shell>
        <EmptyState heading="h1" icon="📱" title="Salas de Duo" action={<Button variant="primary" to="/duo">Usar Duo en un teléfono</Button>}>
          Las salas necesitan cuentas, que no están disponibles ahora mismo. Pueden elegir pasándose el teléfono.
        </EmptyState>
      </Shell>
    );
  }
  if (loading) return <Loading label="Cargando" />;
  if (!code) return <RoomStart user={user} />;
  if (!user) return <RoomSignIn code={repo.normalizeCode(code)} continueAsGuest={continueAsGuest} />;
  return <RoomGate key={`${code}:${user.id}`} code={repo.normalizeCode(code)} user={user} />;
}
