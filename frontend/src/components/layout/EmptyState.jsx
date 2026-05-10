/*
 * EmptyState — centered CTA blocks with optional icon illustration.
 */

export default function EmptyState({ icon = null, title, description, action = null }) {
  return (
    <div className="empty-state empty-state--card">
      {icon ? <div className="empty-state__icon">{icon}</div> : null}
      <h3 className="empty-state__title">{title}</h3>
      {description ? <p className="empty-state__desc">{description}</p> : null}
      {action ? <div className="empty-state__action">{action}</div> : null}
    </div>
  );
}
