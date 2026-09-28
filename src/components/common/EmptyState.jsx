export default function EmptyState({ icon = "🎬", title, children, action, id }) {
  return (
    <div id={id} className="empty-state">
      <div style={{ fontSize: "3rem", marginBottom: 10 }} aria-hidden="true">
        {icon}
      </div>
      <h3>{title}</h3>
      {children && <p>{children}</p>}
      {action}
    </div>
  );
}
