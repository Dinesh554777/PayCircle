import { CalendarDays, TrendingDown, TrendingUp, Minus } from "lucide-react";
import Card from "./common/Card";
import Badge from "./common/Badge";
import EmptyState from "./common/EmptyState";
import ProgressBar from "./common/ProgressBar";
import { formatMoney } from "../utils/format";

export default function BudgetCard({ budget }) {
  if (!budget) return null;

  const hasPrevious = budget.previous_amount != null && Number(budget.previous_amount) > 0;
  const current = Number(budget.current_amount || 0);
  const previous = Number(budget.previous_amount || 0);

  const changeLabel =
    budget.change_percent == null
      ? ""
      : `${Math.abs(Number(budget.change_percent)).toFixed(1)}% vs last month`;

  const trendClass =
    budget.direction === "down"
      ? "text-success"
      : budget.direction === "up"
        ? "text-warning"
        : "text-secondary";

  const TrendIcon =
    budget.direction === "up" ? TrendingUp : budget.direction === "down" ? TrendingDown : Minus;

  return (
    <Card className="mb-4">
      <div className="card-title-row">
        <span className="flex items-center gap-2">
          <CalendarDays aria-hidden="true" className="text-primary" />
          <h3 className="mb-0">This Month</h3>
          <Badge variant="neutral">{budget.current_month_label}</Badge>
        </span>
        {changeLabel && (
          <span className={`text-sm text-semibold ${trendClass}`}>
            <TrendIcon aria-hidden="true" style={{ width: 14, height: 14 }} /> {changeLabel}
          </span>
        )}
      </div>

      {current <= 0 && !hasPrevious ? (
        <EmptyState
          icon={CalendarDays}
          title="No spending this month yet"
          message="Track an expense to see your monthly budget-style overview here."
        />
      ) : (
        <>
          <div className="text-3xl text-bold text-primary mb-1">{formatMoney(current)}</div>
          <p className="text-secondary text-sm mb-3">
            Spent so far in {budget.current_month_label}
            {budget.current_count > 0
              ? ` · ${budget.current_count} expense${budget.current_count === 1 ? "" : "s"}`
              : ""}
          </p>

          {hasPrevious && (
            <>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-secondary">Compared with last month</span>
                <span className="text-semibold">{formatMoney(previous)}</span>
              </div>
              <ProgressBar
                value={Math.min(current, previous)}
                max={previous || 1}
                color={current > previous ? "var(--warning)" : "var(--success)"}
              />
              <p className="text-muted text-xs mt-2 mb-0">
                {current > previous
                  ? "You've spent more than the same time last month."
                  : current < previous
                    ? "You're spending less than last month so far."
                    : "Spending is level with last month."}
              </p>
            </>
          )}
        </>
      )}
    </Card>
  );
}
