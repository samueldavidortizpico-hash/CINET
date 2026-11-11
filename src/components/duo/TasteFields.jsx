import { Chip, Question } from "./DuoFields.jsx";
import { RUNTIME_OPTIONS } from "../../data/duo.js";
import { GENRES } from "../../data/tmdb.js";

/** Un género va en «me apetece» o en «evitar», nunca en las dos. */
function toggleGenre(value, list, key) {
  const other = list === "genres" ? "rejectedGenres" : "genres";
  const has = value[list].includes(key);
  return { ...value, [list]: has ? value[list].filter((item) => item !== key) : [...value[list], key], [other]: value[other].filter((item) => item !== key) };
}

/** Géneros que apetecen, géneros a evitar y duración máxima (sala de Duo y gustos de la cuenta). */
export default function TasteFields({ value, onChange, showRuntime = true }) {
  return (
    <>
      <Question title="Te apetece">
        <div className="duo-chips">
          {GENRES.map((genre) => (
            <Chip key={genre.key} checked={value.genres.includes(genre.key)} onChange={() => onChange(toggleGenre(value, "genres", genre.key))}>{genre.label}</Chip>
          ))}
        </div>
      </Question>
      <Question title="Prefieres evitar">
        <div className="duo-chips">
          {GENRES.map((genre) => (
            <Chip key={genre.key} checked={value.rejectedGenres.includes(genre.key)} onChange={() => onChange(toggleGenre(value, "rejectedGenres", genre.key))}>{genre.label}</Chip>
          ))}
        </div>
      </Question>
      {showRuntime && (
        <label className="duo-field">
          <span>Duración máxima</span>
          <select value={value.maxRuntime} onChange={(event) => onChange({ ...value, maxRuntime: Number(event.target.value) })}>
            {RUNTIME_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </label>
      )}
    </>
  );
}
