/* Opciones seleccionables de cada paso (cine, fecha, hora). */

const optionClass = (base, selected) => `${base}${selected ? " selected" : ""}`;

export function CinemaOptions({ cinemas, selected, onSelect }) {
  return (
    <div className="cinema-grid" id="cinema-grid">
      {cinemas.map((cinema) => {
        const isSelected = selected?.name === cinema.name;
        return (
          <button
            key={cinema.name}
            type="button"
            className={optionClass("cinema-card", isSelected)}
            aria-pressed={isSelected}
            onClick={() => onSelect({ name: cinema.name, location: cinema.location })}
          >
            <span className="cinema-icon">{cinema.icon}</span>
            <span className="cinema-info">
              <strong>{cinema.name}</strong>
              <small>📍 {cinema.location}</small>
            </span>
            <span className="selection-check">✓</span>
          </button>
        );
      })}
    </div>
  );
}

export function DateOptions({ dates, selected, onSelect }) {
  return (
    <div className="date-grid" id="date-grid">
      {dates.map((date) => (
        <button
          key={date.iso}
          type="button"
          className={optionClass("date-card", selected?.iso === date.iso)}
          aria-pressed={selected?.iso === date.iso}
          aria-label={date.label}
          onClick={() => onSelect(date)}
        >
          <span>{date.weekday}</span>
          <strong>{date.day}</strong>
          <small>{date.month}</small>
        </button>
      ))}
    </div>
  );
}

export function TimeOptions({ times, selected, onSelect }) {
  return (
    <div className="time-grid" id="time-grid">
      {times.map((time) => (
        <button
          key={time}
          type="button"
          className={optionClass("time-card", selected === time)}
          aria-pressed={selected === time}
          onClick={() => onSelect(time)}
        >
          {time}
        </button>
      ))}
    </div>
  );
}
