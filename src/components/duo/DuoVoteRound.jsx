import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import Button from "../common/Button.jsx";
import PosterImage from "../common/PosterImage.jsx";
import { SeatAvatar } from "./DuoSeats.jsx";
import { VOTES } from "../../data/duo.js";
import { usePrefersReducedMotion } from "../../hooks/usePrefersReducedMotion.js";
import { tallyVotes } from "../../services/duoService.js";
import { titleMeta } from "../../services/recommender.js";
import { fallbackPoster } from "../../utils/poster.js";

const LEAVE_MS = 200;
const KEYS = { ArrowRight: "yes", ArrowLeft: "no", ArrowDown: "later", ArrowUp: "later" };
const voteOf = (key) => VOTES.find((vote) => vote.key === key);

/**
 * Escena 5 · Decidir juntos, "pásale el celular": cada persona vota en secreto la MISMA baraja
 * (← no · ↓ quizá · → sí). La ronda vive en la sesión (round): recargar la retoma donde iba y
 * una ronda nueva empieza sin votos. El resultado se calcula antes de la revelación, que es breve
 * y se puede omitir (con movimiento reducido no hay revelación).
 */
export default function DuoVoteRound({ round, items, names, onRound, onComplete, onChoose, onNewRound, onClose }) {
  const ref = useRef(null);
  const timer = useRef(null);
  const reduced = usePrefersReducedMotion();
  const [leaving, setLeaving] = useState(null);
  const size = round.size;
  const deck = round.deck.map((id) => items.get(id)).filter(Boolean);
  const { person, card, phase } = round;

  useEffect(() => {
    ref.current?.showModal();
    return () => clearTimeout(timer.current);
  }, []);

  const finish = (votes) => {
    const rows = tallyVotes(deck, votes, size);
    onRound({ votes, phase: reduced ? "results" : "reveal", result: rows[0]?.item.title.id ?? null });
    onComplete(votes, rows);
  };

  const cast = (choice) => {
    if (leaving || phase !== "vote" || !deck[card]) return;
    const { id } = deck[card].title;
    const list = Array.from({ length: size }, (_, index) => round.votes[id]?.[index] ?? null);
    list[person] = choice;
    const votes = { ...round.votes, [id]: list };
    onRound({ votes }); // el voto queda guardado al instante; avanzar es solo presentación
    setLeaving(choice);
    timer.current = setTimeout(
      () => {
        setLeaving(null);
        if (card + 1 < deck.length) onRound({ card: card + 1 });
        else if (person + 1 < size) onRound({ person: person + 1, card: 0, phase: "handoff" });
        else finish(votes);
      },
      reduced ? 0 : LEAVE_MS
    );
  };

  // Teclado en window: al cambiar de fase el botón pulsado desaparece y el foco puede salir del diálogo.
  const castRef = useRef(cast);
  useEffect(() => {
    castRef.current = cast;
  });
  useEffect(() => {
    if (phase !== "vote") return undefined;
    const onKey = (event) => {
      if (!KEYS[event.key]) return;
      event.preventDefault();
      castRef.current(KEYS[event.key]);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase]);

  const current = deck[card];
  const rows = phase === "results" || phase === "reveal" ? tallyVotes(deck, round.votes, size) : [];
  const matches = rows.filter((row) => row.match);
  const top = rows[0];
  const anyPoints = rows.some((row) => row.points > 0);

  return (
    <dialog ref={ref} className="duo-round" aria-labelledby="duo-round-title" onClose={onClose}>
      <div className="duo-round-head">
        <h2 id="duo-round-title">{phase === "results" || phase === "reveal" ? "Resultado de la ronda" : size > 1 ? "Decidir juntos" : "Modo rápido"}</h2>
        <button type="button" className="duo-dialog-close" aria-label="Pausar y cerrar la ronda" onClick={() => ref.current?.close()}>
          ✕
        </button>
      </div>

      {phase === "handoff" && (
        <section className="duo-round-handoff" aria-live="polite">
          <SeatAvatar index={person} name={names[person]} className="is-xl" />
          <p className="duo-overline">{person === 0 ? "EMPIEZA" : "PÁSALE EL CELULAR"}</p>
          <h3>Turno de {names[person]}</h3>
          <p>{deck.length} opciones, las mismas para todos. Vota sin que miren: los votos se muestran al final.</p>
          <Button variant="primary" className="duo-cta" autoFocus onClick={() => onRound({ phase: "vote" })}>
            Listo, a votar
          </Button>
          <ol className="duo-round-queue" aria-label="Orden de votación">
            {names.slice(0, size).map((name, index) => (
              <li key={index} data-state={index < person ? "done" : index === person ? "now" : "next"}>
                <SeatAvatar index={index} name={name} />
                <span className="visually-hidden">{`${name}: ${index < person ? "ya votó" : index === person ? "su turno" : "después"}`}</span>
              </li>
            ))}
          </ol>
          <p className="duo-fineprint">
            Los votos quedan en este teléfono; ocultarlos en pantalla no es privacidad entre cuentas. ¿Cada quien en su celular? <Link to="/duo/sala">Abran una sala</Link>.
          </p>
        </section>
      )}

      {phase === "vote" && current && (
        <section className="duo-round-vote">
          <div className="duo-round-who">
            <SeatAvatar index={person} name={names[person]} />
            <span>{size > 1 ? `Vota ${names[person]}` : "¿Te apetece?"}</span>
            <span className="duo-round-count">
              {card + 1} / {deck.length}
            </span>
          </div>
          <div className="duo-round-track" aria-hidden="true">
            <span style={{ "--progress": (card + 1) / deck.length }} />
          </div>
          <article key={`${person}-${current.title.id}`} className="duo-round-card" data-leaving={leaving ?? undefined} tabIndex={-1} aria-label={`${card + 1} de ${deck.length}: ${current.title.title}`}>
            <div className="duo-round-poster">
              <PosterImage src={current.title.poster} alt="" fallback={<img src={fallbackPoster(current.title)} alt="" />} />
            </div>
            <div className="duo-round-info">
              <h3>{current.title.title}</h3>
              <p className="duo-card-meta">
                {titleMeta(current.title)}
                {current.title.rating > 0 && <span className="duo-rating"> ★ {current.title.rating}</span>}
              </p>
              {current.reasons?.[0] && <p className="duo-why">{current.reasons[0]}</p>}
            </div>
          </article>
          <div className="duo-round-actions">
            {[...VOTES].reverse().map((vote) => (
              <button key={vote.key} type="button" className="duo-round-btn" data-vote={vote.key} aria-pressed={round.votes[current.title.id]?.[person] === vote.key} onClick={() => cast(vote.key)}>
                <span aria-hidden="true">{vote.icon}</span>
                {vote.label}
              </button>
            ))}
          </div>
          <p className="duo-fineprint duo-round-keys">Teclado: ← no · ↓ quizá · → sí</p>
        </section>
      )}

      {phase === "reveal" && top && (
        <section className="duo-reveal" aria-live="polite">
          <div className="duo-reveal-stage" onAnimationEnd={(event) => event.target === event.currentTarget && onRound({ phase: "results" })}>
            <span className="duo-reveal-light" aria-hidden="true" />
            <div className="duo-round-poster">
              <PosterImage src={top.item.title.poster} alt="" fallback={<img src={fallbackPoster(top.item.title)} alt="" />} />
            </div>
          </div>
          <Button variant="secondary" autoFocus onClick={() => onRound({ phase: "results" })}>
            Ver resultado
          </Button>
        </section>
      )}

      {phase === "results" && top && (
        <section className="duo-round-results" aria-live="polite">
          <div className={`duo-round-winner${top.match ? " is-match" : ""}`}>
            <div className="duo-round-poster">
              <PosterImage src={top.item.title.poster} alt="" fallback={<img src={fallbackPoster(top.item.title)} alt="" />} />
            </div>
            <div>
              <p className="duo-overline">{top.match ? (size > 1 ? "💞 ¡MATCH! TODOS DIJERON SÍ" : "💞 TU FAVORITA") : anyPoints ? "LA MÁS VOTADA · SIN UNANIMIDAD" : "SIN COINCIDENCIA"}</p>
              <h3>{top.item.title.title}</h3>
              <p className="duo-card-meta">{titleMeta(top.item.title)}</p>
              {matches.length > 1 && <p className="duo-fineprint">Hay {matches.length} con «sí» de todos: el empate lo resuelve el orden de recomendación. Pueden elegir otra de la lista.</p>}
              {!top.match && size > 1 && <p className="duo-fineprint">No es un consenso: es la que sumó más puntos (sí 2, quizá 1, no 0).</p>}
              <Button variant="primary" className="duo-cta" autoFocus onClick={() => onChoose(top.item.title.id)}>
                Elegir «{top.item.title.title}»
              </Button>
            </div>
          </div>
          <ol className="duo-round-board">
            {rows.map(({ item, list, points, match }) => (
              <li key={item.title.id} className={match ? "is-match" : undefined}>
                <span className="duo-round-board-title">{item.title.title}</span>
                <span className="duo-round-board-votes">
                  {list.map((vote, index) => (
                    <span key={index} className="vote-chip" title={`${names[index]}: ${voteOf(vote)?.label ?? "sin voto"}`}>
                      <SeatAvatar index={index} name={names[index]} />
                      <span className="vote-chip-mark" aria-hidden="true">
                        {voteOf(vote)?.icon ?? "·"}
                      </span>
                      <span className="visually-hidden">{`${names[index]}: ${voteOf(vote)?.label ?? "sin voto"}`}</span>
                    </span>
                  ))}
                </span>
                <span className="duo-round-points">{points} pts</span>
                <button type="button" className="duo-link" onClick={() => onChoose(item.title.id)}>
                  Elegir
                </button>
              </li>
            ))}
          </ol>
          <div className="duo-actions">
            <Button variant="secondary" onClick={onNewRound}>
              Otra ronda (sin estos votos)
            </Button>
            <Button variant="secondary" onClick={() => ref.current?.close()}>
              Volver a las finalistas
            </Button>
          </div>
        </section>
      )}
    </dialog>
  );
}
