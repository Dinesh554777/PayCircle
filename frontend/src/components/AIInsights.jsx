import { useEffect, useState } from "react";
import Card from "./common/Card";
import { apiRequest } from "../api/client";

function formatMoney(value) {
  const num = Number(value);
  return `₹${num.toFixed(2)}`;
}

const BAR_COLORS = [
  "#4f46e5",
  "#0ea5e9",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#14b8a6",
  "#f97316",
  "#64748b",
  "#ec4899",
];

function Bar({ label, value, width, color }) {
  return (
    <div style={{ marginBottom: "0.75rem" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: "0.875rem",
          marginBottom: "0.25rem",
        }}
      >
        <span>{label}</span>
        <span style={{ color: "#6b7280" }}>{value}</span>
      </div>
      <div
        style={{
          background: "#f3f4f6",
          borderRadius: "0.25rem",
          height: "0.625rem",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${Math.max(2, Math.min(100, width))}%`,
            background: color,
            height: "100%",
            borderRadius: "0.25rem",
          }}
        />
      </div>
    </div>
  );
}

function MiniStat({ label, value }) {
  return (
    <section
      style={{
        background: "#f9fafb",
        border: "1px solid #e5e7eb",
        borderRadius: "0.5rem",
        padding: "0.75rem",
      }}
    >
      <div style={{ fontSize: "0.75rem", color: "#6b7280" }}>{label}</div>
      <div
        style={{
          fontSize: "1.05rem",
          fontWeight: 700,
          color: "#1f2937",
          wordBreak: "break-word",
        }}
      >
        {value}
      </div>
    </section>
  );
}

function ListBlock({ title, items }) {
  if (items.length === 0) return null;
  return (
    <div style={{ marginBottom: "1.25rem" }}>
      <h4 style={{ marginBottom: "0.5rem" }}>{title}</h4>
      <ul style={{ margin: 0, paddingLeft: "1.25rem", color: "#374151" }}>
        {items.map((item) => (
          <li key={item} style={{ marginBottom: "0.25rem" }}>
            {item}
          </li>
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
      <Card title="AI Insights">
        <p>Loading AI insights...</p>
      </Card>
    );
  }

  if (error) {
    return (
      <Card title="AI Insights">
        <p style={{ color: "#dc2626" }}>{error}</p>
      </Card>
    );
  }

  if (!data) return null;

  const maxCategory =
    data.category_breakdown.length > 0
      ? Math.max(...data.category_breakdown.map((c) => Number(c.amount)), 1)
      : 1;
  const maxMonth =
    data.monthly_summary.length > 0
      ? Math.max(...data.monthly_summary.map((m) => Number(m.amount)), 1)
      : 1;

  return (
    <Card title="AI Insights">
      <p style={{ marginTop: 0 }}>{data.summary}</p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
          gap: "0.75rem",
          marginBottom: "1.25rem",
        }}
      >
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
        <div style={{ marginBottom: "1.25rem" }}>
          <h4 style={{ marginBottom: "0.75rem" }}>Spending by category</h4>
          {data.category_breakdown.map((cat, index) => (
            <Bar
              key={cat.category}
              label={cat.category}
              value={`${formatMoney(cat.amount)} · ${cat.count} expense${cat.count === 1 ? "" : "s"}`}
              width={(Number(cat.amount) / maxCategory) * 100}
              color={BAR_COLORS[index % BAR_COLORS.length]}
            />
          ))}
        </div>
      )}

      {data.monthly_summary.length > 0 && (
        <div style={{ marginBottom: "1.25rem" }}>
          <h4 style={{ marginBottom: "0.75rem" }}>Monthly spending trend</h4>
          {data.monthly_summary.map((month) => (
            <Bar
              key={month.month}
              label={month.label}
              value={`${formatMoney(month.amount)} · ${month.count} expense${month.count === 1 ? "" : "s"}`}
              width={(Number(month.amount) / maxMonth) * 100}
              color="#4f46e5"
            />
          ))}
        </div>
      )}

      <ListBlock title="Highlights" items={data.insights} />
      <ListBlock title="Suggestions" items={data.suggestions} />

      <p style={{ fontSize: "0.75rem", color: "#9ca3af", marginBottom: 0 }}>
        Insights use your share of each expense in groups you belong to. Informational only; not financial advice.
      </p>
    </Card>
  );
}
