export default function LoadingSpinner({ size = "md", label, className = "" }) {
  return (
    <div className={`loader-wrap ${className}`} role="status">
      <span className={`spinner${size === "sm" ? " spinner-sm" : ""}`} aria-hidden="true" />
      {label && (
        <span className="text-sm text-secondary" style={{ marginLeft: "0.75rem" }}>
          {label}
        </span>
      )}
      <span className="sr-only">{label || "Loading"}</span>
    </div>
  );
}
