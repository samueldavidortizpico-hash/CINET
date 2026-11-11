import { useState } from "react";
import Button from "../components/common/Button.jsx";
import EmptyState from "../components/common/EmptyState.jsx";
import Loading from "../components/common/Loading.jsx";
import { useAsync } from "../hooks/useAsync.js";
import { useAuth } from "../hooks/useAuth.js";
import { useDebounced } from "../hooks/useTitleSearch.js";
import { useDocumentTitle } from "../hooks/useDocumentTitle.js";
import { useToast } from "../hooks/useToast.js";
import { normalizeTitle } from "../services/csvImport.js";
import { EMPTY_ADVANCED, getMovies, searchCatalog, toISODate } from "../services/movieService.js";
import * as repo from "../services/partnerRepository.js";
import { formatBudget } from "../services/planService.js";
import { isTmdbEnabled } from "../services/tmdbClient.js";

const STATUS = { pending: "Pendiente de verificación", verified: "Verificada", suspended: "Suspendida" };
const when = (iso) => new Date(iso).toLocaleString("es-CO", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

async function findTitles(query) {
  if (isTmdbEnabled()) {
    try {
      return (await searchCatalog({ query, genre: "todas", sort: "default", advanced: EMPTY_ADVANCED }, 1)).titles.slice(0, 6);
    } catch {
      /* sin catálogo en vivo: se busca en el local */
    }
  }
  const movies = await getMovies();
  return movies.filter((movie) => normalizeTitle(movie.title).includes(normalizeTitle(query))).slice(0, 6);
}

/** Elige el título canónico de CINET (así la función aparece en su ficha). */
function TitlePicker({ value, onChange }) {
  const [text, setText] = useState("");
  const query = useDebounced(text.trim(), 300);
  const { data: results = [] } = useAsync(query.length >= 2 ? `partner-title-${query}` : null, () => findTitles(query));
  if (value) {
    return (
      <p className="partner-picked">
        <strong>{value.title}</strong>{value.year ? ` (${String(value.year).slice(0, 4)})` : ""}{" "}
        <button type="button" className="duo-link" onClick={() => onChange(null)}>Cambiar</button>
      </p>
    );
  }
  return (
    <div className="partner-picker">
      <label className="duo-field">
        <span>Película o evento (como aparece en CINET)</span>
        <input type="search" value={text} onChange={(event) => setText(event.target.value)} placeholder="Ej. Interstellar" />
      </label>
      {results.length > 0 && (
        <ul aria-label="Resultados">
          {results.map((title) => (
            <li key={title.id}>
              <button type="button" onClick={() => onChange({ id: title.id, title: title.title, year: title.year, image: title.poster ?? "" })}>
                {title.title}{title.year ? ` (${String(title.year).slice(0, 4)})` : ""}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function RequestForm({ onDone }) {
  const [form, setForm] = useState({ name: "", kind: "cinema", officialUrl: "https://" });
  const [state, setState] = useState({ busy: false, error: "" });
  const submit = async (event) => {
    event.preventDefault();
    setState({ busy: true, error: "" });
    try {
      await repo.requestOrganization(form);
      onDone();
    } catch (error) {
      setState({ busy: false, error: error.message });
    }
  };
  return (
    <form className="room-card partner-form" onSubmit={submit}>
      <h2>Solicitar cuenta de aliado</h2>
      <p className="duo-fineprint">Un operador de CINET revisa la organización antes de que pueda publicar. La verificación no es un convenio ni un contrato.</p>
      <label className="duo-field"><span>Nombre de la organización</span><input required maxLength={80} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label>
      <div className="duo-chips" role="radiogroup" aria-label="Tipo">
        {[["cinema", "Cine"], ["organizer", "Organizador de eventos"]].map(([value, label]) => (
          <label key={value} className="duo-chip"><input type="radio" name="org-kind" checked={form.kind === value} onChange={() => setForm({ ...form, kind: value })} /><span>{label}</span></label>
        ))}
      </div>
      <label className="duo-field"><span>Sitio oficial (https://)</span><input required type="url" value={form.officialUrl} onChange={(event) => setForm({ ...form, officialUrl: event.target.value })} /></label>
      {state.error && <p className="error-message" role="alert">{state.error}</p>}
      <Button variant="primary" type="submit" disabled={state.busy}>Enviar solicitud</Button>
    </form>
  );
}

function OrgPanel({ org, user }) {
  const { showToast } = useToast();
  const [version, setVersion] = useState(0);
  const reload = () => setVersion((value) => value + 1);
  const verified = org.status === "verified";
  const admin = org.role === "admin";
  const { data } = useAsync(verified ? `org-${org.id}-${version}` : null, async () => {
    const [venueList, listingList, offerList, auditList, memberList] = await Promise.all([
      repo.venues(org.id),
      repo.listings(org.id),
      repo.offers(org.id),
      admin ? repo.audit(org.id) : [],
      admin ? repo.members(org.id) : [],
    ]);
    return { venues: venueList, listings: listingList, offers: offerList, audit: auditList, members: memberList };
  });
  const [venueForm, setVenueForm] = useState({ name: "", city: "" });
  const [listing, setListing] = useState({ venueId: "", kind: "showtime", title: null, dateISO: "", time: "20:00", format: "", language: "", price: "", officialUrl: org.official_url });
  const [offer, setOffer] = useState({ title: null, headline: "", url: org.official_url, validUntil: "" });
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);

  /** true si salió bien (los formularios solo se vacían entonces). */
  const act = async (action, message) => {
    setBusy(true);
    try {
      await action();
      showToast(message);
      reload();
      return true;
    } catch (error) {
      showToast(error.message);
      return false;
    } finally {
      setBusy(false);
    }
  };

  if (!verified) {
    return (
      <section className="room-card">
        <h2>{org.name}</h2>
        <p className="room-status">{STATUS[org.status]}</p>
        <p>{org.status === "pending" ? "Cuando un operador de CINET verifique la organización podrás cargar sedes y funciones." : "La organización está suspendida: su cartelera no se muestra. Escribe a CINET para revisarlo."}</p>
      </section>
    );
  }
  if (!data) return <Loading label="Cargando la organización" />;
  const venueName = (id) => data.venues.find((venue) => venue.id === id)?.name ?? "Sede";

  return (
    <>
      <section className="room-card">
        <h2>Sedes</h2>
        <ul className="partner-list">{data.venues.map((venue) => <li key={venue.id}><span>{venue.name} · {venue.city}</span></li>)}</ul>
        <form className="partner-form partner-inline" onSubmit={async (event) => { event.preventDefault(); if (await act(() => repo.addVenue(org.id, venueForm), "Sede guardada")) setVenueForm({ name: "", city: "" }); }}>
          <label className="duo-field"><span>Nombre de la sede</span><input required maxLength={80} value={venueForm.name} onChange={(event) => setVenueForm({ ...venueForm, name: event.target.value })} /></label>
          <label className="duo-field"><span>Ciudad</span><input required maxLength={60} value={venueForm.city} onChange={(event) => setVenueForm({ ...venueForm, city: event.target.value })} /></label>
          <Button variant="secondary" type="submit" disabled={busy}>Agregar sede</Button>
        </form>
      </section>

      <section className="room-card">
        <h2>Funciones y eventos</h2>
        <p className="duo-fineprint">Se muestran en la ficha del título con tu nombre como fuente y la hora de actualización. Desaparecen solos al empezar o si los cancelas.</p>
        {data.venues.length === 0 ? (
          <p className="plan-note">Primero agrega una sede.</p>
        ) : (
          <form
            className="partner-form"
            onSubmit={async (event) => {
              event.preventDefault();
              if (await act(() => repo.addListing(org.id, listing), "Función publicada")) setListing((current) => ({ ...current, title: null, dateISO: "" }));
            }}
          >
            <TitlePicker value={listing.title} onChange={(title) => setListing({ ...listing, title })} />
            <div className="partner-grid">
              <label className="duo-field"><span>Sede</span>
                <select aria-label="Sede" required value={listing.venueId} onChange={(event) => setListing({ ...listing, venueId: event.target.value })}>
                  <option value="">Elegir</option>
                  {data.venues.map((venue) => <option key={venue.id} value={venue.id}>{venue.name}</option>)}
                </select>
              </label>
              <label className="duo-field"><span>Tipo</span>
                <select aria-label="Tipo" value={listing.kind} onChange={(event) => setListing({ ...listing, kind: event.target.value })}>
                  <option value="showtime">Función</option>
                  <option value="event">Evento</option>
                </select>
              </label>
              <label className="duo-field"><span>Fecha</span><input type="date" required min={toISODate(new Date())} value={listing.dateISO} onChange={(event) => setListing({ ...listing, dateISO: event.target.value })} /></label>
              <label className="duo-field"><span>Hora (Bogotá)</span><input type="time" required value={listing.time} onChange={(event) => setListing({ ...listing, time: event.target.value })} /></label>
              <label className="duo-field"><span>Formato</span><input maxLength={20} placeholder="2D, IMAX…" value={listing.format} onChange={(event) => setListing({ ...listing, format: event.target.value })} /></label>
              <label className="duo-field"><span>Idioma</span><input maxLength={20} placeholder="Subtitulada" value={listing.language} onChange={(event) => setListing({ ...listing, language: event.target.value })} /></label>
              <label className="duo-field"><span>Precio (COP, opcional)</span><input inputMode="numeric" value={listing.price} onChange={(event) => setListing({ ...listing, price: event.target.value.replace(/\D/g, "") })} /></label>
              <label className="duo-field"><span>Enlace oficial de compra</span><input required type="url" value={listing.officialUrl} onChange={(event) => setListing({ ...listing, officialUrl: event.target.value })} /></label>
            </div>
            <Button variant="primary" type="submit" disabled={busy || !listing.title}>Publicar</Button>
          </form>
        )}
        <ul className="partner-list">
          {data.listings.map((item) => (
            <li key={item.id}>
              <span>
                <strong>{item.title.title}</strong> · {venueName(item.venue_id)} · {when(item.starts_at)}
                {item.price_cop != null ? ` · ${formatBudget(item.price_cop)}` : ""}
                <small> {item.status === "cancelled" ? "Cancelada" : new Date(item.starts_at) <= new Date() ? "Pasada" : "Publicada"} · actualizada {when(item.updated_at)}</small>
              </span>
              {item.status === "scheduled" && <button type="button" className="duo-link" disabled={busy} onClick={() => act(() => repo.setListingStatus(item.id, "cancelled"), "Función cancelada")}>Cancelar</button>}
            </li>
          ))}
        </ul>
      </section>

      <section className="room-card">
        <h2>Ofertas (patrocinadas)</h2>
        <p className="duo-fineprint">Se muestran aparte, marcadas como «Patrocinado», y nunca cambian el orden de las recomendaciones.</p>
        <form className="partner-form" onSubmit={async (event) => { event.preventDefault(); if (await act(() => repo.addOffer(org.id, { ...offer, titleId: offer.title?.id }), "Oferta publicada")) setOffer({ ...offer, title: null, headline: "" }); }}>
          <TitlePicker value={offer.title} onChange={(title) => setOffer({ ...offer, title })} />
          <div className="partner-grid">
            <label className="duo-field"><span>Titular</span><input required minLength={3} maxLength={80} value={offer.headline} onChange={(event) => setOffer({ ...offer, headline: event.target.value })} /></label>
            <label className="duo-field"><span>Enlace</span><input required type="url" value={offer.url} onChange={(event) => setOffer({ ...offer, url: event.target.value })} /></label>
            <label className="duo-field"><span>Vigente hasta</span><input type="date" required min={toISODate(new Date())} value={offer.validUntil} onChange={(event) => setOffer({ ...offer, validUntil: event.target.value })} /></label>
          </div>
          <Button variant="secondary" type="submit" disabled={busy || !offer.title}>Publicar oferta</Button>
        </form>
        <ul className="partner-list">{data.offers.map((item) => <li key={item.id}><span>{item.headline} · hasta {new Date(item.valid_until).toLocaleDateString("es-CO")}</span></li>)}</ul>
      </section>

      {admin && (
        <section className="room-card">
          <h2>Equipo y auditoría</h2>
          <ul className="partner-list">{data.members.map((member) => <li key={member.user_id}><span>{member.user_id === user.id ? "Tú" : `Cuenta …${member.user_id.slice(-4)}`} · {member.role === "admin" ? "administra" : "edita"}</span></li>)}</ul>
          <form className="partner-form partner-inline" onSubmit={async (event) => { event.preventDefault(); if (await act(() => repo.addMember(org.id, email), "Persona agregada")) setEmail(""); }}>
            <label className="duo-field"><span>Correo de la cuenta en CINET</span><input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} /></label>
            <Button variant="secondary" type="submit" disabled={busy}>Agregar editor</Button>
          </form>
          <h3>Últimos cambios</h3>
          <ol className="partner-audit">{data.audit.map((entry) => <li key={entry.id}>{when(entry.at)} · {entry.action} · {entry.entity}{entry.actor === user.id ? " · tú" : ""}</li>)}</ol>
        </section>
      )}
    </>
  );
}

/** /aliados — panel mínimo para cines y organizadores verificados. */
export default function PartnerPage() {
  const { user, loading } = useAuth();
  const [version, setVersion] = useState(0);
  const [selected, setSelected] = useState(null);
  const { data: orgs, error } = useAsync(user && repo.partnersAvailable() ? `orgs-${user.id}-${version}` : null, () => repo.myOrganizations(user.id));
  useDocumentTitle("Aliados");

  const shell = (children) => (
    <div className="duo-page room-page partner-page">
      <div className="duo-container">
        <header className="room-intro">
          <span className="duo-badge">CINET · ALIADOS</span>
          <h1>Panel de aliados</h1>
          <p className="duo-lead">Para cines y organizadores: publica funciones y eventos con su enlace oficial de compra. CINET no vende boletas ni promete cupos.</p>
        </header>
        {children}
      </div>
    </div>
  );

  if (!repo.partnersAvailable()) return shell(<EmptyState heading="h2" icon="🎬" title="No disponible">Las cuentas no están disponibles ahora mismo.</EmptyState>);
  if (loading) return <Loading label="Cargando" />;
  if (!user) {
    return shell(
      <EmptyState heading="h2" icon="🎬" title="Inicia sesión" action={<Button variant="primary" to="/login" state={{ from: "/aliados" }}>Iniciar sesión</Button>}>
        Entra con la cuenta que administra tu organización.
      </EmptyState>
    );
  }
  if (error) return shell(<p className="error-message" role="alert">{error.message}</p>);
  if (!orgs) return <Loading label="Cargando tus organizaciones" />;
  const current = orgs.find((org) => org.id === selected) ?? orgs[0];

  return shell(
    <>
      {orgs.length > 1 && (
        <div className="duo-chips" role="radiogroup" aria-label="Organización">
          {orgs.map((org) => (
            <label key={org.id} className="duo-chip"><input type="radio" name="org" checked={current.id === org.id} onChange={() => setSelected(org.id)} /><span>{org.name}</span></label>
          ))}
        </div>
      )}
      {current ? (
        <>
          <p className="plan-note">{current.name} · <strong>{STATUS[current.status]}</strong></p>
          <OrgPanel key={`${current.id}-${current.status}`} org={current} user={user} />
        </>
      ) : (
        <RequestForm onDone={() => setVersion((value) => value + 1)} />
      )}
    </>
  );
}
