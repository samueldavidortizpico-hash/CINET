import { useEffect, useRef, useState } from "react";
import Button from "../common/Button.jsx";
import PosterImage from "../common/PosterImage.jsx";
import { SeatAvatar } from "./DuoSeats.jsx";
import { VOTES } from "../../data/duo.js";
import { usePrefersReducedMotion } from "../../hooks/usePrefersReducedMotion.js";
import { tallyVotes } from "../../services/duoService.js";
import { titleMeta } from "../../services/recommender.js";
import { fallbackPoster } from "../../utils/poster.js";

const ROUND_SIZE = 8;
const LEAVE_MS = 240;
const KEYS = { ArrowRight: "yes", ArrowLeft: "no", ArrowDown: "later", ArrowUp: "later" };
const icon = (key) => VOTES.find((vote) => vote.key === key)?.icon ?? "·";

/**
 * Ronda de votación "pásale el celular": cada persona vota en secreto las mismas opciones
 * (← no · ↓ quizá · → sí) y al final se revelan los votos, los match y la más votada.
 * <dialog> nativo: foco atrapado y Esc para salir. Se monta al abrir, así cada ronda empieza de cero.
 */
export default function DuoVoteRound({ items, names, votes, onVote, onChoose, onClose }) {
  const ref = useRef(null);
  const timer = useRef(null);
  const reduced = usePrefersReducedMotion();
  const size = names.length;
  // Baraja fija durante la ronda: un rechazo de todos o el aprendizaje por votos reordenan el tablero,
  // y cada persona debe votar exactamente las mismas opciones.
  const [deck] = useState(() => items.slice(0, ROUND_SIZE));
  const [person, setPerson] = useState(0);
  const [card, setCard] = useState(0);
  const [phase, setPhase] = useState(size > 1 ? "handoff" : "vote");
  const [leaving, setLeaving] = useState(null);

  useEffect(() => {
    ref.current?.showModal();
    return () => clearTimeout(timer.current);
  }, []);

  const cast = (choice) => {
    if (leaving || phase !== "vote") return;
    const { title } = deck[card];
    if ((votes[title.id]?.[person] ?? null) !== choice) onVote(title, person, choice);
    setLeaving(choice);
    timer.current = setTimeout(
      () => {
        setLeaving(null);
        if (card + 1 < deck.length) setCard(card + 1);
        else if (person + 1 < size) {
          setPerson(person + 1);
          setCard(0);
          setPhase("handoff");
        } else setPhase("results");
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
  const rows = phase === "results" ? tallyVotes(deck, votes, size) : [];
  const matches = rows.filter((row) => row.match);
  const top = rows[0];

  return (
    <dialog ref={ref} className="duo-round" aria-labelledby="duo-round-title" onClose={onClose}>
      <div className="duo-round-head">
        <h2 id="duo-round-title">{phase === "results" ? "Resultados de la ronda" : size > 1 ? "Ronda de votación" : "Modo rápido"}</h2>
        <button type="button" className="duo-dialog-close" aria-label="Cerrar la ronda" onClick={onClose}>
          ✕
        </button>
      </div>

      {phase === "handoff" && (
        <section className="duo-round-handoff" aria-live="polite">
          <SeatAvatar index={person} name={names[person]} className="is-xl" />
          <p className="duo-overline">{person === 0 ? "EMPIEZA" : "PÁSALE EL CELULAR"}</p>
          <h3>Turno de {names[person]}</h3>
          <p>{deck.length} opciones. Vota en secreto: nadie ve los votos hasta el final.</p>
          <Button variant="primary" className="duo-cta" autoFocus onClick={() => setPhase("vote")}>
            Listo, a votar
          </Button>
          <ol className="duo-round-queue" aria-label="Orden de votación">
            {names.map((name, index) => (
              <li key={index} data-state={index < person ? "done" : index === person ? "now" : "next"}>
                <SeatAvatar index={index} name={name} />
                <span className="visually-hidden">{name}</span>
              </li>
            ))}
          </ol>
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
          <article key={current.title.id} className="duo-round-card" data-leaving={leaving ?? undefined} tabIndex={-1} autoFocus aria-label={`${card + 1} de ${deck.length}: ${current.title.title}`}>
            <div className="duo-round-poster">
              <PosterImage src={current.title.poster} alt="" fallback={<img src={fallbackPoster(current.title)} alt="" />} />
            </div>
            <div className="duo-round-info">
              <h3>{current.title.title}</h3>
              <p className="duo-card-meta">
                {titleMeta(current.title)}
                {current.title.rating > 0 && <span className="duo-rating"> ★ {current.title.rating}</span>}
              </p>
              <p className="duo-why">{current.reasons[0]}</p>
            </div>
          </article>
          <div className="duo-round-actions">
            {[...VOTES].reverse().map((vote) => (
              <button key={vote.key} type="button" className="duo-round-btn" data-vote={vote.key} onClick={() => cast(vote.key)}>
                <span aria-hidden="true">{vote.icon}</span>
                {vote.label}
              </button>
            ))}
          </div>
          <p className="duo-fineprint duo-round-keys">Teclado: ← no · ↓ quizá · → sí</p>
        </section>
      )}

      {phase === "results" && top && (
        <section className="duo-round-results" aria-live="polite">
          <div className={`duo-round-winner${top.match ? " is-match" : ""}`}>
            <div className="duo-round-poster">
              <PosterImage src={top.item.title.poster} alt="" fallback={<img src={fallbackPoster(top.item.title)} alt="" />} />
            </div>
            <div>
              <p className="duo-overline">{top.match ? (size > 1 ? "💞 ¡MATCH! TODOS DIJERON SÍ" : "💞 TU FAVORITA") : "LA MÁS VOTADA"}</p>
              <h3>{top.item.title.title}</h3>
              <p className="duo-card-meta">{titleMeta(top.item.title)}</p>
              {matches.length > 1 && <p className="duo-fineprint">Hay {matches.length} match. Elijan uno de la lista.</p>}
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
                    <span key={index} className="vote-chip" title={`${names[index]}: ${VOTES.find((option) => option.key === vote)?.label ?? "sin voto"}`}>
                      <SeatAvatar index={index} name={names[index]} />
                      <span className="vote-chip-mark" aria-hidden="true">{icon(vote)}</span>
                      <span className="visually-hidden">{`${names[index]}: ${VOTES.find((option) => option.key === vote)?.label ?? "sin voto"}`}</span>
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
            <Button variant="secondary" onClick={onClose}>
              Volver a las recomendaciones
            </Button>
          </div>
        </section>
      )}
    </dialog>
  );
}
