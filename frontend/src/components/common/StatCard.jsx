import useCountUp from "../../hooks/useCountUp";
import { formatMoney } from "../../utils/format";

const ICON_TINTS = {
  primary: { background: "var(--primary-soft-bg)", color: "var(--primary)" },
  success: { background: "var(--success-bg)", color: "var(--success-text)" },
  danger: { background: "var(--danger-bg)", color: "var(--danger-text)" },
  warning: { background: "var(--warning-bg)", color: "var(--warning-text)" },
  info: { background: "var(--info-bg)", color: "var(--info-text)" },
  neutral: { background: "var(--card-background-hover)", color: "var(--text-muted)" },
};

export default function StatCard({
  label,
  value,
  icon: Icon,
  tone = "primary",
  note,
  countUp = false,
  progress,
  valueColor,
  className = "",
}) {
  const animate = countUp !== false;
  const numeric = Number(countUp !== false ? countUp : 0) || 0;
  const animated = useCountUp(numeric, { enabled: animate });
  const tint = ICON_TINTS[tone] || ICON_TINTS.primary;
  const displayValue = animate ? formatMoney(animated) : value;

  return (
    <section className={`stat-card ${className}`}>
      <div className="stat-head">
        <span className="stat-label">{label}</span>
        {Icon && (
          <span className="stat-icon" style={tint}>
            <Icon aria-hidden="true" />
          </span>
        )}
      </div>
      <div
        className="stat-value"
        style={valueColor ? { color: valueColor } : undefined}
      >
        {displayValue}
      </div>
      {note && <div className="stat-note">{note}</div>}
      {typeof progress === "number" && (
        <div className="progress stat-progress">
          <div
            className="progress-bar"
            style={{
              width: `${Math.max(0, Math.min(100, progress))}%`,
              background: valueColor || "var(--primary)",
            }}
          />
        </div>
      )}
    </section>
  );
}
