import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Pencil, Trash2 } from "lucide-react";
import Card from "../components/common/Card";
import Button from "../components/common/Button";
import ConfirmModal from "../components/common/ConfirmModal";
import Badge from "../components/common/Badge";
import Avatar from "../components/common/Avatar";
import Skeleton from "../components/common/Skeleton";
import ErrorState from "../components/common/ErrorState";
import CategoryBadge from "../components/expenses/CategoryBadge";
import { useToast } from "../components/common/Toast";
import { apiRequest } from "../api/client";
import { formatDate, formatMoney } from "../utils/format";

export default function ExpenseDetails() {
  const { id, expenseId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [expense, setExpense] = useState(null);
  const [error, setError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function loadExpense() {
    try {
      const data = await apiRequest(`/groups/${id}/expenses/${expenseId}`, { auth: true });
      setExpense(data);
      setError("");
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    loadExpense();
  }, [id, expenseId]);

  async function handleDelete() {
    setDeleting(true);
    try {
      await apiRequest(`/groups/${id}/expenses/${expenseId}`, {
        method: "DELETE",
        auth: true,
      });
      setConfirmDelete(false);
      toast.success("Expense deleted");
      navigate(`/groups/${id}/expenses`);
    } catch (err) {
      toast.error(err.message);
      setDeleting(false);
    }
  }

  if (error && !expense) {
    return <ErrorState title="Couldn't load expense" message={error} onRetry={loadExpense} />;
  }

  if (!expense) {
    return (
      <Card>
        <Skeleton lines={5} />
      </Card>
    );
  }

  return (
    <>
      <Link to={`/groups/${id}/expenses`} className="btn btn-ghost btn-sm mb-3">
        <ArrowLeft aria-hidden="true" /> Back to expenses
      </Link>

      <div className="flex justify-between items-start gap-3 wrap mb-4">
        <div>
          <h2 className="mb-1">{expense.title}</h2>
          <div className="flex items-center gap-2 wrap">
            {expense.category || expense.ai_category ? (
              <CategoryBadge category={expense.category || expense.ai_category} showAi={Boolean(expense.ai_category)} aiConfidence={expense.ai_confidence} />
            ) : null}
            <Badge variant={expense.split_method === "equal" ? "info" : expense.split_method === "percentage" ? "warning" : "primary"}>
              {expense.split_method} split
            </Badge>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link to={`/groups/${id}/expenses/${expenseId}/edit`}>
            <Button variant="secondary" size="sm">
              <Pencil aria-hidden="true" /> Edit
            </Button>
          </Link>
          <Button variant="danger" size="sm" onClick={() => setConfirmDelete(true)}>
            <Trash2 aria-hidden="true" /> Delete
          </Button>
        </div>
      </div>

      <div className="grid-2 mb-4">
        <Card title="Overview">
          <div className="expense-amount">{formatMoney(expense.amount)}</div>
          <dl className="detail-list">
            <div>
              <dt>Paid by</dt>
              <dd className="flex items-center gap-2">
                {(expense.payments?.length
                  ? expense.payments.map((p) => p.user?.name || `User ${p.user_id}`).join(", ")
                  : expense.paid_by_user?.name) || "—"}
              </dd>
            </div>
            <div>
              <dt>Date</dt>
              <dd>{formatDate(expense.expense_date || expense.created_at)}</dd>
            </div>
            {expense.description && (
              <div>
                <dt>Description</dt>
                <dd>{expense.description}</dd>
              </div>
            )}
          </dl>
        </Card>

        <Card title={`Paid (${expense.payments?.length || 0})`}>
          <ul className="member-list">
            {(expense.payments?.length
              ? expense.payments
              : [
                  {
                    id: "legacy",
                    user_id: expense.paid_by,
                    amount: expense.amount,
                    user: expense.paid_by_user,
                  },
                ]
            ).map((payment) => (
              <li key={payment.id} className="member-row">
                <Avatar name={payment.user?.name} size="sm" />
                <span className="text-secondary" style={{ flex: 1 }}>
                  {payment.user?.name}
                </span>
                <span className="text-semibold">{formatMoney(payment.amount)}</span>
              </li>
            ))}
          </ul>
        </Card>

        <Card title={`Split (${expense.splits.length})`}>
          <ul className="member-list">
            {expense.splits.map((split) => (
              <li key={split.id} className="member-row">
                <Avatar name={split.user?.name} size="sm" />
                <span className="text-secondary" style={{ flex: 1 }}>
                  {split.user?.name}
                </span>
                <span className="text-semibold">{formatMoney(split.amount)}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      {expense.ai_category && expense.ai_confidence != null && (
        <p className="text-muted text-xs mb-0">
          Category was auto-generated by AI ({Math.round(expense.ai_confidence * 100)}% confidence).
        </p>
      )}

      <ConfirmModal
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={handleDelete}
        title="Delete expense"
        message="Delete this expense? This cannot be undone."
        confirmLabel="Delete"
        loading={deleting}
      />
    </>
  );
}
