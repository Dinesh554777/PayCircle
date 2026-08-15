export default function IconButton({
  icon: Icon,
  label,
  onClick,
  className = "",
  size,
  ...props
}) {
  return (
    <button
      type="button"
      className={`icon-btn${size === "sm" ? " icon-btn-sm" : ""} ${className}`}
      aria-label={label}
      title={label}
      onClick={onClick}
      {...props}
    >
      <Icon aria-hidden="true" />
    </button>
  );
}
