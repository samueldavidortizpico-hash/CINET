import { seatColor, VOTES } from "../../data/duo.js";
import { genreName, listEs } from "../../services/recommender.js";

/** Butaca de una persona: su inicial sobre su color, igual en todo Duo. */
export function SeatAvatar({ index, name, className = "" }) {
  return (
    <span className={`seat-avatar ${className}`.trim()} style={{ "--seat": seatColor(index) }} aria-hidden="true">
      {(name || "?").trim().slice(0, 1).toUpperCase()}
    </span>
  );
}

/** Qué de sus gustos toca el título ("comedia y su tono"). */
function hitText(seat) {
  const parts = [seat.genres.length && listEs(seat.genres.map(genreName)), seat.tone.length && "su tono", seat.cast.length && listEs(seat.cast)];
  return listEs(parts.filter(Boolean));
}

const short = (seat) => (!seat.expressed ? "le vale cualquiera" : seat.pleased ? hitText(seat) : seat.tone.length ? "solo el tono" : "no es lo suyo");
const fitState = (seat) => (!seat ? "open" : !seat.expressed ? "open" : seat.pleased ? "lit" : seat.tone.length ? "dim" : "off");

/**
 * Butacas iluminadas: a quién le encaja el título y por qué (datos verificables de scoreTitle.seats).
 * detailed: nombre y motivo junto a cada butaca (tarjeta principal).
 */
export function SeatFit({ seats, detailed = false }) {
  const state = fitState;

  return (
    <ul className={`seat-fit${detailed ? " is-detailed" : ""}`} aria-label="Para quién encaja">
      {seats.map((seat, index) => (
        <li key={index} data-state={state(seat)} title={`${seat.name}: ${short(seat)}`}>
          <SeatAvatar index={index} name={seat.name} />
          {detailed ? (
            <span className="seat-fit-text">
              <strong>{seat.name}</strong>
              <small>{short(seat)}</small>
            </span>
          ) : (
            <span className="visually-hidden">{`${seat.name}: ${short(seat)}`}</span>
          )}
        </li>
      ))}
    </ul>
  );
}

const ORDER = [null, "yes", "later", "no"];
const voteLabel = (key) => VOTES.find((vote) => vote.key === key)?.label.toLowerCase() ?? "sin voto";
const voteIcon = (key) => VOTES.find((vote) => vote.key === key)?.icon ?? "";

/**
 * Butacas de la tarjeta compacta: iluminada = le encaja (seats); la marca = su voto.
 * Cada toque pasa a sí → quizá → no → sin voto. onVote(person, choice) usa setVote, que quita
 * el voto si se repite: para "sin voto" se envía el actual.
 */
export function VoteSeats({ names, votes = [], seats = [], onVote }) {
  return (
    <div className="vote-seats" role="group" aria-label="A quién le encaja y votos">
      {names.map((name, person) => {
        const current = votes[person] ?? null;
        const next = ORDER[(ORDER.indexOf(current) + 1) % ORDER.length];
        return (
          <button
            key={person}
            type="button"
            className="vote-seat"
            data-vote={current ?? "none"}
            data-fit={fitState(seats[person])}
            aria-label={`${name}${seats[person] ? ` (${short(seats[person])})` : ""}: ${voteLabel(current)}. Cambiar a ${voteLabel(next)}`}
            title={`${name}${seats[person] ? ` · ${short(seats[person])}` : ""} · voto: ${voteLabel(current)}`}
            onClick={() => onVote(person, next ?? current)}
          >
            <SeatAvatar index={person} name={name} />
            <span className="vote-seat-mark" aria-hidden="true">{voteIcon(current)}</span>
          </button>
        );
      })}
    </div>
  );
}

/** Votos explícitos (tarjeta principal): por persona, sí / quizá / no siempre visibles. */
export function VoteGrid({ names, votes = [], onVote }) {
  return (
    <div className="vote-grid">
      {names.map((name, person) => (
        <div key={person} className="vote-row" role="group" aria-label={`Voto de ${name}`}>
          <SeatAvatar index={person} name={name} />
          <span className="vote-name">{name}</span>
          <span className="vote-options">
            {VOTES.map((vote) => (
              <button
                key={vote.key}
                type="button"
                className="vote-option"
                data-vote={vote.key}
                aria-pressed={votes[person] === vote.key}
                aria-label={`${name}: ${vote.label}`}
                title={vote.label}
                onClick={() => onVote(person, vote.key)}
              >
                <span aria-hidden="true">{vote.icon}</span>
              </button>
            ))}
          </span>
        </div>
      ))}
    </div>
  );
}
