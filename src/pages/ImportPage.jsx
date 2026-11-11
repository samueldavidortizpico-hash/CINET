import { useState } from "react";
import { Link } from "react-router-dom";
import Button from "../components/common/Button.jsx";
import { useDocumentTitle } from "../hooks/useDocumentTitle.js";
import { useDuoHistory } from "../hooks/useDuoHistory.js";
import { applyImport, catalogMatchers, CSV_LIMITS, matchEntries, readCsv } from "../services/csvImport.js";

const FORMAT_NAMES = { letterboxd: "Letterboxd", imdb: "IMDb" };
const label = (title) => `${title.title}${title.year ? ` (${String(title.year).slice(0, 4)})` : ""}`;

/** /importar — lo que ya viste en Letterboxd o IMDb pasa a «Ya vistas» de Duo (no te lo volverá a proponer). */
export default function ImportPage() {
  const { history, change } = useDuoHistory();
  const [file, setFile] = useState(null); // { name, format, entries }
  const [start, setStart] = useState(0);
  const [state, setState] = useState({ step: "pick", error: "", progress: [0, 0], results: [], summary: null });
  const [choices, setChoices] = useState({});
  useDocumentTitle("Importar lo que ya viste");

  const batch = file ? file.entries.slice(start, start + CSV_LIMITS.batch) : [];

  const pick = async (event) => {
    const chosen = event.target.files?.[0];
    if (!chosen) return;
    if (chosen.size > CSV_LIMITS.maxBytes) {
      setState({ step: "pick", error: "El archivo pesa más de 2 MB.", progress: [0, 0], results: [], summary: null });
      return;
    }
    try {
      setFile({ name: chosen.name, ...readCsv(await chosen.text()) });
      setStart(0);
      setState({ step: "ready", error: "", progress: [0, 0], results: [], summary: null });
    } catch (error) {
      setFile(null);
      setState({ step: "pick", error: error.message, progress: [0, 0], results: [], summary: null });
    }
  };

  const match = async () => {
    setState((current) => ({ ...current, step: "matching", progress: [0, batch.length] }));
    const results = await matchEntries(batch, {
      ...(await catalogMatchers()),
      onProgress: (done, total) => setState((current) => ({ ...current, progress: [done, total] })),
    });
    setChoices({});
    setState((current) => ({ ...current, step: "review", results }));
  };

  const apply = () => {
    const result = applyImport(history, state.results, choices);
    change(() => result.history);
    setState((current) => ({ ...current, step: "done", summary: result }));
  };

  const groups = {
    matched: state.results.filter((result) => result.status === "matched"),
    ambiguous: state.results.map((result, index) => ({ result, index })).filter(({ result }) => result.status === "ambiguous"),
    missing: state.results.filter((result) => result.status === "missing"),
  };
  const toAdd = groups.matched.length + Object.values(choices).filter(Boolean).length;
  const remaining = file ? file.entries.length - (start + batch.length) : 0;

  return (
    <div className="duo-page room-page import-page">
      <div className="duo-container">
        <Link to="/profile" className="back-link">← Mi perfil</Link>
        <header className="room-intro">
          <span className="duo-badge">CINET · IMPORTAR</span>
          <h1>Lo que ya viste, sin volver a marcarlo</h1>
          <p className="duo-lead">
            Sube el CSV que exportas de Letterboxd (watched.csv o ratings.csv) o de IMDb (ratings.csv). Lo que coincida pasa a «Ya vistas» y Duo no te lo volverá a proponer.
          </p>
          <p className="duo-fineprint">
            🔒 El archivo se lee en este navegador; no lo subimos. Para encontrar cada película consultamos su título y año (o su id de IMDb) en el catálogo. No pedimos contraseñas de otros servicios.
          </p>
        </header>

        <section className="room-card">
          <label className="duo-field">
            <span>Archivo CSV (máx. 2 MB)</span>
            <input type="file" accept=".csv,text/csv" onChange={pick} />
          </label>
          {state.error && <p className="error-message" role="alert">{state.error}</p>}
          {file && (
            <p>
              <strong>{file.name}</strong>: {file.entries.length} títulos de {FORMAT_NAMES[file.format]}.
              {file.entries.length > CSV_LIMITS.batch && ` Se buscan de ${CSV_LIMITS.batch} en ${CSV_LIMITS.batch}.`}
            </p>
          )}
          {state.step === "ready" && (
            <Button variant="primary" onClick={match}>
              Buscar {batch.length} {batch.length === 1 ? "título" : "títulos"}{start ? ` (desde el ${start + 1})` : ""}
            </Button>
          )}
          {state.step === "matching" && (
            <p role="status">
              Buscando… <progress max={state.progress[1]} value={state.progress[0]} aria-label="Progreso de la búsqueda" /> {state.progress[0]}/{state.progress[1]}
            </p>
          )}
        </section>

        {state.step === "review" && (
          <section className="room-card import-review" aria-labelledby="import-review-title">
            <h2 id="import-review-title">
              {groups.matched.length} coinciden · {groups.ambiguous.length} por elegir · {groups.missing.length} sin encontrar
            </h2>
            {groups.ambiguous.length > 0 && (
              <>
                <p>Estas tienen varias opciones. Elige la correcta o déjala fuera; no adivinamos por ti.</p>
                {groups.ambiguous.map(({ result, index }) => (
                  <fieldset key={index} className="duo-fieldset import-choice">
                    <legend>{label(result.entry)}</legend>
                    <div className="duo-chips">
                      {result.options.map((option) => (
                        <label key={option.id} className="duo-chip">
                          <input type="radio" name={`import-${index}`} checked={choices[index] === option.id} onChange={() => setChoices((current) => ({ ...current, [index]: option.id }))} />
                          <span>{label(option)}</span>
                        </label>
                      ))}
                      <label className="duo-chip">
                        <input type="radio" name={`import-${index}`} checked={!choices[index]} onChange={() => setChoices((current) => ({ ...current, [index]: null }))} />
                        <span>Ninguna</span>
                      </label>
                    </div>
                  </fieldset>
                ))}
              </>
            )}
            {groups.matched.length > 0 && (
              <details>
                <summary>Ver las {groups.matched.length} que coinciden</summary>
                <ul className="import-list">{groups.matched.map((result) => <li key={result.match.id}>{label(result.entry)} → {label(result.match)}</li>)}</ul>
              </details>
            )}
            {groups.missing.length > 0 && (
              <details>
                <summary>Ver las {groups.missing.length} que no encontramos</summary>
                <ul className="import-list">{groups.missing.map((result, index) => <li key={index}>{label(result.entry)}{result.failed ? " · no pudimos consultar el catálogo" : ""}</li>)}</ul>
              </details>
            )}
            <div className="plan-actions">
              <Button variant="primary" disabled={!toAdd} onClick={apply}>Añadir {toAdd} a «Ya vistas»</Button>
            </div>
          </section>
        )}

        {state.step === "done" && state.summary && (
          <section className="room-card" role="status">
            <h2>
              Listo: {state.summary.added} {state.summary.added === 1 ? "título nuevo" : "títulos nuevos"} en «Ya vistas»
              {state.summary.already ? ` (${state.summary.already} ya estaban)` : ""}.
            </h2>
            <p>Puedes revisarlos o quitarlos en el historial de Duo.</p>
            <div className="plan-actions">
              <Button variant="primary" to="/duo">Ir a Duo</Button>
              {remaining > 0 && (
                <Button variant="secondary" onClick={() => { setStart(start + batch.length); setState((current) => ({ ...current, step: "ready", results: [], summary: null })); }}>
                  Seguir con los {Math.min(remaining, CSV_LIMITS.batch)} siguientes
                </Button>
              )}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
