import { useEffect, useState } from "react";
import Card from "../components/common/Card";
import { apiRequest } from "../api/client";

export default function Dashboard() {
  const [health, setHealth] = useState(null);

  useEffect(() => {
    apiRequest("/health")
      .then((data) => setHealth(data))
      .catch(() => setHealth({ status: "unreachable" }));
  }, []);

  return (
    <div>
      <h1>Dashboard</h1>
      <Card title="Welcome to PayCircle">
        <p>This is a placeholder dashboard. Core features are coming in later phases.</p>
        {health && (
          <p>
            Backend status: <strong>{health.status}</strong>{" "}
            {health.version ? `(v${health.version})` : ""}
          </p>
        )}
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
