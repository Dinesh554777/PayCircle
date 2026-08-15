import { useEffect, useState } from "react";
import { Shield, Users, Users2, Receipt, Handshake, Activity, Wallet } from "lucide-react";
import Card from "../components/common/Card";
import Button from "../components/common/Button";
import StatCard from "../components/common/StatCard";
import Badge from "../components/common/Badge";
import Skeleton from "../components/common/Skeleton";
import ErrorState from "../components/common/ErrorState";
import { useToast } from "../components/common/Toast";
import { apiRequest } from "../api/client";
import { formatDate, formatMoney } from "../utils/format";

export default function AdminPage() {
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState(null);
  const toast = useToast();

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
        toast.success(`${updated.name} is now ${updated.is_active ? "active" : "disabled"}`);
      })
      .catch((err) => toast.error(err.message))
      .finally(() => setBusyId(null));
  }

  if (loading) {
    return (
      <div className="grid-3">
        <Skeleton type="card" style={{ height: 120 }} />
        <Skeleton type="card" style={{ height: 120 }} />
        <Skeleton type="card" style={{ height: 120 }} />
        <Skeleton type="card" style={{ height: 320 }} />
        <Skeleton type="card" style={{ height: 320 }} />
      </div>
    );
  }

  if (error) {
    return <ErrorState title="Something went wrong" message={error} onRetry={loadData} />;
  }

  const statCards = stats
    ? [
        { label: "Total Users", value: String(stats.total_users), icon: Users, tone: "primary" },
        { label: "Active Users", value: String(stats.active_users), icon: Users2, tone: "success" },
        { label: "Total Groups", value: String(stats.total_groups), icon: Users2, tone: "info" },
        { label: "Total Expenses", value: String(stats.total_expenses), icon: Receipt, tone: "warning" },
        { label: "Total Settlements", value: String(stats.total_settlements), icon: Handshake, tone: "danger" },
        { label: "Total Transactions", value: String(stats.total_transactions), icon: Activity, tone: "neutral" },
        { label: "Amount Spent", value: formatMoney(stats.total_amount_spent), countUp: Number(stats.total_amount_spent || 0), icon: Wallet, tone: "primary" },
      ]
    : [];

  return (
    <>
      <div className="flex justify-between items-end gap-3 wrap mb-4">
        <div>
          <h2 className="mb-1">
            <Shield aria-hidden="true" style={{ verticalAlign: "middle" }} /> Admin Dashboard
          </h2>
          <p className="text-secondary mb-0">System overview, user management and platform statistics.</p>
        </div>
      </div>

      <div className="grid-3 mb-4">
        {statCards.map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </div>

      <Card title={`Users (${users.length})`} className="mb-4">
        <div className="table-responsive">
          <table className="table table-hover">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Groups</th>
                <th>Status</th>
                <th>Joined</th>
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr>
                  <td colSpan={7}>No users yet.</td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id}>
                    <td className="text-semibold">{user.name}</td>
                    <td>{user.email}</td>
                    <td>
                      <Badge variant={user.is_admin ? "primary" : "neutral"}>
                        {user.is_admin ? "Admin" : "Member"}
                      </Badge>
                    </td>
                    <td>{user.groups_count}</td>
                    <td>
                      <Badge variant={user.is_active ? "success" : "danger"}>
                        {user.is_active ? "Active" : "Disabled"}
                      </Badge>
                    </td>
                    <td>{formatDate(user.created_at)}</td>
                    <td style={{ textAlign: "right" }}>
                      {!user.is_admin && (
                        <Button
                          type="button"
                          size="sm"
                          variant={user.is_active ? "danger" : "primary"}
                          onClick={() => toggleUserStatus(user)}
                          loading={busyId === user.id}
                        >
                          {user.is_active ? "Disable" : "Enable"}
                        </Button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Card title={`Groups (${groups.length})`}>
        <div className="table-responsive">
          <table className="table table-hover">
            <thead>
              <tr>
                <th>Name</th>
                <th>Description</th>
                <th>Members</th>
                <th>Expenses</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {groups.length === 0 ? (
                <tr>
                  <td colSpan={5}>No groups yet.</td>
                </tr>
              ) : (
                groups.map((group) => (
                  <tr key={group.id}>
                    <td className="text-semibold">{group.name}</td>
                    <td>{group.description || "—"}</td>
                    <td>{group.member_count}</td>
                    <td>{group.expense_count}</td>
                    <td>{formatDate(group.created_at)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}
