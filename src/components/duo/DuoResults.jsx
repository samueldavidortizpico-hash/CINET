import { useEffect, useMemo, useState } from "react";
import Button from "../common/Button.jsx";
import DiceButton from "../common/DiceButton.jsx";
import SkeletonRow from "../common/SkeletonRow.jsx";
import TmdbStatus from "../common/TmdbStatus.jsx";
import DuoEmptyState from "./DuoEmptyState.jsx";
import DuoRecommendationCard from "./DuoRecommendationCard.jsx";
import { regionName } from "../../data/tmdb.js";
import { useShare } from "../../hooks/useShare.js";
import { useToast } from "../../hooks/useToast.js";
import { bothLiked } from "../../services/duoService.js";
import { addToHistory } from "../../services/historyService.js";
import { fillBoard, findSimilar, genreName, listEs, MIN_RESULTS, rollDice } from "../../services/recommender.js";
import { appUrl } from "../../utils/share.js";

const BOARD_SIZE = MIN_RESULTS; // recomendación principal + 19 opciones
const FEW = 4; // menos que esto: se explica y se ofrece ampliar

/** Paso 6 (película o serie): recomendación principal, alternativas, dado y acciones por título. */
export default function DuoResults({
  session,
  profile,
  candidates,
  ranked,
  history,
  names,
  favorites,
  onSession,
  onHistory,
  onVote,
  onChoose,
  onEdit,
  onOpenHistory,
}) {
  const { isFavorite, toggleFavorite } = favorites;
  const { showToast } = useToast();
  const share = useShare();
  const [note, setNote] = useState(null); // { id, text } del último cambio (dado o "parecida")
  const [announce, setAnnounce] = useState("");
  const items = useMemo(() => ranked?.items ?? [], [ranked]);
  const byId = useMemo(() => new Map(items.map((item) => [item.title.id, item])), [items]);
  const board = useMemo(() => fillBoard(session.board, items, BOARD_SIZE), [session.board, items]);
  const noun = profile.type === "tv" ? "series" : "películas";

  // Persiste lo que está en pantalla (una recarga muestra lo mismo) y lo marca como reciente,
  // así la próxima sesión rota los títulos en vez de repetir siempre los mismos.
  useEffect(() => {
    if (!ranked || board.join() === session.board.join()) return;
    const added = board.filter((id) => !session.board.includes(id));
    onSession({ board });
    if (added.length) onHistory((current) => addToHistory(current, "recent", added));
  }, [ranked, board, session.board, onSession, onHistory]);

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
      ? `las ${result.poolSize} alternativas más cercanas a sus filtros (ya no quedaban títulos que los cumplan todos)`
      : `las ${result.poolSize} opciones que mejor cumplen sus filtros`;
    const repeat = result.repeatsRecent ? " Ya no quedaban títulos que no les hubiéramos mostrado." : "";
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

  const regenerate = () => {
    onHistory((current) => addToHistory(current, "recent", board));
    onSession({ board: [] });
    setNote(null);
    setAnnounce("Nuevas opciones cargadas.");
  };

  const relax = (patch) => onSession((current) => ({ relax: { ...current.relax, ...patch } }));

  const liked = bothLiked(session.votes).filter((id) => byId.has(id));
  const shareList = () =>
    share({
      title: "CINET Duo",
      text: [
        `Lo que ${names.join(" y ")} quieren ver (CINET Duo):`,
        ...(liked.length ? liked : board).slice(0, 5).map((id, index) => {
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

  return (
    <section className="duo-results" aria-labelledby="duo-results-title">
      <div className="duo-results-head">
        <div>
          <h2 id="duo-results-title">Para ver juntos</h2>
          <p>
            {ranked
              ? `${ranked.strict} ${noun} cumplen todos sus filtros${items.length > ranked.strict ? ` · ${items.length - ranked.strict} alternativas cercanas` : ""}`
              : `Buscando ${noun}…`}{" "}
            · {regionName(profile.region)}
          </p>
          <TmdbStatus />
        </div>
        <div className="duo-actions">
          <DiceButton
            label="Sorpréndeme"
            ariaLabel="Sorpréndeme: cambiar la recomendación principal por otra al azar que cumpla sus filtros"
            disabled={items.length <= 1}
            onRoll={() => reroll(0)}
          />
          <Button variant="secondary" disabled={items.length <= board.length} onClick={regenerate}>
            🔄 Otras opciones
          </Button>
          <Button variant="secondary" disabled={!board.length} onClick={shareList}>
            ↗ Compartir
          </Button>
        </div>
      </div>

      {candidates?.notice && (
        <p className="duo-notice" role="status">
          {candidates.notice}
        </p>
      )}
      {candidates?.source === "local" && !candidates.notice && (
        <p className="duo-notice">Sin conexión a TMDB: recomendamos desde el catálogo de CINET y la disponibilidad por plataforma queda por confirmar.</p>
      )}
      <p className="visually-hidden" aria-live="polite">
        {announce}
      </p>

      {!ranked && <SkeletonRow variant="grid" count={4} label={`Buscando ${noun} para ustedes…`} />}

      {ranked && items.length === 0 && (
        <DuoEmptyState ranked={ranked} profile={profile} source={candidates?.source} onRelax={relax} onEdit={onEdit} onOpenHistory={onOpenHistory} />
      )}

      {board.length > 0 && cardFor(board[0], 0)}

      {liked.length > 0 && (
        <div className="duo-together">
          <h3>💞 A los dos les gusta</h3>
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

      {board.length > 1 && (
        <>
          <h3 className="duo-subtitle">Otras opciones</h3>
          <div className="duo-grid">{board.slice(1).map((id, index) => cardFor(id, index + 1))}</div>
        </>
      )}

      {ranked && items.length > 0 && ranked.strict < FEW && (
        <DuoEmptyState ranked={ranked} profile={profile} source={candidates?.source} few onRelax={relax} onEdit={onEdit} onOpenHistory={onOpenHistory} />
      )}

      <p className="duo-attribution">
        Datos de películas y series: TMDB. Disponibilidad por plataforma: JustWatch vía TMDB; puede cambiar sin aviso. This product uses the TMDB API but is
        not endorsed or certified by TMDB.
      </p>
    </section>
  );
}
