export default function Badge({
  variant = "neutral",
  icon: Icon,
  children,
  dotOnly = false,
  className = "",
  title,
}) {
  if (dotOnly) {
    return (
      <span className={`badge badge-${variant} badge-dot ${className}`} title={title} aria-label={title} />
    );
  }
  return (
    <span className={`badge badge-${variant} ${className}`} title={title}>
      {Icon && <Icon aria-hidden="true" />}
      {children}
    </span>
  );
}
