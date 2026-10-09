import { useCallback, useEffect, useMemo, useState } from "react";
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
import { useAsync } from "../hooks/useAsync.js";
import { useDocumentTitle } from "../hooks/useDocumentTitle.js";
import { useDuoHistory } from "../hooks/useDuoHistory.js";
import { useDuoSession } from "../hooks/useDuoSession.js";
import { useFavorites } from "../hooks/useFavorites.js";
import { useLocalStorage } from "../hooks/useLocalStorage.js";
import { useToast } from "../hooks/useToast.js";
import { getDuoCandidates, groupRejected, setVote } from "../services/duoService.js";
import { addToHistory } from "../services/historyService.js";
import { getMovieById } from "../services/movieService.js";
import { buildProfile, feedbackFrom, genreName, listEs, rankTitles } from "../services/recommender.js";
import { isStorageAvailable } from "../utils/storage.js";

const NEEDS_CANDIDATES = ["common", "results", "final"];
// Cambiar preferencias invalida resultados, maratón, elección y filtros ampliados (se recalculan).
const FRESH_RESULTS = { board: [], marathonPlan: null, final: null, relax: DEFAULT_DUO_SESSION.relax };
const RESTART = "¿Empezar una sesión nueva? Se borran las respuestas de esta sesión (el historial se conserva).";

