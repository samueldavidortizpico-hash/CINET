import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { excludedGroups, restoreTitle } from "../../services/historyService.js";

function Group({ label, items, action }) {
  if (!items.length) return null;
  return (
    <section className="duo-history-group">
      <h3>
        {label} <span>{items.length}</span>
      </h3>
      <ul>
        {items.map((item) => (
          <li key={item.id}>
            <span>
              {item.title}
              {item.year ? ` (${item.year})` : ""}
            </span>
            {action && (
              <button type="button" className="duo-link" aria-label={`${action.label}: ${item.title}`} onClick={() => action.run(item.id)}>
                {action.label}
              </button>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

/** "Ver títulos excluidos": recuperar uno a uno o reiniciar todo el historial. <dialog> nativo (Esc, foco). */
export default function DuoHistoryDialog({ open, onClose, history, onHistory, onReset, session, onSession, lookup, favoritesCount }) {
  const ref = useRef(null);

  useEffect(() => {
    const dialog = ref.current;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  const groups = excludedGroups(history);
  const describe = (id) => ({ id, title: lookup.get(id)?.title ?? history.titles[id]?.title ?? "Título sin datos", year: lookup.get(id)?.year });
  const removed = session.removed.map(describe);
  const marathon = (session.marathonPlan?.entries ?? []).map((entry) => describe(entry.id));
  const total = groups.reduce((sum, group) => sum + group.items.length, 0) + removed.length;
  const restore = { label: "Recuperar", run: (id) => onHistory((current) => restoreTitle(current, id)) };

  const reset = () => {
    if (window.confirm("¿Reiniciar el historial? Vistas, rechazadas y «no me interesa» volverán a recomendarse.")) onReset();
  };

  return (
    <dialog ref={ref} className="duo-dialog" aria-labelledby="duo-history-title" onClose={onClose}>
      <div className="duo-dialog-head">
        <h2 id="duo-history-title">Títulos excluidos</h2>
        <button type="button" className="duo-dialog-close" aria-label="Cerrar" onClick={onClose}>
          ✕
        </button>
      </div>
      <p className="duo-fineprint">Nunca se recomiendan automáticamente. Si cambian de opinión, recupérenlos.</p>

      {total === 0 && <p className="duo-lead">No hay títulos excluidos.</p>}
      {groups.map((group) => (
        <Group key={group.key} label={group.label} items={group.items} action={restore} />
      ))}
      <Group
        label="Quitados de esta sesión"
        items={removed}
        action={{ label: "Devolver", run: (id) => onSession((current) => ({ removed: current.removed.filter((item) => item !== id) })) }}
      />
      <Group label="En la maratón activa" items={marathon} />

      <p className="duo-fineprint">
        {history.recent.length} recomendados hace poco: no se excluyen, solo bajan de puesto para que no se repitan. Guardados en favoritos:{" "}
        {favoritesCount} (<Link to="/profile">ver perfil</Link>).
      </p>
      <div className="duo-actions">
        <button type="button" className="btn btn-secondary" onClick={reset}>
          Reiniciar historial
        </button>
        <button type="button" className="btn btn-primary" onClick={onClose}>
          Listo
        </button>
      </div>
    </dialog>
  );
}
