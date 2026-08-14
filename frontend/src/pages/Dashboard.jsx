import { useEffect, useState } from "react";
import Card from "../components/common/Card";
import { apiRequest } from "../api/client";
import { useAuth } from "../context/AuthContext";

export default function Dashboard() {
  const { user } = useAuth();
  const [health, setHealth] = useState(null);

  useEffect(() => {
    apiRequest("/health")
      .then((data) => setHealth(data))
      .catch(() => setHealth({ status: "unreachable" }));
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
      <Card title="Quick Stats (Placeholder)">
        <ul>
          <li>Total groups: 0</li>
          <li>Pending settlements: 0</li>
          <li>This month spending: ₹0</li>
        </ul>
      </Card>
    </div>
  );
}
