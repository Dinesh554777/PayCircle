import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Card from "../components/common/Card";
import { apiRequest } from "../api/client";
import { useAuth } from "../context/AuthContext";

export default function Dashboard() {
  const { user } = useAuth();
  const [health, setHealth] = useState(null);
  const [groups, setGroups] = useState([]);

  useEffect(() => {
    apiRequest("/health")
      .then((data) => setHealth(data))
      .catch(() => setHealth({ status: "unreachable" }));
    apiRequest("/groups", { auth: true })
      .then((data) => setGroups(data))
      .catch(() => {});
  }, []);

  const firstName = user?.name ? user.name.split(" ")[0] : "there";

  return (
    <div>
      <h1>Dashboard</h1>
      <Card title={`Welcome back, ${firstName}`}>
        <p>You are signed in as {user?.email}.</p>
        <p>
          Backend status: <strong>{health?.status ?? "checking..."}</strong>{" "}
          {health?.version ? `(v${health.version})` : ""}
        </p>
      </Card>
      <Card title={`Your Groups (${groups.length})`}>
        {groups.length === 0 ? (
          <p>
            No groups yet. <Link to="/groups">Create your first group</Link> to
            start splitting expenses.
          </p>
        ) : (
          <ul>
            {groups.map((group) => (
              <li key={group.id}>
                <Link to={`/groups/${group.id}`}>{group.name}</Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
      <Card title="Quick Stats (Placeholder)">
        <ul>
          <li>Pending settlements: 0</li>
          <li>This month spending: ₹0</li>
        </ul>
      </Card>
    </div>
  );
}
