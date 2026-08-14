import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import Card from "../components/common/Card";
import Button from "../components/common/Button";
import { apiRequest } from "../api/client";

function formatDate(value) {
  return value ? new Date(value).toLocaleDateString() : "";
}

export default function ExpenseDetails() {
  const { id, expenseId } = useParams();
  const navigate = useNavigate();
  const [expense, setExpense] = useState(null);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState(false);

  async function loadExpense() {
    try {
      const data = await apiRequest(`/groups/${id}/expenses/${expenseId}`, { auth: true });
      setExpense(data);
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    loadExpense();
  }, [id, expenseId]);

  async function handleDelete() {
    setError("");
    if (!window.confirm("Delete this expense? This cannot be undone.")) return;
    setDeleting(true);
    try {
      await apiRequest(`/groups/${id}/expenses/${expenseId}`, {
        method: "DELETE",
        auth: true,
      });
      navigate(`/groups/${id}/expenses`);
    } catch (err) {
      setError(err.message);
      setDeleting(false);
    }
  }

  if (error && !expense) {
    return (
      <div>
        <h1>Expense</h1>
        <p style={{ color: "#dc2626" }}>{error}</p>
        <Link to={`/groups/${id}/expenses`}>Back to expenses</Link>
      </div>
    );
  }

  if (!expense) return <p>Loading...</p>;

  return (
    <div style={{ maxWidth: 560 }}>
      <Link to={`/groups/${id}/expenses`}>&larr; Back to expenses</Link>
      <h1>{expense.title}</h1>

      {error && <p style={{ color: "#dc2626" }}>{error}</p>}

      <Card title="Overview">
        <p>
          Amount: <strong>₹{expense.amount}</strong>
        </p>
        <p>Paid by: {expense.paid_by_user?.name}</p>
        <p>Date: {formatDate(expense.expense_date || expense.created_at)}</p>
        <p>Split method: {expense.split_method}</p>
        {expense.category && (
          <p>
            Category: <strong>{expense.category}</strong>{" "}
            {expense.ai_category && (
              <span
                title={`AI-generated (${Math.round((expense.ai_confidence ?? 0) * 100)}% confidence)`}
                style={{
                  fontSize: "0.75rem",
                  background: "#f5f3ff",
                  color: "#7c3aed",
                  padding: "0.1rem 0.4rem",
                  borderRadius: "0.25rem",
                  border: "1px solid #ddd6fe",
                }}
              >
                AI
              </span>
            )}
          </p>
        )}
        {expense.description && <p>Description: {expense.description}</p>}
      </Card>

      <Card title={`Split (${expense.splits.length})`}>
        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {expense.splits.map((split) => (
            <li
              key={split.id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "0.5rem 0",
                borderBottom: "1px solid #e5e7eb",
              }}
            >
              <span>{split.user?.name}</span>
              <strong>₹{split.amount}</strong>
            </li>
          ))}
        </ul>
      </Card>

      <div style={{ display: "flex", gap: "0.5rem" }}>
        <Link to={`/groups/${id}/expenses/${expenseId}/edit`}>
          <Button>Edit</Button>
        </Link>
        <Button variant="secondary" onClick={handleDelete} disabled={deleting}>
          {deleting ? "Deleting..." : "Delete"}
        </Button>
      </div>
    </div>
  );
}