/** Solo lo que cambia la consulta a TMDB: nombres, tono o votos no vuelven a pedir candidatos. */
function candidatesKey(profile, saga) {
  const { type, liked, shared, must, rejected, maxRuntime, seriesStatus, region, providers, actors, relax, people } = profile;
  return JSON.stringify([
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

/** /duo — sesión guiada de 1 a 8 personas: plan → cada persona → ya vistas → en común → resultados → elección. */
export default function DuoPage() {
  const { session, hasSession, update, reset } = useDuoSession();
  const { history, change: changeHistory, reset: resetHistory } = useDuoHistory();
  const favorites = useFavorites();
  const [, setSavedPrefs] = useLocalStorage(DUO_PREFERENCES_KEY, null);
  const { showToast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const fromId = searchParams.get("from");
  const [intro, setIntro] = useState(!fromId && !hasSession); // con sesión guardada, una recarga retoma el mismo paso
  const [seed, setSeed] = useState(null); // título elegido con "Usar en Duo"
  const [historyOpen, setHistoryOpen] = useState(false);
  const [storageOk] = useState(isStorageAvailable);
  useDocumentTitle("Duo");

  const size = session.people.length;
  const steps = useMemo(() => stepsFor(size), [size]);
  const profile = useMemo(() => buildProfile(session), [session]);
  const saga = session.mode === "marathon" && session.marathon.scope === "saga";
  const key = !intro && NEEDS_CANDIDATES.includes(session.step) ? `duo-${candidatesKey(profile, saga)}` : null;
  const { data: candidates } = useAsync(key, () => getDuoCandidates(profile, { saga }));
  // Lo votado en la sesión reordena el resto: más de lo que gustó, menos de lo que no.
  const feedback = useMemo(() => feedbackFrom(session.votes, candidates?.titles), [session.votes, candidates]);
  const ranked = useMemo(
    () => candidates && rankTitles(candidates.titles, profile, { history, favorites: favorites.favorites, removed: session.removed, feedback }),
    [candidates, profile, history, favorites.favorites, session.removed, feedback]
  );
  const lookup = useMemo(() => new Map((candidates?.titles ?? []).map((title) => [title.id, title])), [candidates]);
  const names = session.people.map(personName);

  const go = useCallback(
    (step) => {
      update((current) => ({ step, reached: Math.max(current.reached, stepsFor(current.people.length).findIndex((item) => item.key === step)) }));
      setIntro(false);
      window.scrollTo({ top: 0 });
    },
    [update]
  );
  const changePrefs = useCallback(
    (patch) => update((current) => ({ ...(typeof patch === "function" ? patch(current) : patch), ...FRESH_RESULTS })),
    [update]
  );

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
          person.genres.length || person.mustGenres.length
            ? person
            : { ...person, genres: title.genreKeys.filter((genre) => !person.rejectedGenres.includes(genre)) }
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

  const showResults = () => {
    setSavedPrefs({ genres: profile.liked }); // el inicio ("Para ver en pareja") usa estos gustos
    go("results");
  };

  const markSeen = (title) => {
    changeHistory((current) => addToHistory(current, "seen", [title]));
    showToast("👀 Marcada como vista.");
    go("results");
  };

  const startNew = () => {
    reset({ region: session.region, providers: session.providers, people: session.people.map(() => DEFAULT_PERSON) });
    setSeed(null);
    go("mode");
  };

  if (intro) {
    return (
      <div className="duo-page duo-step-intro">
        <div className="duo-container">
          <DuoIntro
            hasSession={hasSession}
            onStart={() => {
              if (!hasSession || window.confirm(RESTART)) startNew();
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
  const setPerson = (person) =>
    changePrefs((currentSession) => ({ people: currentSession.people.map((item, index) => (index === personIndex ? person : item)) }));
  const lastPerson = `person-${size - 1}`;

  return (
    <div className={`duo-page duo-step-${step.replace(/-\d+$/, "")}`}>
      <div className="duo-container">
        <header className="duo-header">
          <div className="duo-session-heading">
            <div>
              <span className="duo-badge"><Icon name="sparkles" /> CINET <b>DUO</b></span>
              <h1>{size === 1 ? "Tu próxima historia empieza aquí." : "Su próxima historia empieza aquí."}</h1>
            </div>
            <ul className="duo-participants" aria-label={`Sesión de ${listEs(names)}`}>
              {names.map((name, index) => (
                <li key={index} className={personIndex === index ? "is-current" : undefined}>
                  <SeatAvatar index={index} name={name} />
                  <span>{name}</span>
                </li>
              ))}
            </ul>
          </div>
          <DuoProgress steps={steps} current={current} reached={session.reached} names={names} onGo={go} />
          <div className="duo-session-tools">
            <button type="button" className="duo-link" onClick={() => { setIntro(true); window.scrollTo({ top: 0 }); }}><Icon name="screen" /> Ver presentación de Duo</button>
            <button type="button" className="duo-link duo-restart" onClick={() => window.confirm(RESTART) && startNew()}>
              Empezar de nuevo
            </button>
          </div>
        </header>

        {!storageOk && (
          <p className="duo-notice" role="status">
            Este navegador no deja guardar datos: la sesión y el historial se perderán al recargar la página.
          </p>
        )}
        {seed && step === "mode" && (
          <p className="duo-notice" role="status">
            Partimos de «{seed.title}»: añadimos {seed.genreKeys.length ? listEs(seed.genreKeys.map(genreName)) : "su tipo"} a los gustos de quien
            no había marcado géneros. Pueden cambiarlo en cada paso.
          </p>
        )}

        <div className="duo-layout">
          <div className="duo-main" key={step}>
            {step === "mode" && <DuoModeStep session={session} onChange={changePrefs} onGroupSize={setGroupSize} onNext={() => go("person-0")} />}
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
            {step === "results" &&
              (session.mode === "marathon" ? (
                <DuoMarathon
                  session={session}
                  profile={profile}
                  candidates={candidates}
                  ranked={ranked}
                  onSession={update}
                  onEdit={go}
                  onOpenHistory={() => setHistoryOpen(true)}
                />
              ) : (
                <DuoResults
                  session={session}
                  profile={profile}
                  candidates={candidates}
                  ranked={ranked}
                  history={history}
                  names={names}
                  favorites={favorites}
                  onSession={update}
                  onHistory={changeHistory}
                  onVote={vote}
                  onChoose={(id) => {
                    update({ final: id });
                    go("final");
                  }}
                  onEdit={go}
                  onOpenHistory={() => setHistoryOpen(true)}
                />
              ))}
            {step === "final" && (
              <DuoFinal item={finalItem} loading={!ranked} names={names} votes={session.votes[session.final]} onSeen={markSeen} onBack={() => go("results")} onNew={startNew} />
            )}
          </div>

          <DuoSummary session={session} profile={profile} history={history} onEdit={go} onOpenHistory={() => setHistoryOpen(true)} />
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
