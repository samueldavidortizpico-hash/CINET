import { Link, useParams } from "react-router-dom";
import { findLegalDoc, LEGAL_DOCS, LEGAL_STATUS, LEGAL_UPDATED } from "../data/legal.js";
import { useDocumentTitle } from "../hooks/useDocumentTitle.js";
import NotFoundPage from "./NotFoundPage.jsx";

const updatedLabel = new Date(`${LEGAL_UPDATED}T12:00:00`).toLocaleDateString("es-CO", { day: "numeric", month: "long", year: "numeric" });

const Blocks = ({ blocks }) =>
  blocks.map((block, index) =>
    Array.isArray(block) ? (
      <ul key={index}>
        {block.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    ) : (
      <p key={index}>{block}</p>
    )
  );

/** /legal (índice) y /legal/:doc. Públicas: no piden sesión. */
export default function LegalPage() {
  const { doc: slug } = useParams();
  const doc = slug ? findLegalDoc(slug) : null;
  useDocumentTitle(doc?.title ?? "Legal y privacidad");

  if (slug && !doc) return <NotFoundPage />;

  const status = (
    <p className="legal-status" role="note">
      <strong>{LEGAL_STATUS}</strong> Última actualización: <time dateTime={LEGAL_UPDATED}>{updatedLabel}</time>.
    </p>
  );

  if (!doc) {
    return (
      <div className="legal-page">
        <div className="legal-container legal-container--hub">
          <header className="legal-header">
            <p className="eyebrow">CINET</p>
            <h1>Legal y privacidad</h1>
            <p className="legal-lead">Cómo funciona el servicio, qué hacemos con tus datos y de dónde vienen los contenidos.</p>
            {status}
          </header>
          <ul className="legal-cards">
            {LEGAL_DOCS.map((item) => (
              <li key={item.slug}>
                <Link to={`/legal/${item.slug}`} className="legal-card">
                  <h2>{item.title}</h2>
                  <p>{item.summary}</p>
                  <span aria-hidden="true">Leer →</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    );
  }

  return (
    <div className="legal-page">
      <div className="legal-container">
        <nav className="legal-crumbs" aria-label="Ruta de navegación">
          <Link to="/legal">Legal y privacidad</Link> <span aria-hidden="true">/</span> <span aria-current="page">{doc.title}</span>
        </nav>

        <header className="legal-header">
          <h1>{doc.title}</h1>
          <p className="legal-lead">{doc.summary}</p>
          {status}
        </header>

        <div className="legal-body">
          <nav className="legal-toc" aria-labelledby="legal-toc-title">
            <h2 id="legal-toc-title">En esta página</h2>
            <ol>
              {doc.sections.map((section) => (
                <li key={section.id}>
                  <a href={`#${section.id}`}>{section.title}</a>
                </li>
              ))}
            </ol>
          </nav>

          <article className="legal-article">
            {doc.sections.map((section) => (
              <section key={section.id} id={section.id} aria-labelledby={`${section.id}-title`}>
                <h2 id={`${section.id}-title`}>{section.title}</h2>
                <Blocks blocks={section.blocks} />
                {section.link && (
                  <p>
                    <a href={section.link.href} target="_blank" rel="noopener noreferrer">
                      {section.link.label} <span className="visually-hidden">(se abre en otra pestaña)</span>
                    </a>
                  </p>
                )}
              </section>
            ))}
          </article>
        </div>

        <nav className="legal-related" aria-label="Otros documentos">
          <h2>Otros documentos</h2>
          <ul>
            {LEGAL_DOCS.filter((item) => item.slug !== doc.slug).map((item) => (
              <li key={item.slug}>
                <Link to={`/legal/${item.slug}`}>{item.title}</Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </div>
  );
}
