/** heading: nivel del título (h1 cuando el estado vacío es toda la página, como la 404). */
export default function EmptyState({ icon = "🎬", title, children, action, id, heading: Heading = "h3" }) {
  return (
    <div id={id} className="empty-state">
      <div style={{ fontSize: "3rem", marginBottom: 10 }} aria-hidden="true">
        {icon}
      </div>
      <Heading>{title}</Heading>
      {children && <p>{children}</p>}
      {action}
    </div>
  );
}
