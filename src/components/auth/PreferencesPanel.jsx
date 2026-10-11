import { useState } from "react";
import Button from "../common/Button.jsx";
import TasteFields from "../duo/TasteFields.jsx";
import { PLATFORMS } from "../../data/platforms.js";
import { REGIONS } from "../../data/tmdb.js";
import { useAccountPreferences } from "../../hooks/useAccountPreferences.js";
import { useToast } from "../../hooks/useToast.js";
import { deleteMyPreferences, exportPreferences, saveMyPreferences } from "../../services/preferencesRepository.js";

const EMPTY = { region: "CO", providers: [], genres: [], rejectedGenres: [], maxRuntime: 0 };

function PreferencesForm({ initial, onSaved }) {
  const { showToast } = useToast();
  const [value, setValue] = useState({ ...EMPTY, ...initial });
  const [busy, setBusy] = useState(false);
  const toggleProvider = (id) =>
    setValue((current) => ({ ...current, providers: current.providers.includes(id) ? current.providers.filter((item) => item !== id) : [...current.providers, id] }));

  const act = async (action, message) => {
    setBusy(true);
    try {
      await action();
      showToast(message);
      onSaved();
    } catch (error) {
      showToast(error.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="account-prefs" onSubmit={(event) => { event.preventDefault(); act(() => saveMyPreferences(value), "✅ Gustos guardados"); }}>
      <h3>Mis gustos</h3>
      <p className="duo-fineprint">🔒 Solo tú los ves. Se usan como punto de partida al empezar Duo y al entrar a una sala; siempre puedes cambiarlos ahí.</p>
      <label className="duo-field duo-field-inline">
        <span>Región</span>
        <select value={value.region} onChange={(event) => setValue((current) => ({ ...current, region: event.target.value }))}>
          {REGIONS.map(({ code, name }) => <option key={code} value={code}>{name}</option>)}
        </select>
      </label>
      <fieldset className="duo-fieldset">
        <legend>Mis plataformas</legend>
        <div className="duo-chips">
          {PLATFORMS.map((platform) => (
            <label key={platform.id} className="duo-chip">
              <input type="checkbox" checked={value.providers.includes(platform.id)} onChange={() => toggleProvider(platform.id)} />
              <span>{platform.name}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <TasteFields value={value} onChange={setValue} />
      <div className="plan-actions">
        <Button variant="primary" type="submit" disabled={busy}>Guardar mis gustos</Button>
        {initial && <Button variant="secondary" disabled={busy} onClick={() => exportPreferences(initial)}>Descargar (.json)</Button>}
        {initial && (
          <Button variant="secondary" disabled={busy} onClick={() => window.confirm("¿Borrar tus gustos guardados?") && act(deleteMyPreferences, "🗑️ Gustos borrados")}>
            Borrar mis gustos
          </Button>
        )}
      </div>
    </form>
  );
}

/** Gustos privados de la cuenta: editar, descargar y borrar. */
export default function PreferencesPanel() {
  const { prefs, loading, error, reload, available } = useAccountPreferences();
  if (!available) return null;
  if (loading) return <p className="plan-note">Cargando tus gustos…</p>;
  if (error) return <p className="error-message" role="alert">{error.message}</p>;
  // key: al guardar o borrar, el formulario parte de lo que quedó en el servidor.
  return <PreferencesForm key={prefs?.updatedAt ?? "empty"} initial={prefs} onSaved={reload} />;
}
