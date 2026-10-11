import { useEffect, useMemo, useState } from "react";
import Button from "../common/Button.jsx";
import DiceButton from "../common/DiceButton.jsx";
import SkeletonRow from "../common/SkeletonRow.jsx";
import TmdbStatus from "../common/TmdbStatus.jsx";
import DuoEmptyState from "./DuoEmptyState.jsx";
import DuoRecommendationCard from "./DuoRecommendationCard.jsx";
import DuoShortlist from "./DuoShortlist.jsx";
import DuoVoteRound from "./DuoVoteRound.jsx";
import { regionName } from "../../data/tmdb.js";
import { useShare } from "../../hooks/useShare.js";
import { useToast } from "../../hooks/useToast.js";
import { track } from "../../services/analytics.js";
import { learningSummary, newRound } from "../../services/duoExperience.js";
import { groupLiked } from "../../services/duoService.js";
import { addToHistory } from "../../services/historyService.js";
import { fillBoard, findSimilar, genreName, listEs, MIN_RESULTS, pickFinalists, rollDice } from "../../services/recommender.js";
import { appUrl } from "../../utils/share.js";

const BOARD_SIZE = MIN_RESULTS; // recomendación principal + 19 opciones
const VISIBLE = 8; // opciones a la vista antes de "Ver más"
const FEW = 4; // menos que esto: se explica y se ofrece ampliar
const ROUND_SIZE = 8; // la ronda de "Explorar todas" vota hasta 8
const COUNT = ["", "Una finalista", "Dos finalistas", "Tres finalistas"];

/** "Ana: 2 que le encantan y 1 sí" — solo señales que existen. */
function learnedText(entry) {
  const parts = [
    entry.loved && `${entry.loved} que le encanta${entry.loved === 1 ? "" : "n"}`,
    entry.noped && `${entry.noped} que no`,
    entry.yes && `${entry.yes} «sí»`,
    entry.no && `${entry.no} «no»`,
  ].filter(Boolean);
  return `${entry.name}: ${listEs(parts)}`;
}

