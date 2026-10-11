import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import DuoCommonStep from "../components/duo/DuoCommonStep.jsx";
import DuoFinal from "../components/duo/DuoFinal.jsx";
import DuoHistoryDialog from "../components/duo/DuoHistoryDialog.jsx";
import DuoIntro from "../components/duo/DuoIntro.jsx";
import DuoMarathon from "../components/duo/DuoMarathon.jsx";
import DuoModeStep from "../components/duo/DuoModeStep.jsx";
import DuoPersonStep from "../components/duo/DuoPersonStep.jsx";
import DuoProgress from "../components/duo/DuoProgress.jsx";
import DuoResults from "../components/duo/DuoResults.jsx";
import { SeatAvatar } from "../components/duo/DuoSeats.jsx";
import DuoSeenStep from "../components/duo/DuoSeenStep.jsx";
import DuoSummary from "../components/duo/DuoSummary.jsx";
import Icon from "../components/common/Icon.jsx";
import { DEFAULT_DUO_SESSION, DEFAULT_PERSON, DUO_PREFERENCES_KEY, personName, stepsFor } from "../data/duo.js";
import { useAccountPreferences } from "../hooks/useAccountPreferences.js";
import { useAsync } from "../hooks/useAsync.js";
import { useAuth } from "../hooks/useAuth.js";
import { useDocumentTitle } from "../hooks/useDocumentTitle.js";
import { useDuoHistory } from "../hooks/useDuoHistory.js";
import { useDuoSession } from "../hooks/useDuoSession.js";
import { useFavorites } from "../hooks/useFavorites.js";
import { useLocalStorage } from "../hooks/useLocalStorage.js";
import { setLessMotion, useLessMotion } from "../hooks/usePrefersReducedMotion.js";
import { useToast } from "../hooks/useToast.js";
import { getDuoCandidates, groupRejected, setVote } from "../services/duoService.js";
import { EMPTY_TURNS, recordYield, turnCredits, TURNS_KEY } from "../services/fairness.js";
import { track } from "../services/analytics.js";
import { DUO_OCCASIONS, mergeRoundVotes, startOccasion, withAccountTaste } from "../services/duoExperience.js";
import { sessionFromQuery } from "../services/naturalQuery.js";
import { addToHistory } from "../services/historyService.js";
import { getMovieById } from "../services/movieService.js";
import { buildProfile, feedbackFrom, genreName, listEs, rankTitles } from "../services/recommender.js";
import { isStorageAvailable } from "../utils/storage.js";

const NEEDS_CANDIDATES = ["common", "results", "final"];
// Cambiar preferencias invalida resultados, finalistas, ronda, maratón, elección y filtros ampliados (se recalculan).
const FRESH_RESULTS = { board: [], finalists: [], round: null, marathonPlan: null, final: null, relax: DEFAULT_DUO_SESSION.relax };
const RESTART = "¿Empezar una sesión nueva? Se borran las respuestas de esta sesión (el historial se conserva).";

/** Solo lo que cambia la consulta a TMDB: nombres, tono o votos no vuelven a pedir candidatos. */
function candidatesKey(profile, saga) {
  const { type, liked, shared, must, rejected, maxRuntime, seriesStatus, region, providers, actors, relax, people, family } = profile;
  return JSON.stringify([
    family?.level ?? "off",
    type,
    liked,
    shared,
    must,
    rejected,
    maxRuntime,
    seriesStatus,
    region,
    providers,
    actors.map((actor) => actor.id),
    relax.runtime,
    relax.platforms,
    people.map((person) => person.genres),
    saga,
  ]);
}

