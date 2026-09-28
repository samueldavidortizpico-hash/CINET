import { useEffect, useRef, useState } from "react";
import { usePrefersReducedMotion } from "../../hooks/usePrefersReducedMotion.js";

const ROLL_MS = 450;

function DiceIcon() {
  return (
    <svg className="dice-icon" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false">
      <rect x="3" y="3" width="18" height="18" rx="4.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
      {[
        [8, 8],
        [16, 8],
        [12, 12],
        [8, 16],
        [16, 16],
      ].map(([cx, cy]) => (
        <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="1.6" fill="currentColor" />
      ))}
    </svg>
  );
}

/**
 * 🎲 Botón de dado: animación breve (ninguna con movimiento reducido), estado de carga
 * y teclado nativo (es un <button>). `onRoll` elige; el botón solo da el feedback.
 */
export default function DiceButton({ onRoll, label = "Sorpréndeme", ariaLabel, compact = false, disabled = false, className = "" }) {
  const reduced = usePrefersReducedMotion();
  const [rolling, setRolling] = useState(false);
  const timer = useRef(null);

  useEffect(() => () => clearTimeout(timer.current), []);

  const roll = () => {
    if (rolling) return;
    setRolling(true);
    timer.current = setTimeout(() => {
      setRolling(false);
      onRoll();
    }, reduced ? 0 : ROLL_MS);
  };

  return (
    <button
      type="button"
      className={["dice-btn", compact && "dice-btn-compact", rolling && "is-rolling", className].filter(Boolean).join(" ")}
      aria-label={ariaLabel ?? label}
      aria-busy={rolling}
      title={compact ? (ariaLabel ?? label) : undefined}
      disabled={disabled}
      onClick={roll}
    >
      <DiceIcon />
      {!compact && <span>{rolling ? "Lanzando…" : label}</span>}
    </button>
  );
}