/** Escenas 4 y 5: comparar finalistas (o explorar todas) y decidir con una ronda que se puede retomar. */
export default function DuoResults({ session, profile, candidates, ranked, history, names, favorites, roundOpen, onRoundOpen: setRoundOpen, onSession, onHistory, onVote, onChoose, onEdit, onOpenHistory, onRoundComplete }) {
  const { isFavorite, toggleFavorite } = favorites;
  const { showToast } = useToast();
  const share = useShare();
  const [note, setNote] = useState(null); // { id, text } del último cambio (dado o "parecida")
  const [announce, setAnnounce] = useState("");
  const [showAll, setShowAll] = useState(false);
  const items = useMemo(() => ranked?.items ?? [], [ranked]);
  const byId = useMemo(() => new Map(items.map((item) => [item.title.id, item])), [items]);
  const board = useMemo(() => fillBoard(session.board, items, BOARD_SIZE), [session.board, items]);
  const compact = session.resultView !== "explore";
  const size = names.length;
  const noun = profile.type === "tv" ? "series" : "películas";
  const { round } = session;

  // Persiste lo que está en pantalla (una recarga muestra lo mismo) y lo marca como reciente,
  // así la próxima tanda rota los títulos en vez de repetir siempre los mismos.
  useEffect(() => {
    if (!ranked || board.join() === session.board.join()) return;
    const added = board.filter((id) => !session.board.includes(id));
    onSession({ board });
    if (added.length) onHistory((current) => addToHistory(current, "recent", added));
  }, [ranked, board, session.board, onSession, onHistory]);

  // Finalistas fijadas para esta tanda (del tablero, en su orden). Solo se recalculan si alguna dejó de ser válida.
  const finalistsKey = session.finalists.map((pick) => pick.id).join();
  useEffect(() => {
    if (!ranked || !session.board.length) return;
    if (finalistsKey && finalistsKey.split(",").every((id) => byId.has(id))) return;
    const picked = pickFinalists(session.board.map((id) => byId.get(id)).filter(Boolean), profile);
    onSession({ finalists: picked });
    track("shortlist_shown", { finalists: picked.length });
  }, [ranked, session.board, finalistsKey, byId, profile, onSession]);

  const finalists = session.finalists.map((pick) => ({ ...pick, item: byId.get(pick.id) })).filter((pick) => pick.item);

  // La ronda usa su baraja congelada: si un título sale del ranking, sigue en la ronda abierta.
  const roundItems = useMemo(() => {
    const map = new Map(byId);
    for (const title of candidates?.titles ?? []) if (!map.has(title.id)) map.set(title.id, { title, reasons: [], seats: [], relaxed: [] });
    return map;
  }, [byId, candidates]);

  const replaceAt = (index, item, text) => {
    onSession({ board: board.map((id, position) => (position === index ? item.title.id : id)) });
    setNote({ id: item.title.id, text });
    setAnnounce(`Nueva recomendación: ${item.title.title}. ${item.reasons[0]}`);
  };

  const reroll = (index) => {
    const result = rollDice(items, { shown: board, previous: board[index], recent: history.recent });
    if (!result) {
      showToast("No quedan otras opciones que cumplan sus filtros.");
      return;
    }
    const pool = result.alternative
      ? `las ${result.poolSize} alternativas más cercanas (ya no quedaban títulos que cumplan todos sus gustos)`
      : `las ${result.poolSize} opciones que mejor cumplen sus filtros`;
    const repeat = result.repeatsRecent ? " Ya no quedaban títulos que no hubieran visto aquí." : "";
    replaceAt(index, result.item, `🎲 Elegida al azar entre ${pool}; las que mejor encajan tienen más probabilidad.${repeat}`);
  };

  const similar = (index) => {
    const target = byId.get(board[index]).title;
    const found = findSimilar(target, items, board);
    if (!found) {
      showToast("No hay otra parecida que cumpla sus filtros.");
      return;
    }
    const shared = (found.title.genreKeys ?? []).filter((key) => target.genreKeys?.includes(key));
    const saga = found.title.collection?.id != null && found.title.collection.id === target.collection?.id;
    const why = saga ? `misma saga (${found.title.collection.name})` : `comparte ${listEs(shared.map(genreName))}`;
    replaceAt(index, found, `🔁 Parecida a «${target.title}»: ${why}.`);
  };

  const exclude = (list, title, message) => {
    onHistory((current) => addToHistory(current, list, [title]));
    showToast(message);
  };

  // Otra tanda: aplica lo aprendido (calibración y votos por persona) de forma explícita. La ronda abierta no cambia.
  const regenerate = () => {
    onHistory((current) => addToHistory(current, "recent", board));
    onSession((current) => ({ board: [], finalists: [], batch: current.batch + 1 }));
    setNote(null);
    setAnnounce("Nueva tanda cargada con lo que aprendimos.");
  };

  const relax = (patch) => onSession((current) => ({ relax: { ...current.relax, ...patch } }));

  const startRound = () => {
    const deck = compact ? finalists.map((pick) => pick.id) : board.slice(0, ROUND_SIZE);
    onSession({ round: newRound(deck, size) });
    setRoundOpen(true);
    track("round_started", { group_size: size, candidates: deck.length });
  };
  const updateRound = (patch) => onSession((current) => ({ round: current.round ? { ...current.round, ...patch } : null }));

  const liked = groupLiked(session.votes, size).filter((id) => byId.has(id));
  const learned = learningSummary(profile, session.votes);
  const shareList = () =>
    share({
      title: "CINET Duo",
      text: [
        size === 1 ? "Lo que quiero ver (CINET Duo):" : "Nuestras opciones (CINET Duo):",
        ...(compact && finalists.length ? finalists.map((pick) => pick.id) : liked.length ? liked : board).slice(0, 5).map((id, index) => {
          const { title, year } = byId.get(id).title;
          return `${index + 1}. ${title}${year ? ` (${year})` : ""}`;
        }),
      ].join("\n"),
      url: appUrl("duo"),
    });

  const cardFor = (id, index) => {
    const item = byId.get(id);
    const { title } = item;
    return (
      <DuoRecommendationCard
        key={id}
        item={item}
        featured={index === 0}
        names={names}
        votes={session.votes[id] ?? []}
        favorite={isFavorite(id)}
        note={note?.id === id ? note.text : null}
        style={{ "--i": Math.min(index, 8) }}
        actions={{
          vote: (person, choice) => onVote(title, person, choice),
          choose: () => onChoose(id),
          save: () => toggleFavorite(id),
          reroll: () => reroll(index),
          similar: () => similar(index),
          seen: () => exclude("seen", title, "👀 Marcada como vista: no la volveremos a recomendar."),
          notInterested: () => exclude("notInterested", title, "🚫 No volverá a aparecer. Puedes recuperarla en «Ver títulos excluidos»."),
          remove: () => onSession((current) => ({ removed: [...current.removed, id] })),
        }}
      />
    );
  };

  const options = board.slice(1);
  const visible = showAll ? options : options.slice(0, VISIBLE);
  const heading = size === 1 ? "Para ti" : size === 2 ? "Para ver juntos" : "Para el grupo";
  const stats = candidates?.stats;
  const roundResult = round?.result ? roundItems.get(round.result)?.title : null;
  const roundPaused = round && round.phase !== "results";

  return (
    <section className="duo-results" aria-labelledby="duo-results-title">
      <div className="duo-results-head">
        <div>
          <p className="duo-overline">
            {compact ? "ESCENA 4 · COMPARAR" : "EXPLORAR TODAS"} · TANDA {session.batch}
          </p>
          <h2 id="duo-results-title">{compact && finalists.length ? `${COUNT[finalists.length]} ${heading.toLowerCase()}` : heading}</h2>
          <p>
            {ranked
              ? `${ranked.strict} ${noun} cumplen todos sus límites${items.length > ranked.strict ? ` · ${items.length - ranked.strict} alternativas que solo fallan un gusto` : ""}`
              : `Buscando ${noun}…`}{" "}
            · {regionName(profile.region)}
            {candidates?.source === "local" && " · disponibilidad por plataforma sin comprobar"}
          </p>
          <TmdbStatus />
        </div>
        {board.length > 0 && (
          <div className="duo-view-switch" role="group" aria-label="Cómo explorar las recomendaciones">
            <button type="button" aria-pressed={compact} onClick={() => onSession({ resultView: "shortlist" })}>
              Finalistas <span>Comparar y decidir</span>
            </button>
            <button type="button" aria-pressed={!compact} onClick={() => onSession({ resultView: "explore" })}>
              Explorar todas <span>Dado, parecidas y más</span>
            </button>
          </div>
        )}
      </div>

      {/* Con catálogo local, TmdbStatus ya lo explica; los avisos del modo familia sí se muestran. */}
      {candidates?.notice && candidates.source !== "local" && (
        <p className="duo-notice" role="status">
          {candidates.notice}
        </p>
      )}
      <p className="visually-hidden" aria-live="polite">
        {announce}
      </p>

      {round && !roundOpen && (
        <div className="duo-round-banner" role="status">
          {roundPaused ? (
            <span>
              Ronda en pausa: turno de <strong>{names[round.person] ?? "alguien"}</strong>, {Math.min(round.card + 1, round.deck.length)} de {round.deck.length}. Los votos ya dados siguen guardados.
            </span>
          ) : (
            <span>
              Ronda terminada{roundResult && <>: la primera fue <strong>{roundResult.title}</strong></>}.
            </span>
          )}
          <Button variant="primary" onClick={() => setRoundOpen(true)}>
            {roundPaused ? "Retomar la ronda" : "Ver resultado"}
          </Button>
          <button type="button" className="duo-link" onClick={() => onSession({ round: null })}>
            {roundPaused ? "Descartar la ronda" : "Cerrar"}
          </button>
        </div>
      )}

      {!ranked && <SkeletonRow variant="grid" count={3} label={`Buscando ${noun} para ustedes…`} />}

      {ranked && items.length === 0 && <DuoEmptyState ranked={ranked} profile={profile} source={candidates?.source} onRelax={relax} onEdit={onEdit} onOpenHistory={onOpenHistory} />}

      {compact && finalists.length > 0 && (
        <>
          <DuoShortlist finalists={finalists} names={names} votes={session.votes} favorites={favorites} onVote={onVote} onChoose={onChoose} />
          <p className="duo-fineprint duo-learned">
            {learned.length
              ? `La próxima tanda usará lo aprendido: ${learned.map(learnedText).join(" · ")}. Esta tanda no cambia mientras la comparan.`
              : "Cuando voten o respondan películas, la próxima tanda lo tendrá en cuenta. Esta tanda no cambia mientras la comparan."}
          </p>
          <div className="duo-decide-bar">
            <div className="duo-decide-copy">
              <span className="duo-overline">ESCENA 5 · DECIDIR</span>
              <p>{size > 1 ? "Voten en secreto pasando el celular, o elijan una directamente." : "Repásalas una a una o elige directamente."}</p>
            </div>
            <div className="duo-decide-actions">
              <Button variant="primary" className="duo-cta" disabled={finalists.length < 2} onClick={startRound}>
                {size > 1 ? `Votar entre ${finalists.length}` : "Modo rápido"}
              </Button>
              <Button variant="secondary" aria-label="Generar otra tanda con lo aprendido" disabled={items.length <= board.length} onClick={regenerate}>
                <span aria-hidden="true">🔄</span>
                <span className="duo-wide-only">Otra tanda</span>
              </Button>
              <Button variant="secondary" aria-label="Compartir las finalistas" onClick={shareList}>
                <span aria-hidden="true">↗</span>
                <span className="duo-wide-only">Compartir</span>
              </Button>
            </div>
          </div>
        </>
      )}

      {!compact && board.length > 0 && (
        <>
          <div className="duo-actions">
            <Button variant="primary" className="duo-cta duo-round-open" disabled={board.length < 2} onClick={startRound}>
              {size > 1 ? `🗳️ Ronda de votación (${Math.min(board.length, ROUND_SIZE)})` : "⚡ Modo rápido"}
            </Button>
            <DiceButton label="Sorpréndeme" ariaLabel="Sorpréndeme: cambiar la recomendación principal por otra al azar que cumpla sus filtros" disabled={items.length <= 1} onRoll={() => reroll(0)} />
            <Button variant="secondary" disabled={items.length <= board.length} onClick={regenerate}>
              🔄 Otra tanda
            </Button>
            <Button variant="secondary" onClick={shareList}>
              ↗ Compartir
            </Button>
          </div>
          {liked.length > 0 && (
            <div className="duo-together" role="status">
              <h3>{size === 1 ? "💞 Te gustan" : "💞 ¡Match! A todos les gusta"}</h3>
              <ul>
                {liked.map((id) => (
                  <li key={id}>
                    <span>{byId.get(id).title.title}</span>
                    <Button variant="primary" className="duo-cta" onClick={() => onChoose(id)}>
                      Elegir
                    </Button>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {cardFor(board[0], 0)}
          {options.length > 0 && (
            <>
              <div className="duo-subtitle-row">
                <h3 className="duo-subtitle">Otras opciones</h3>
                <p className="duo-fineprint">{size > 1 ? "Butaca iluminada = le encaja. Tócala para votar: sí → quizá → no." : "Toca tu butaca para votar: sí → quizá → no."}</p>
              </div>
              <div className="duo-grid">{visible.map((id, index) => cardFor(id, index + 1))}</div>
              {options.length > VISIBLE && (
                <div className="duo-actions duo-actions-center">
                  <Button variant="secondary" onClick={() => setShowAll((value) => !value)}>
                    {showAll ? "Ver menos" : `Ver ${options.length - VISIBLE} opciones más`}
                  </Button>
                </div>
              )}
            </>
          )}
        </>
      )}

      {ranked && items.length > 0 && ranked.strict < FEW && <DuoEmptyState ranked={ranked} profile={profile} source={candidates?.source} few onRelax={relax} onEdit={onEdit} onOpenHistory={onOpenHistory} />}

      {stats && ranked && (
        <details className="duo-search-stats">
          <summary>Cómo buscamos</summary>
          <p>
            {candidates.source === "tmdb"
              ? `Revisamos ${stats.discovered} títulos de TMDB y comprobamos disponibilidad y detalle de ${stats.enriched}${stats.enrichFailed ? ` (${stats.enrichFailed} consultas fallaron: esos datos quedan como desconocidos)` : ""}. ${stats.requests} consultas nuevas y ${stats.reused} reutilizadas, en ${(stats.ms / 1000).toFixed(1)} s.`
              : `Catálogo de CINET: ${candidates.titles.length} títulos, sin consultas a TMDB.`}{" "}
            {Object.keys(ranked.rejectedBy).length > 0 && `Quedaron fuera ${Object.values(ranked.rejectedBy).reduce((total, count) => total + count, 0)} por límites, historial o formato.`}
          </p>
        </details>
      )}

      <p className="duo-attribution">
        Datos de películas y series: TMDB. Disponibilidad por plataforma: JustWatch vía TMDB; puede cambiar sin aviso. This product uses the TMDB API but is not endorsed or certified by TMDB.
      </p>

      {round && roundOpen && (
        <DuoVoteRound
          round={round}
          items={roundItems}
          names={names}
          onRound={updateRound}
          onComplete={onRoundComplete}
          onChoose={(id) => {
            setRoundOpen(false);
            onChoose(id, "round");
          }}
          onNewRound={() => onSession({ round: newRound(round.deck, size) })}
          onClose={() => setRoundOpen(false)}
        />
      )}
    </section>
  );
}
