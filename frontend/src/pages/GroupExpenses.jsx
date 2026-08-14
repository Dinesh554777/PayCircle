import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Card from "../components/common/Card";
import Button from "../components/common/Button";
import { apiRequest } from "../api/client";

function formatDate(value) {
  return value ? new Date(value).toLocaleDateString() : "";
}

export default function GroupExpenses() {
  const { id } = useParams();
  const [group, setGroup] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      apiRequest(`/groups/${id}`, { auth: true }),
      apiRequest(`/groups/${id}/expenses`, { auth: true }),
    ])
      .then(([g, e]) => {
        setGroup(g);
        setExpenses(e);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (error && !group) {
    return (
      <div>
        <h1>Expenses</h1>
        <p style={{ color: "#dc2626" }}>{error}</p>
        <Link to="/groups">Back to groups</Link>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 640 }}>
      <Link to={`/groups/${id}`}>&larr; Back to {group?.name || "group"}</Link>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <h1>Expenses</h1>
        <Link to={`/groups/${id}/expenses/new`}>
          <Button>Add Expense</Button>
        </Link>
      </div>

      {error && <p style={{ color: "#dc2626" }}>{error}</p>}

      {loading ? (
        <p>Loading...</p>
      ) : expenses.length === 0 ? (
        <Card title="No expenses yet">
          <p>Add the first expense for this group.</p>
        </Card>
      ) : (
        expenses.map((expense) => (
          <Card key={expense.id} title={expense.title}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div>
                <strong style={{ fontSize: "1.1rem" }}>₹{expense.amount}</strong>
                <span
                  style={{
                    marginLeft: "0.5rem",
                    fontSize: "0.8rem",
                    background: "#eef2ff",
                    color: "#4f46e5",
                    padding: "0.1rem 0.4rem",
                    borderRadius: "0.25rem",
                  }}
                >
                  {expense.split_method}
                </span>
                {expense.category && (
                  <span
                    style={{
                      marginLeft: "0.5rem",
                      fontSize: "0.8rem",
                      background: "#ecfdf5",
                      color: "#047857",
                      padding: "0.1rem 0.4rem",
                      borderRadius: "0.25rem",
                    }}
                  >
                    {expense.category}
                  </span>
                )}
                {expense.ai_category && (
                  <span
                    title="AI-generated category"
                    style={{
                      marginLeft: "0.25rem",
                      fontSize: "0.7rem",
                      background: "#f5f3ff",
                      color: "#7c3aed",
                      padding: "0.1rem 0.35rem",
                      borderRadius: "0.25rem",
                      border: "1px solid #ddd6fe",
                    }}
                  >
                    AI
                  </span>
                )}
              </div>
              <Link to={`/groups/${id}/expenses/${expense.id}`}>Details</Link>
            </div>
            <p style={{ color: "#6b7280", fontSize: "0.875rem", marginBottom: 0 }}>
              Paid by {expense.paid_by_user?.name} on{" "}
              {formatDate(expense.expense_date || expense.created_at)}
            </p>
          </Card>
        ))
      )}
    </div>
  );
}
