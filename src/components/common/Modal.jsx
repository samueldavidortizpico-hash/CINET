import { useEffect, useRef } from "react";

const FOCUSABLE = "a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])";

/**
 * Modal accesible sobre <dialog> nativo (N12). showModal() vuelve INERTE todo lo de fuera: el foco
 * no puede salir al fondo con Tab/Shift+Tab, tampoco desde el iframe de un reproductor (cuyos
 * eventos de teclado no llegan a este documento, por eso un atrapado en JS no basta).
 * - Foco inicial: el primer control (el botón de cerrar), ya con el diálogo visible.
 * - Escape: evento nativo `cancel` → onClose (el estado lo controla React).
 * - Al cerrar: el foco vuelve al elemento que abrió el modal.
 * `prefix` elige las clases del diseño existente: "trailer" → .trailer-overlay / .trailer-dialog.
 * `onClose` debe ser estable (useCallback).
 */
export default function Modal({ open, onClose, prefix, label, labelledBy, children }) {
  const overlayRef = useRef(null);
  const dialogRef = useRef(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    const overlay = overlayRef.current;
    if (!open || !overlay) return undefined;
    const returnFocus = document.activeElement;
    if (!overlay.open) overlay.showModal?.();
    document.body.style.overflow = "hidden";
    (dialogRef.current.querySelector(FOCUSABLE) ?? dialogRef.current).focus();

    const onCancel = (event) => {
      event.preventDefault(); // React decide cerrar (y desmontar el reproductor)
      onCloseRef.current();
    };
    overlay.addEventListener("cancel", onCancel);
    return () => {
      overlay.removeEventListener("cancel", onCancel);
      if (overlay.open) overlay.close();
      document.body.style.overflow = "";
      if (returnFocus?.isConnected) returnFocus.focus();
    };
  }, [open]);

  return (
    <dialog
      ref={overlayRef}
      className={`modal-native ${prefix}-overlay${open ? " is-open" : ""}`}
      aria-label={label}
      aria-labelledby={labelledBy}
      onClick={(event) => event.target === event.currentTarget && onClose()}
    >
      <div className={`${prefix}-dialog`} ref={dialogRef} tabIndex={-1}>
        {children}
      </div>
    </dialog>
  );
}
