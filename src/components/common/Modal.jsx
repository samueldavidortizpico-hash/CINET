import { useEffect, useRef } from "react";

const FOCUSABLE = "button, [href], [tabindex]:not([tabindex='-1'])";

function trapFocus(event, dialog) {
  const focusable = [...dialog.querySelectorAll(FOCUSABLE)].filter((el) => !el.disabled);
  if (!focusable.length) return;
  const first = focusable[0];
  const last = focusable.at(-1);
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

/**
 * Modal accesible reutilizable. `prefix` elige las clases del diseño
 * existente: "trailer" → .trailer-overlay / .trailer-dialog.
 * `onClose` debe ser estable (useCallback).
 */
export default function Modal({ open, onClose, prefix, label, labelledBy, children }) {
  const dialogRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const returnFocus = document.activeElement;

    const onKeyDown = (event) => {
      if (event.key === "Escape") onClose();
      if (event.key === "Tab") trapFocus(event, dialogRef.current);
    };

    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    dialogRef.current.querySelector("button")?.focus();

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
      returnFocus?.focus();
    };
  }, [open, onClose]);

  return (
    <div
      className={`${prefix}-overlay${open ? " is-open" : ""}`}
      role="dialog"
      aria-modal="true"
      aria-label={label}
      aria-labelledby={labelledBy}
      aria-hidden={!open}
      inert={!open}
      onClick={(event) => event.target === event.currentTarget && onClose()}
    >
      <div className={`${prefix}-dialog`} ref={dialogRef}>
        {children}
      </div>
    </div>
  );
}
