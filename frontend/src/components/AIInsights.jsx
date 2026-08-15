import { useEffect, useState } from "react";
import { Sparkles, Lightbulb, TrendingUp } from "lucide-react";
import Card from "./common/Card";
import Skeleton, { SkeletonText } from "./common/Skeleton";
import ErrorState from "./common/ErrorState";
import EmptyState from "./common/EmptyState";
import ProgressBar from "./common/ProgressBar";
import Badge from "./common/Badge";
import { apiRequest } from "../api/client";
import { formatMoney } from "../utils/format";
import { getCategoryConfig } from "../constants/categories";

function MiniStat({ label, value }) {
  return (
    <div className="stat-mini">
      <div className="stat-mini-label">{label}</div>
      <div className="stat-mini-value">{value}</div>
    </div>
  );
}

function ListBlock({ icon: Icon, title, items }) {
  if (!items || items.length === 0) return null;
  return (
    <div className="insight-block">
      <h4 className="insight-block-title">
        <Icon aria-hidden="true" /> {title}
      </h4>
      <ul className="insight-list">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

export default function AIInsights() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    apiRequest("/ai/insights", { auth: true })
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <Card className="mb-4">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles aria-hidden="true" className="text-primary" />
          <h3 className="mb-0">AI Insights</h3>
        </div>
        <SkeletonText lines={3} />
        <div className="grid-4 mt-3">
          <Skeleton />
          <Skeleton />
          <Skeleton />
          <Skeleton />
        </div>
      </Card>
    );
  }

  if (error) {
    return <ErrorState title="Couldn't load AI insights" message={error} compact />;
  }

  if (!data) return null;

  const maxCategory =
    data.category_breakdown.length > 0
      ? Math.max(...data.category_breakdown.map((c) => Number(c.amount)), 1)
      : 1;

  return (
    <Card className="mb-4">
      <div className="card-title-row">
        <span className="flex items-center gap-2">
          <Sparkles aria-hidden="true" className="text-primary" />
          <h3 className="mb-0">AI Insights</h3>
          <Badge variant="primary">AI</Badge>
        </span>
      </div>

      <p className="text-secondary mb-4">{data.summary}</p>

      <div className="grid-4 mb-4">
        <MiniStat label="Total Spending" value={formatMoney(data.total_spending)} />
        <MiniStat label="Average Expense" value={formatMoney(data.average_expense)} />
        <MiniStat label="Expenses" value={String(data.expense_count)} />
        <MiniStat
          label="Top Category"
          value={
            data.top_category
              ? `${data.top_category} · ${data.top_category_share?.toFixed(0) ?? "?"}%`
              : "—"
          }
        />
      </div>

      {data.category_breakdown.length > 0 && (
        <div className="mb-4">
          <h4 className="insight-block-title">Spending by category</h4>
          {data.category_breakdown.map((cat) => (
            <div key={cat.category} className="mb-3">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-semibold">{cat.category}</span>
                <span className="text-secondary">
                  {formatMoney(cat.amount)} · {cat.count} expense{cat.count === 1 ? "" : "s"}
                </span>
              </div>
              <ProgressBar
                value={Number(cat.amount)}
                max={maxCategory}
                color={getCategoryConfig(cat.category).color}
              />
            </div>
          ))}
        </div>
      )}

      {data.monthly_summary.length > 0 && (
        <div className="mb-4">
          <h4 className="insight-block-title">
            <TrendingUp aria-hidden="true" /> Monthly spending trend
          </h4>
          {data.monthly_summary.map((month) => (
            <div key={month.month} className="month-row">
              <span className="text-secondary">{month.label}</span>
              <span className="text-semibold">{formatMoney(month.amount)}</span>
              <span className="text-muted">·</span>
              <span className="text-muted">
                {month.count} expense{month.count === 1 ? "" : "s"}
              </span>
            </div>
          ))}
        </div>
      )}

      <ListBlock icon={Lightbulb} title="Highlights" items={data.insights} />
      <ListBlock icon={TrendingUp} title="Suggestions" items={data.suggestions} />

      {data.category_breakdown.length === 0 &&
        data.monthly_summary.length === 0 &&
        (!data.insights || data.insights.length === 0) && (
          <EmptyState title="Not enough data yet" message="Add a few expenses to start seeing insights." />
        )}

      <p className="text-muted text-xs mb-0">
        Insights use your share of each expense in groups you belong to. Informational only; not
        financial advice.
      </p>
    </Card>
  );
}
