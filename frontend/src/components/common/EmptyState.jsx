export default function EmptyState({
  icon: Icon,
  title,
  message,
  action,
  className = "",
}) {
  return (
    <div className={`empty-state ${className}`}>
      {Icon && (
        <div className="empty-icon">
          <Icon aria-hidden="true" />
        </div>
      )}
      <div className="empty-title">{title}</div>
      {message && <div className="empty-text">{message}</div>}
      {action && <div className="empty-action">{action}</div>}
    </div>
  );
}
