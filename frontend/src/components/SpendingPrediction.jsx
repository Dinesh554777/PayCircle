import { useEffect, useState } from "react";
import Card from "./common/Card";
import { apiRequest } from "../api/client";

function formatMoney(value) {
  const num = Number(value);
  return `₹${num.toFixed(2)}`;
}

export default function SpendingPrediction() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiRequest("/ai/prediction", { auth: true })
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <Card title="Spending Prediction">
        <p>Loading prediction...</p>
      </Card>
    );
  }

  if (!data) return null;

  return (
    <Card title="Spending Prediction">
      {data.has_prediction ? (
        <>
          <p style={{ marginTop: 0 }}>
            Estimated spending for <strong>{data.period_label}</strong>:{" "}
            <span
              style={{ fontWeight: 700, fontSize: "1.25rem", color: "#4f46e5" }}
            >
              {formatMoney(data.predicted_amount)}
            </span>
          </p>
          <p style={{ color: "#6b7280", fontSize: "0.875rem" }}>{data.message}</p>
          {data.based_on_months.length > 0 && (
            <div style={{ marginTop: "0.5rem" }}>
              {data.based_on_months.map((month) => (
                <div
                  key={month.month}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: "0.875rem",
                    padding: "0.25rem 0",
                    borderBottom: "1px solid #f3f4f6",
                  }}
                >
                  <span>{month.label}</span>
                  <span style={{ color: "#6b7280" }}>
                    {formatMoney(month.amount)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        <p style={{ marginTop: 0 }}>{data.message}</p>
      )}
      <p style={{ fontSize: "0.75rem", color: "#9ca3af", marginBottom: 0 }}>
        Based on your monthly spending history. Rough estimate only.
      </p>
    </Card>
  );
}
