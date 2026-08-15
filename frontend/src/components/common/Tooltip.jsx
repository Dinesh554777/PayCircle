export default function Tooltip({ label, children, className = "" }) {
  if (!label) return children;
  return (
    <span className={`tooltip ${className}`} tabIndex={0}>
      {children}
      <span className="tooltip-text" role="tooltip">
        {label}
      </span>
    </span>
  );
}
