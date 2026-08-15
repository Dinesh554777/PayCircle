export default function ProgressBar({ value, color, max = 100, className = "" }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className={`progress ${className}`} role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
      <div
        className="progress-bar"
        style={{ width: `${Math.max(2, Math.min(100, pct))}%`, background: color || "var(--primary)" }}
      />
    </div>
  );
}
