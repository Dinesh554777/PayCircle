import { useMemo } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
  BarChart,
  Bar,
} from "recharts";
import Card from "../common/Card";
import EmptyState from "../common/EmptyState";
import { formatMoney } from "../../utils/format";
import { CATEGORY_COLORS, getCategoryConfig } from "../../constants/categories";
import { useTheme } from "../../context/ThemeContext";

export function ChartsGrid({ data }) {
  return (
    <div className="grid-3 mb-4">
      <ChartCard title="Spending Trend" subtitle="Monthly spend from recent activity" icon={null}>
        <SpendingTrendChart transactions={data.recent_transactions} />
      </ChartCard>
      <ChartCard title="Category Breakdown" subtitle="Where your money went" icon={null}>
        <CategoryBreakdownChart transactions={data.recent_transactions} />
      </ChartCard>
      <ChartCard title="Group Spending" subtitle="Total per group" icon={null}>
        <GroupSpendingChart groups={data.recent_groups} />
      </ChartCard>
    </div>
  );
}

export function ChartCard({ title, subtitle, icon: Icon, children }) {
  return (
    <Card title={title} icon={Icon} className="h-full">
      {subtitle && <p className="text-sm text-muted" style={{ marginTop: "-0.25rem" }}>{subtitle}</p>}
      <div style={{ height: 260 }}>{children}</div>
    </Card>
  );
}

function useChartTheme() {
  const { theme } = useTheme();
  const dark = theme === "dark";
  return {
    axis: dark ? "#A1A1AA" : "#71717A",
    grid: dark ? "#27272A" : "#E4E4E7",
    tooltipBg: dark ? "#18181B" : "#FFFFFF",
    tooltipBorder: dark ? "#27272A" : "#E4E4E7",
    text: dark ? "#FAFAFA" : "#18181B",
  };
}

function ChartTooltip({ active, payload, label, colors, formatter }) {
  const chartTheme = useChartTheme();
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div
      style={{
        background: chartTheme.tooltipBg,
        border: `1px solid ${chartTheme.tooltipBorder}`,
        borderRadius: "0.5rem",
        padding: "0.6rem 0.8rem",
        boxShadow: "var(--shadow-lg)",
        fontSize: "0.8rem",
      }}
    >
      {label !== undefined && label !== null && (
        <div style={{ fontWeight: 700, marginBottom: "0.25rem" }}>{label}</div>
      )}
      {payload.map((entry, index) => (
        <div key={index} style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: 4,
              background: entry.color || colors?.[index] || "var(--primary)",
            }}
          />
          <span style={{ color: chartTheme.text }}>
            {formatter ? formatter(entry) : `${entry.name}: ${formatMoney(entry.value)}`}
          </span>
        </div>
      ))}
    </div>
  );
}

/* Monthly spending over time (from recent expense activity). */
export function SpendingTrendChart({ transactions }) {
  const chartTheme = useChartTheme();
  const data = useMemo(() => {
    const months = new Map();
    transactions
      .filter((item) => item.type === "expense")
      .forEach((item) => {
        const key = new Date(item.date).toISOString().slice(0, 7);
        const label = new Date(item.date).toLocaleDateString(undefined, {
          month: "short",
          year: "2-digit",
        });
        months.set(key, {
          key,
          label,
          amount: (months.get(key)?.amount || 0) + Number(item.amount || 0),
        });
      });
    return Array.from(months.values())
      .sort((a, b) => (a.key < b.key ? -1 : 1))
      .map((m) => ({ ...m, amount: Math.round(m.amount * 100) / 100 }));
  }, [transactions]);

  if (data.length === 0) {
    return (
      <EmptyState
        icon={null}
        title="No spending trend yet"
        message="Add expenses and your monthly spending trend will appear here."
      />
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="spendGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6C4BF4" stopOpacity={0.35} />
            <stop offset="100%" stopColor="#6C4BF4" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} vertical={false} />
        <XAxis dataKey="label" tick={{ fill: chartTheme.axis, fontSize: 12 }} axisLine={false} tickLine={false} />
        <YAxis
          tick={{ fill: chartTheme.axis, fontSize: 12 }}
          axisLine={false}
          tickLine={false}
          width={70}
          tickFormatter={(value) =>
            value >= 1000 ? `${Math.round(value / 1000)}k` : String(value)
          }
        />
        <Tooltip content={<ChartTooltip />} />
        <Area
          type="monotone"
          dataKey="amount"
          stroke="#6C4BF4"
          strokeWidth={2.5}
          fill="url(#spendGradient)"
          dot={{ r: 3, fill: "#6C4BF4" }}
          activeDot={{ r: 5 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

/* Category distribution (from recent expense activity). */
export function CategoryBreakdownChart({ transactions }) {
  const chartTheme = useChartTheme();
  const data = useMemo(() => {
    const categories = new Map();
    transactions
      .filter((item) => item.type === "expense")
      .forEach((item) => {
        const category = item.category || item.ai_category || "Other";
        categories.set(category, {
          name: category,
          value: (categories.get(category)?.value || 0) + Number(item.amount || 0),
        });
      });
    return Array.from(categories.values()).map((c) => ({
      ...c,
      value: Math.round(c.value * 100) / 100,
    }));
  }, [transactions]);

  if (data.length === 0) {
    return (
      <EmptyState
        icon={null}
        title="No category data yet"
        message="Your spending by category will appear here once you add expenses."
      />
    );
  }

  const colors = data.map((entry) => getCategoryConfig(entry.name).color);

  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          innerRadius="58%"
          outerRadius="82%"
          paddingAngle={3}
          strokeWidth={0}
          label={false}
        >
          {data.map((entry, index) => (
            <Cell key={entry.name} fill={colors[index % colors.length]} />
          ))}
        </Pie>
        <Tooltip content={<ChartTooltip />} />
        <Legend
          layout="horizontal"
          align="center"
          verticalAlign="bottom"
          wrapperStyle={{ fontSize: 12, color: chartTheme.text }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

/* Spending by group (from dashboard group summaries). */
export function GroupSpendingChart({ groups }) {
  const chartTheme = useChartTheme();
  const data = useMemo(
    () =>
      (groups || [])
        .map((group) => ({
          name: group.name,
          amount: Math.round(Number(group.total_expenses || 0) * 100) / 100,
        }))
        .filter((g) => g.amount > 0),
    [groups]
  );

  if (data.length === 0) {
    return (
      <EmptyState
        icon={null}
        title="No group spending yet"
        message="Spending per group will appear here once groups have expenses."
      />
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} vertical={false} />
        <XAxis
          dataKey="name"
          tick={{ fill: chartTheme.axis, fontSize: 12 }}
          axisLine={false}
          tickLine={false}
          interval={0}
          tickFormatter={(value) => (value.length > 10 ? `${value.slice(0, 10)}…` : value)}
        />
        <YAxis
          tick={{ fill: chartTheme.axis, fontSize: 12 }}
          axisLine={false}
          tickLine={false}
          width={70}
          tickFormatter={(value) =>
            value >= 1000 ? `${Math.round(value / 1000)}k` : String(value)
          }
        />
        <Tooltip content={<ChartTooltip />} />
        <Bar dataKey="amount" name="Spending" radius={[6, 6, 0, 0]}>
          {data.map((entry, index) => (
            <Cell key={entry.name} fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
