import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Card from "../components/common/Card";
import Input from "../components/common/Input";
import Button from "../components/common/Button";
import { apiRequest } from "../api/client";
import { useAuth } from "../context/AuthContext";

function formatMoney(value) {
  const num = Number(value);
  return `₹${num.toFixed(2)}`;
}

function formatDate(value) {
  return value ? new Date(value).toLocaleDateString() : "";
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [quickGroupId, setQuickGroupId] = useState("");

  function loadDashboard() {
    setLoading(true);
    setError("");
    apiRequest("/dashboard", { auth: true })
      .then((dashboard) => {
        setData(dashboard);
        if (dashboard.recent_groups.length > 0 && !quickGroupId) {
          setQuickGroupId(String(dashboard.recent_groups[0].id));
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  function handleQuickAdd(event) {
    event.preventDefault();
    if (quickGroupId) {
      navigate(`/groups/${quickGroupId}/expenses/new`);
    }
  }

  const firstName = user?.name ? user.name.split(" ")[0] : "there";

  const stats = data
    ? [
        { label: "Total Expenses", value: formatMoney(data.total_expenses), color: "#1f2937" },
        { label: "Amount Paid", value: formatMoney(data.amount_paid), color: "#4f46e5" },
        { label: "Amount Owed", value: formatMoney(data.amount_owed), color: "#dc2626" },
        { label: "Amount to Receive", value: formatMoney(data.amount_to_receive), color: "#15803d" },
      ]
    : [];

  return (
    <div style={{ maxWidth: 960 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "1rem",
        }}
      >
        <div>
          <h1 style={{ marginBottom: "0.25rem" }}>Dashboard</h1>
          <p style={{ color: "#6b7280", marginTop: 0 }}>
            Welcome back, {firstName}. Here's your money at a glance.
          </p>
        </div>
        {data && data.recent_groups.length > 0 ? (
          <form
            onSubmit={handleQuickAdd}
            style={{ display: "flex", gap: "0.5rem", alignItems: "flex-end" }}
          >
            <div style={{ width: 180 }}>
              <Input
                label="Group"
                name="quickGroup"
                type="select"
                options={data.recent_groups.map((g) => ({ id: g.id, name: g.name }))}
                value={quickGroupId}
                onChange={(e) => setQuickGroupId(e.target.value)}
              />
            </div>
            <Button type="submit" style={{ marginBottom: "1rem" }}>
              Quick Add Expense
            </Button>
          </form>
        ) : (
          <Link to="/groups">
            <Button>Create a Group</Button>
          </Link>
        )}
      </div>

      {loading ? (
        <p>Loading dashboard...</p>
      ) : error ? (
        <Card title="Something went wrong">
          <p style={{ color: "#dc2626" }}>{error}</p>
          <Button onClick={loadDashboard}>Retry</Button>
        </Card>
      ) : (
        <>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: "1rem",
              marginBottom: "1rem",
            }}
          >
            {stats.map((stat) => (
              <section
                key={stat.label}
                style={{
                  background: "#fff",
                  border: "1px solid #e5e7eb",
                  borderRadius: "0.5rem",
                  padding: "1.25rem",
                }}
              >
                <div style={{ fontSize: "0.875rem", color: "#6b7280" }}>
                  {stat.label}
                </div>
                <div style={{ fontSize: "1.5rem", fontWeight: 700, color: stat.color }}>
                  {stat.value}
                </div>
              </section>
            ))}
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))",
              gap: "1rem",
            }}
          >
            <Card title={`Your Groups (${data.group_count})`}>
              {data.recent_groups.length === 0 ? (
                <p>
                  No groups yet.{" "}
                  <Link to="/groups">Create your first group</Link> to start
                  splitting expenses.
                </p>
              ) : (
                <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                  {data.recent_groups.map((group) => (
                    <li
                      key={group.id}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "0.6rem 0",
                        borderBottom: "1px solid #e5e7eb",
                      }}
                    >
                      <div>
                        <Link to={`/groups/${group.id}`}>
                          <strong>{group.name}</strong>
                        </Link>
                        <div style={{ color: "#6b7280", fontSize: "0.875rem" }}>
                          {group.member_count} member{group.member_count === 1 ? "" : "s"}
                          {" · "}
                          {formatMoney(group.total_expenses)} total
                        </div>
                      </div>
                      <div
                        style={{
                          fontWeight: 600,
                          fontSize: "0.9rem",
                          color:
                            Number(group.my_balance) > 0
                              ? "#15803d"
                              : Number(group.my_balance) < 0
                                ? "#dc2626"
                                : "#6b7280",
                        }}
                      >
                        {Number(group.my_balance) > 0 ? "+" : ""}
                        {formatMoney(group.my_balance)}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              {data.recent_groups.length > 0 && (
                <p style={{ marginBottom: 0 }}>
                  <Link to="/groups">View all groups</Link>
                </p>
              )}
            </Card>

            <Card title="Recent Transactions">
              {data.recent_transactions.length === 0 ? (
                <p>
                  No activity yet.{" "}
                  <Link to="/groups">Pick a group</Link> and add an expense to get
                  started.
                </p>
              ) : (
                <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                  {data.recent_transactions.map((item, index) => (
                    <li
                      key={`${item.type}-${item.date}-${index}`}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "0.6rem 0",
                        borderBottom: "1px solid #e5e7eb",
                      }}
                    >
                      <div>
                        <div>
                          {item.type === "expense" ? (
                            <Link to={`/groups/${item.group?.id}/expenses`}>
                              <strong>{item.title || "Expense"}</strong>
                            </Link>
                          ) : (
                            <strong>
                              {item.payer?.name} → {item.receiver?.name}
                            </strong>
                          )}
                          <span
                            style={{
                              marginLeft: "0.5rem",
                              fontSize: "0.75rem",
                              background:
                                item.type === "expense" ? "#eef2ff" : "#ecfdf5",
                              color: item.type === "expense" ? "#4f46e5" : "#047857",
                              padding: "0.1rem 0.4rem",
                              borderRadius: "0.25rem",
                            }}
                          >
                            {item.type}
                          </span>
                        </div>
                        <div style={{ color: "#6b7280", fontSize: "0.875rem" }}>
                          {item.group?.name} · {formatDate(item.date)}
                        </div>
                      </div>
                      <strong style={{ color: "#1f2937" }}>
                        {formatMoney(item.amount)}
                      </strong>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
