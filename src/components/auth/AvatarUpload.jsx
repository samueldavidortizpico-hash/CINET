import { useEffect, useRef, useState } from "react";
import Button from "../common/Button.jsx";
import { useAuth } from "../../hooks/useAuth.js";
import { AVATAR_ACCEPT, avatarFileError } from "../../services/avatarService.js";

export default function AvatarUpload({ disabled, onBusyChange }) {
  const { saveAvatar } = useAuth();
  const input = useRef(null);
  const uploading = useRef(false);
  const [selection, setSelection] = useState(null);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (!selection) return undefined;
    return () => URL.revokeObjectURL(selection.url);
  }, [selection]);

  const choose = (event) => {
    const file = event.target.files?.[0];
    event.target.value = ""; // Permite volver a elegir el mismo archivo tras un error.
    if (!file) return;
    setNotice("");
    setReady(false);
    setSelection(null);
    const issue = avatarFileError(file);
    setError(issue);
    if (!issue) {
      try {
        setSelection({ file, url: URL.createObjectURL(file) });
      } catch {
        setError("No pudimos preparar la vista previa. Vuelve a seleccionar la foto.");
      }
    }
  };

  const save = async () => {
    if (!selection || !ready || disabled || uploading.current) return;
    uploading.current = true;
    setBusy(true);
    onBusyChange(true);
    setError("");
    setNotice("");
    try {
      const result = await saveAvatar(selection.file);
      setSelection(null);
      setNotice("Foto actualizada.");
      setError(result.warning);
    } catch (failure) {
      setError(failure.message || "No pudimos actualizar la foto. Inténtalo de nuevo.");
    } finally {
      uploading.current = false;
      setBusy(false);
      onBusyChange(false);
    }
  };

  return (
    <div className="avatar-upload" role="group" aria-label="Foto de perfil" aria-busy={busy}>
      <p className="avatar-upload-label">Foto de perfil</p>
      <input ref={input} className="visually-hidden" id="profile-avatar-file" type="file" accept={AVATAR_ACCEPT} onChange={choose} disabled={disabled || busy} aria-label="Seleccionar foto de perfil" aria-describedby="profile-avatar-hint" />
      <div className="avatar-upload-actions">
        <Button variant="secondary" onClick={() => input.current?.click()} disabled={disabled || busy}>Cambiar foto</Button>
        {selection && <Button variant="primary" onClick={save} disabled={disabled || busy || !ready}>{busy ? "Actualizando foto…" : "Guardar foto"}</Button>}
        {selection && <Button variant="secondary" disabled={disabled || busy} onClick={() => { setSelection(null); setError(""); setNotice(""); }}>Cancelar</Button>}
      </div>
      <p className="profile-hint" id="profile-avatar-hint">JPEG, PNG o WebP · Máximo 5 MB. La foto será pública.</p>
      {selection && (
        <figure className="avatar-preview">
          <img key={selection.url} src={selection.url} alt="Vista previa de tu nueva foto" onLoad={() => setReady(true)} onError={() => { setReady(false); setError("No se pudo leer esta imagen. Selecciona otra foto."); }} />
          <figcaption>{selection.file.name} · {busy ? "Subiendo y guardando…" : "Vista previa; aún no guardada"}</figcaption>
        </figure>
      )}
      <p className="profile-hint" role="status">{busy ? "Actualizando tu foto…" : notice}</p>
      {error && <p className="form-error" role="alert">{error}</p>}
    </div>
  );
}
