export default function Button({
  children,
  variant = "primary",
  size,
  type = "button",
  loading = false,
  disabled = false,
  icon: Icon,
  className = "",
  ...props
}) {
  const classes = [
    "btn",
    variant !== "primary" ? `btn-${variant}` : "btn-primary",
    size === "sm" ? "btn-sm" : size === "lg" ? "btn-lg" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      type={type}
      className={classes}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? (
        <span className="btn-spinner" aria-hidden="true" />
      ) : (
        Icon && <Icon aria-hidden="true" />
      )}
      {children}
    </button>
  );
}
