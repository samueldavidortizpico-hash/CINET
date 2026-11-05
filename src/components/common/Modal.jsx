import { useEffect, useRef } from "react";

const FOCUSABLE = "a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), iframe, [tabindex]:not([tabindex='-1'])";

function trapFocus(event, dialog) {
  const focusable = [...dialog.querySelectorAll(FOCUSABLE)].filter((el) => !el.disabled);
  if (!focusable.length) {
    event.preventDefault();
    dialog.focus();
    return;
  }
  const first = focusable[0];
  const last = focusable.at(-1);
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (event.shiftKey && (document.activeElement === dialog || !dialog.contains(document.activeElement))) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && (document.activeElement === last || !dialog.contains(document.activeElement))) {
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
    (dialogRef.current.querySelector(FOCUSABLE) ?? dialogRef.current).focus();

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
      <div className={`${prefix}-dialog`} ref={dialogRef} tabIndex={-1}>
        {children}
      </div>
    </div>
  );
}