/** /duo — seis escenas para 1 a 8 personas: preparar → gustos → coincidencias → finalistas → decidir → organizar. */
export default function DuoPage() {
  const { session, hasSession, update, reset } = useDuoSession();
  const { user } = useAuth();
  const account = useAccountPreferences(); // con cuenta, la persona 1 parte de sus gustos guardados
  const { history, change: changeHistory, reset: resetHistory } = useDuoHistory();
  const favorites = useFavorites();
  const [, setSavedPrefs] = useLocalStorage(DUO_PREFERENCES_KEY, null);
  const [turns, setTurns] = useLocalStorage(TURNS_KEY, EMPTY_TURNS); // turnos justos (opcional)
  const lessMotion = useLessMotion();
  const { showToast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const fromId = searchParams.get("from");
  const [intro, setIntro] = useState(!fromId && !hasSession); // con sesión guardada, una recarga retoma el mismo paso
  const [seed, setSeed] = useState(null); // título elegido con "Usar en Duo"
  const [historyOpen, setHistoryOpen] = useState(false);
  const [summaryOpen, setSummaryOpen] = useState(false);
  // Una ronda sin terminar se retoma al recargar (escena «Decidir»).
  const [roundOpen, setRoundOpen] = useState(() => Boolean(session.step === "results" && session.round && session.round.phase !== "results"));
  const [storageOk] = useState(isStorageAvailable);
  const mainRef = useRef(null);
  const [retry, setRetry] = useState(0);
  useDocumentTitle("Duo");

  const size = session.people.length;
  const steps = useMemo(() => stepsFor(size), [size]);
  const profile = useMemo(() => buildProfile(session), [session]);
  const saga = session.mode === "marathon" && session.marathon.scope === "saga";
  const key = !intro && NEEDS_CANDIDATES.includes(session.step) ? `duo-${candidatesKey(profile, saga)}-${retry}` : null;
  // Historial y quitados entran a la búsqueda para no gastar detalle en lo que el ranking final excluye.
  const { data: candidates, error: candidatesError } = useAsync(key, (signal) => getDuoCandidates(profile, { saga, history, removed: session.removed, signal }));
  // Votos de cada persona: el ranking aprende por persona (el "no" de alguien no desaparece por mayoría).
  const feedback = useMemo(() => feedbackFrom(session.votes, candidates?.titles), [session.votes, candidates]);
  const namesKey = session.people.map(personName).join("|");
  const credits = useMemo(() => (turns?.enabled && size > 1 ? turnCredits(turns, namesKey.split("|")) : null), [turns, size, namesKey]);
  const ranked = useMemo(
    () => candidates && rankTitles(candidates.titles, profile, { history, favorites: favorites.favorites, removed: session.removed, feedback, turns: credits }),
    [candidates, profile, history, favorites.favorites, session.removed, feedback, credits]
  );
  const lookup = useMemo(() => new Map((candidates?.titles ?? []).map((title) => [title.id, title])), [candidates]);
  const names = session.people.map(personName);
  const occasion = DUO_OCCASIONS.find((item) => item.id === session.occasion);

  useEffect(() => {
    if (!intro) mainRef.current?.focus({ preventScroll: true });
  }, [session.step, intro]);

  const go = useCallback(
    (step) => {
      update((current) => ({ step, reached: Math.max(current.reached, stepsFor(current.people.length).findIndex((item) => item.key === step)) }));
      setIntro(false);
      setSummaryOpen(false);
      window.scrollTo({ top: 0 });
    },
    [update]
  );
  const changePrefs = useCallback((patch) => update((current) => ({ ...(typeof patch === "function" ? patch(current) : patch), ...FRESH_RESULTS })), [update]);

  /** Cambia cuántas personas ven: conserva las respuestas de quienes siguen y recorta sus votos. */
  const setGroupSize = (count) =>
    changePrefs((current) => {
      const before = current.people.length;
      return {
        people: Array.from({ length: count }, (_, index) => current.people[index] ?? DEFAULT_PERSON),
        votes: Object.fromEntries(Object.entries(current.votes).map(([id, list]) => [id, list.slice(0, count)])),
        reached: Math.min(current.reached, Math.min(before, count)), // los pasos de personas nuevas aún no se visitaron
      };
    });

  // "Usar en Duo" (carrusel del inicio): parte de los géneros y el tipo de ese título.
  useEffect(() => {
    if (!fromId) return undefined;
    let active = true;
    getMovieById(fromId).then((title) => {
      if (!active) return;
      setSearchParams({}, { replace: true });
      if (!title) {
        setIntro(true);
        return;
      }
      const type = title.type === "tv" ? "tv" : "movie";
      setSeed(title);
      update((current) => ({
        ...FRESH_RESULTS,
        mode: current.mode === "marathon" ? "marathon" : type,
        marathon: { ...current.marathon, type },
        people: current.people.map((person) =>
          person.genres.length || person.mustGenres.length ? person : { ...person, genres: title.genreKeys.filter((genre) => !person.rejectedGenres.includes(genre)) }
        ),
        step: "mode",
      }));
    });
    return () => {
      active = false;
    };
  }, [fromId, setSearchParams, update]);

  const vote = (title, person, choice) => {
    const votes = setVote(session.votes, title.id, person, choice);
    update({ votes });
    if (groupRejected(votes[title.id], size)) {
      changeHistory((current) => addToHistory(current, "rejected", [title]));
      showToast(size === 1 ? "❌ Descartada: no volverá a aparecer." : "❌ Rechazada por todos: no volverá a aparecer.");
    }
  };

  /** Ronda cerrada: sus votos pasan al aprendizaje por persona; lo que todos rechazaron sale del historial de recomendables. */
  const completeRound = (roundVotes, rows) => {
    update((current) => ({ votes: mergeRoundVotes(current.votes, roundVotes) }));
    const rejected = rows.filter((row) => row.list.length && row.list.every((choice) => choice === "no")).map((row) => row.item.title);
    if (rejected.length) changeHistory((current) => addToHistory(current, "rejected", rejected));
    const top = rows[0];
    track("round_completed", { group_size: size, result: top?.match ? "match" : top?.points > 0 ? "top" : "none" });
  };

  const showResults = () => {
    if (session.step === "common") track("preferences_completed", { group_size: size });
    const answers = session.people.reduce((total, person) => total + person.titles.length, 0);
    if (answers) track("calibration_completed", { answers });
    setSavedPrefs({ genres: profile.liked }); // el inicio ("Para ver en pareja") usa estos gustos
    go("results");
  };

  const markSeen = (title) => {
    changeHistory((current) => addToHistory(current, "seen", [title]));
    showToast("👀 Marcada como vista.");
    go("results");
  };

  // Con frase escrita, sus criterios reemplazan los gustos guardados de la persona 1 (el texto no se envía a analítica).
  const startNew = (occasionId = null, parsed = null) => {
    const base = withAccountTaste(startOccasion(session, occasionId), account.prefs, user?.name);
    const next = parsed ? sessionFromQuery(base, parsed) : base;
    reset(next);
    track("duo_started", { group_size: next.people.length, mode: next.mode });
    setSeed(null);
    setRoundOpen(false);
    go("mode");
  };

  if (intro) {
    return (
      <div className="duo-page duo-step-intro">
        <div className="duo-container">
          <DuoIntro
            hasSession={hasSession}
            onStart={(occasionId, parsed) => {
              if (!hasSession || window.confirm(RESTART)) startNew(occasionId, parsed);
            }}
            onResume={() => go(session.step)}
          />
        </div>
      </div>
    );
  }

  const { step } = session;
  const current = steps.findIndex((item) => item.key === step);
  const personIndex = step.startsWith("person-") ? Number(step.slice(7)) : null;
  const finalItem = ranked?.items.find((item) => item.title.id === session.final) ?? null;
  const setPerson = (person) => changePrefs((currentSession) => ({ people: currentSession.people.map((item, index) => (index === personIndex ? person : item)) }));
  const lastPerson = `person-${size - 1}`;
  const choose = (id, source = "card") => {
    track("title_chosen", { group_size: size, source });
    update({ final: id });
    go("final");
  };

  return (
    <div className={`duo-page duo-step-${step.replace(/-\d+$/, "")}`} data-occasion={session.occasion ?? "none"}>
      <div className="duo-container">
        <header className="duo-header">
          <div className="duo-bar">
            <div className="duo-bar-title">
              <span className="duo-badge">
                <Icon name="sparkles" /> CINET <b>DUO</b>
              </span>
              <h1>{occasion?.title ?? (size === 1 ? "Una historia para ti" : "Su noche de cine")}</h1>
            </div>
            <ul className="duo-participants" aria-label={`Sesión de ${listEs(names)}`}>
              {names.map((name, index) => (
                <li key={index} className={personIndex === index ? "is-current" : undefined} style={{ "--n": index }}>
                  <SeatAvatar index={index} name={name} />
                  <span>{name}</span>
                </li>
              ))}
            </ul>
          </div>
          <DuoProgress
            step={step}
            steps={steps}
            reached={session.reached}
            names={names}
            roundOpen={roundOpen}
            hasRound={Boolean(session.round)}
            hasFinal={Boolean(session.final)}
            onGo={(target) => {
              setRoundOpen(false);
              go(target);
            }}
            onDecide={() => {
              go("results");
              setRoundOpen(true);
            }}
          />
          <div className="duo-session-tools">
            <p className="duo-device-note">En este dispositivo · {storageOk ? "se conserva al recargar" : "sin guardar"}</p>
            <div>
              <button type="button" className="duo-link duo-summary-toggle" aria-expanded={summaryOpen} aria-controls="duo-summary" onClick={() => setSummaryOpen((open) => !open)}>
                <Icon name="ticket" /> {summaryOpen ? "Ocultar" : "Resumen"}
                <span className="duo-sm-hide">&nbsp;de la noche</span>
              </button>
              <label className="duo-motion-toggle">
                <input type="checkbox" checked={lessMotion} onChange={(event) => setLessMotion(event.target.checked)} />
                <span>Menos movimiento</span>
              </label>
              <button
                type="button"
                className="duo-link"
                onClick={() => {
                  setIntro(true);
                  window.scrollTo({ top: 0 });
                }}
              >
                <Icon name="screen" /> Presentación
              </button>
              <button type="button" className="duo-link duo-restart" onClick={() => window.confirm(RESTART) && startNew()}>
                Empezar de nuevo
              </button>
            </div>
          </div>
        </header>

        {!storageOk && (
          <p className="duo-notice" role="status">
            Este navegador no deja guardar datos: la sesión y el historial se perderán al recargar la página.
          </p>
        )}
        {seed && step === "mode" && (
          <p className="duo-notice" role="status">
            Partimos de «{seed.title}»: añadimos {seed.genreKeys.length ? listEs(seed.genreKeys.map(genreName)) : "su tipo"} a los gustos de quien no había marcado géneros. Pueden cambiarlo en
            cada paso.
          </p>
        )}

        <div className="duo-layout">
          <div className="duo-main" key={step} ref={mainRef} tabIndex={-1} aria-label={`Paso: ${steps[current]?.label ?? "Duo"}`}>
            {step === "mode" && (
              <DuoModeStep
                session={session}
                occasion={occasion}
                onChange={changePrefs}
                onGroupSize={setGroupSize}
                onNext={() => go("person-0")}
                onQuick={showResults}
                turnsEnabled={Boolean(turns?.enabled)}
                onTurns={(enabled) => setTurns((value) => ({ ...EMPTY_TURNS, ...value, enabled }))}
                onTurnsReset={() => setTurns((value) => ({ ...EMPTY_TURNS, enabled: Boolean(value?.enabled) }))}
              />
            )}
            {personIndex !== null && (
              <DuoPersonStep
                key={step}
                index={personIndex}
                size={size}
                person={session.people[personIndex]}
                type={profile.type}
                nextName={names[personIndex + 1] ?? null}
                onChange={setPerson}
                onBack={() => go(personIndex === 0 ? "mode" : `person-${personIndex - 1}`)}
                onNext={() => go(personIndex < size - 1 ? `person-${personIndex + 1}` : "seen")}
              />
            )}
            {step === "seen" && (
              <DuoSeenStep
                type={profile.type}
                size={size}
                history={history}
                onHistory={changeHistory}
                onOpenHistory={() => setHistoryOpen(true)}
                onBack={() => go(lastPerson)}
                onNext={() => go("common")}
              />
            )}
            {step === "common" && <DuoCommonStep session={session} profile={profile} history={history} ranked={ranked} onEdit={go} onNext={showResults} />}
            {candidatesError && NEEDS_CANDIDATES.includes(step) && (
              <div className="duo-notice" role="alert">
                No pudimos cargar las recomendaciones. Tus respuestas siguen guardadas.{" "}
                <button type="button" className="duo-link" onClick={() => setRetry((value) => value + 1)}>
                  Reintentar
                </button>
              </div>
            )}
            {step === "results" &&
              !candidatesError &&
              (session.mode === "marathon" ? (
                <DuoMarathon session={session} profile={profile} candidates={candidates} ranked={ranked} onSession={update} onEdit={go} onOpenHistory={() => setHistoryOpen(true)} />
              ) : (
                <DuoResults
                  session={session}
                  profile={profile}
                  candidates={candidates}
                  ranked={ranked}
                  history={history}
                  names={names}
                  favorites={favorites}
                  roundOpen={roundOpen}
                  onRoundOpen={setRoundOpen}
                  onSession={update}
                  onHistory={changeHistory}
                  onVote={vote}
                  onChoose={choose}
                  onRoundComplete={completeRound}
                  onEdit={go}
                  onOpenHistory={() => setHistoryOpen(true)}
                />
              ))}
            {step === "final" && !candidatesError && (
              <DuoFinal
                item={finalItem}
                loading={!ranked}
                names={names}
                votes={session.votes[session.final]}
                onSeen={markSeen}
                onBack={() => go("results")}
                onNew={startNew}
                turnsEnabled={Boolean(turns?.enabled) && size > 1}
                onYield={(yielded) => setTurns((value) => recordYield(value, yielded, names))}
              />
            )}
          </div>

          <DuoSummary session={session} profile={profile} history={history} onEdit={go} onOpenHistory={() => setHistoryOpen(true)} open={summaryOpen} />
        </div>
      </div>

      <DuoHistoryDialog
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        history={history}
        onHistory={changeHistory}
        onReset={resetHistory}
        session={session}
        onSession={update}
        lookup={lookup}
        favoritesCount={favorites.favorites.length}
      />
    </div>
  );
}
