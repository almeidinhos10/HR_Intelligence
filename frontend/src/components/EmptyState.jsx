export function EmptyState({ title, message, action }) {
  return (
    <div className="empty-state">
      <div className="empty-mark" aria-hidden="true">
        HR
      </div>
      <h3>{title}</h3>
      <p>{message}</p>
      {action}
    </div>
  );
}

