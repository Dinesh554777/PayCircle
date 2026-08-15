import { useEffect, useState } from "react";
import Card from "../components/common/Card";
import Button from "../components/common/Button";
import { apiRequest } from "../api/client";

function formatMoney(value) {
  const num = Number(value);
  return `₹${num.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(value) {
  return value ? new Date(value).toLocaleDateString() : "";
}

export default function AdminPage() {
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState(null);

  function loadData() {
    setLoading(true);
    setError("");
    Promise.all([
      apiRequest("/admin/stats", { auth: true }),
      apiRequest("/admin/users", { auth: true }),
      apiRequest("/admin/groups", { auth: true }),
    ])
      .then(([statsData, usersData, groupsData]) => {
        setStats(statsData);
        setUsers(usersData);
        setGroups(groupsData);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadData();
  }, []);

  function toggleUserStatus(user) {
    setBusyId(user.id);
    apiRequest(`/admin/users/${user.id}/status`, {
      method: "PATCH",
      auth: true,
      body: { is_active: !user.is_active },
    })
      .then((updated) => {
        setUsers((items) => items.map((item) => (item.id === updated.id ? updated : item)));
      })
      .catch((err) => setError(err.message))
      .finally(() => setBusyId(null));
  }

  if (loading) {
    return <p>Loading admin dashboard...</p>;
  }

  if (error) {
    return (
      <Card title="Something went wrong">
        <p style={{ color: "#dc2626" }}>{error}</p>
        <Button onClick={loadData}>Retry</Button>
      </Card>
    );
  }

  const statCards = stats
    ? [
        { label: "Total Users", value: stats.total_users },
        { label: "Active Users", value: stats.active_users },
        { label: "Total Groups", value: stats.total_groups },
        { label: "Total Expenses", value: stats.total_expenses },
        { label: "Total Settlements", value: stats.total_settlements },
        { label: "Total Transactions", value: stats.total_transactions },
      ]
    : [];

  return (
    <div style={{ maxWidth: 960 }}>
      <div>
        <h1 style={{ marginBottom: "0.25rem" }}>Admin Dashboard</h1>
        <p style={{ color: "#6b7280", marginTop: 0 }}>
          System overview, user management and platform statistics.
        </p>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
          gap: "1rem",
          marginBottom: "1.5rem",
        }}
      >
        {statCards.map((stat) => (
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
            <div style={{ fontSize: "1.5rem", fontWeight: 700 }}>{stat.value}</div>
          </section>
        ))}
        <section
          style={{
            background: "#fff",
            border: "1px solid #e5e7eb",
            borderRadius: "0.5rem",
            padding: "1.25rem",
          }}
        >
          <div style={{ fontSize: "0.875rem", color: "#6b7280" }}>
            Amount Spent
          </div>
          <div style={{ fontSize: "1.5rem", fontWeight: 700 }}>
            {formatMoney(stats?.total_amount_spent)}
          </div>
        </section>
      </div>

      <Card title={`Users (${users.length})`}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ textAlign: "left", color: "#6b7280", fontSize: "0.875rem" }}>
              <th style={{ padding: "0.5rem", borderBottom: "1px solid #e5e7eb" }}>Name</th>
              <th style={{ padding: "0.5rem", borderBottom: "1px solid #e5e7eb" }}>Email</th>
              <th style={{ padding: "0.5rem", borderBottom: "1px solid #e5e7eb" }}>Role</th>
              <th style={{ padding: "0.5rem", borderBottom: "1px solid #e5e7eb" }}>Groups</th>
              <th style={{ padding: "0.5rem", borderBottom: "1px solid #e5e7eb" }}>Status</th>
              <th style={{ padding: "0.5rem", borderBottom: "1px solid #e5e7eb" }}>Joined</th>
              <th style={{ padding: "0.5rem", borderBottom: "1px solid #e5e7eb" }}></th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} style={{ fontSize: "0.9rem" }}>
                <td style={{ padding: "0.5rem", borderBottom: "1px solid #e5e7eb" }}>
                  <strong>{user.name}</strong>
                </td>
                <td style={{ padding: "0.5rem", borderBottom: "1px solid #e5e7eb" }}>
                  {user.email}
                </td>
                <td style={{ padding: "0.5rem", borderBottom: "1px solid #e5e7eb" }}>
                  {user.is_admin ? "Admin" : "Member"}
                </td>
                <td style={{ padding: "0.5rem", borderBottom: "1px solid #e5e7eb" }}>
                  {user.groups_count}
                </td>
                <td style={{ padding: "0.5rem", borderBottom: "1px solid #e5e7eb" }}>
                  <span
                    style={{
                      background: user.is_active ? "#ecfdf5" : "#fee2e2",
                      color: user.is_active ? "#047857" : "#b91c1c",
                      padding: "0.1rem 0.5rem",
                      borderRadius: "0.25rem",
                      fontSize: "0.75rem",
                    }}
                  >
                    {user.is_active ? "Active" : "Disabled"}
                  </span>
                </td>
                <td style={{ padding: "0.5rem", borderBottom: "1px solid #e5e7eb" }}>
                  {formatDate(user.created_at)}
                </td>
                <td style={{ padding: "0.5rem", borderBottom: "1px solid #e5e7eb" }}>
                  {!user.is_admin && (
                    <Button
                      onClick={() => toggleUserStatus(user)}
                      disabled={busyId === user.id}
                      variant={user.is_active ? "danger" : "primary"}
                      style={{ fontSize: "0.8rem", padding: "0.3rem 0.7rem" }}
                    >
                      {user.is_active ? "Disable" : "Enable"}
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <div style={{ marginTop: "1.5rem" }}>
        <Card title={`Groups (${groups.length})`}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ textAlign: "left", color: "#6b7280", fontSize: "0.875rem" }}>
                <th style={{ padding: "0.5rem", borderBottom: "1px solid #e5e7eb" }}>Name</th>
                <th style={{ padding: "0.5rem", borderBottom: "1px solid #e5e7eb" }}>Description</th>
                <th style={{ padding: "0.5rem", borderBottom: "1px solid #e5e7eb" }}>Members</th>
                <th style={{ padding: "0.5rem", borderBottom: "1px solid #e5e7eb" }}>Expenses</th>
                <th style={{ padding: "0.5rem", borderBottom: "1px solid #e5e7eb" }}>Created</th>
              </tr>
            </thead>
            <tbody>
              {groups.map((group) => (
                <tr key={group.id} style={{ fontSize: "0.9rem" }}>
                  <td style={{ padding: "0.5rem", borderBottom: "1px solid #e5e7eb" }}>
                    <strong>{group.name}</strong>
                  </td>
                  <td style={{ padding: "0.5rem", borderBottom: "1px solid #e5e7eb" }}>
                    {group.description || "—"}
                  </td>
                  <td style={{ padding: "0.5rem", borderBottom: "1px solid #e5e7eb" }}>
                    {group.member_count}
                  </td>
                  <td style={{ padding: "0.5rem", borderBottom: "1px solid #e5e7eb" }}>
                    {group.expense_count}
                  </td>
                  <td style={{ padding: "0.5rem", borderBottom: "1px solid #e5e7eb" }}>
                    {formatDate(group.created_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
    </div>
  );
}
