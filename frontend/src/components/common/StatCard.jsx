import useCountUp from "../../hooks/useCountUp";
import NumberTicker from "../magicui/NumberTicker";
import MagicCard from "../magicui/MagicCard";
import { CURRENCY_SYMBOL, formatMoney } from "../../utils/format";
import { cn } from "../../lib/utils";

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
  magic = false,
}) {
  const animate = countUp !== false;
  const numeric = Number(countUp !== false ? countUp : 0) || 0;

  const animateViaHook = animate && !magic;
  const animated = useCountUp(animateViaHook ? numeric : 0, { enabled: animateViaHook });
  const tint = ICON_TINTS[tone] || ICON_TINTS.primary;
  const displayValue = animate ? formatMoney(animated) : value;

  const body = (
    <>
      <div className="stat-head">
        <span className="stat-label">{label}</span>
        {Icon && (
          <span className="stat-icon" style={tint}>
            <Icon aria-hidden="true" />
          </span>
        )}
      </div>
      {animate && magic ? (
        <div
          className="stat-value"
          style={valueColor ? { color: valueColor } : undefined}
        >
          {CURRENCY_SYMBOL}
          <NumberTicker
            value={numeric}
            decimalPlaces={2}
            startValue={0}
            className="number-ticker"
          />
        </div>
      ) : (
        <div
          className="stat-value"
          style={valueColor ? { color: valueColor } : undefined}
        >
          {displayValue}
        </div>
      )}
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
    </>
  );

  if (!magic) {
    return <section className={cn("stat-card", className)}>{body}</section>;
  }

  return (
    <MagicCard className={cn("stat-card", "stat-card-magic", className)}>
      {body}
    </MagicCard>
  );
}
