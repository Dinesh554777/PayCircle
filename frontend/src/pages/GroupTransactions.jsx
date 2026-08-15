import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Card from "../components/common/Card";
import { apiRequest } from "../api/client";
import { formatDateTime, formatMoney } from "../utils/format";

export default function GroupTransactions() {
  const { id } = useParams();
  const [group, setGroup] = useState(null);
  const [feed, setFeed] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      apiRequest(`/groups/${id}`, { auth: true }),
      apiRequest(`/groups/${id}/transactions`, { auth: true }),
    ])
      .then(([g, items]) => {
        setGroup(g);
        setFeed(items);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (error && !group) {
    return (
      <div>
        <h1>Transactions</h1>
        <p style={{ color: "#dc2626" }}>{error}</p>
        <Link to="/groups">Back to groups</Link>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 640 }}>
      <Link to={`/groups/${id}`}>&larr; Back to {group?.name || "group"}</Link>
      <h1>Transactions</h1>

      {error && <p style={{ color: "#dc2626" }}>{error}</p>}

      {loading ? (
        <p>Loading...</p>
      ) : feed.length === 0 ? (
        <Card title="No activity yet">
          <p>Expenses and settlements will appear here.</p>
        </Card>
      ) : (
        feed.map((item, index) => (
          <Card key={`${item.type}-${item.date}-${index}`} title={item.type === "expense" ? item.title : "Settlement"}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div>
                <strong style={{ fontSize: "1.1rem" }}>{formatMoney(item.amount)}</strong>
                <span
                  style={{
                    marginLeft: "0.5rem",
                    fontSize: "0.8rem",
                    background: item.type === "expense" ? "#eef2ff" : "#ecfdf5",
                    color: item.type === "expense" ? "#4f46e5" : "#047857",
                    padding: "0.1rem 0.4rem",
                    borderRadius: "0.25rem",
                  }}
                >
                  {item.type}
                </span>
                {item.type === "settlement" && item.status && (
                  <span
                    style={{
                      marginLeft: "0.5rem",
                      fontSize: "0.8rem",
                      background: "#fef3c7",
                      color: "#b45309",
                      padding: "0.1rem 0.4rem",
                      borderRadius: "0.25rem",
                    }}
                  >
                    {item.status}
                  </span>
                )}
              </div>
              <span style={{ color: "#6b7280", fontSize: "0.875rem" }}>
                {formatDateTime(item.date)}
              </span>
            </div>

            {item.type === "expense" ? (
              <>
                <p style={{ color: "#6b7280", fontSize: "0.875rem", marginBottom: 0 }}>
                  Paid by {item.payer?.name}
                </p>
                <ul style={{ listStyle: "none", padding: 0, marginTop: "0.5rem" }}>
                  {item.splits.map((split) => (
                    <li
                      key={split.user_id}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        fontSize: "0.875rem",
                        color: "#4b5563",
                      }}
                    >
                      <span>{split.user?.name}</span>
                      <span>{formatMoney(split.amount)}</span>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <p style={{ color: "#6b7280", fontSize: "0.875rem", marginBottom: 0 }}>
                {item.payer?.name} paid {item.receiver?.name}
              </p>
            )}
          </Card>
        ))
      )}
    </div>
  );
}
