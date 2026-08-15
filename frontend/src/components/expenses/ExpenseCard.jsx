import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import Card from "../common/Card";
import Badge from "../common/Badge";
import Avatar from "../common/Avatar";
import CategoryBadge from "./CategoryBadge";
import { formatDate, formatMoney } from "../../utils/format";

export default function ExpenseCard({ expense, groupId }) {
  return (
    <Card className="card-hover">
      <div className="flex justify-between items-start gap-2">
        <div className="flex items-center gap-2" style={{ minWidth: 0 }}>
          <CategoryBadge category={expense.category || expense.ai_category} showAi={Boolean(expense.ai_category)} aiConfidence={expense.ai_confidence} />
        </div>
        <Badge variant={expense.split_method === "equal" ? "info" : expense.split_method === "percentage" ? "warning" : "primary"}>
          {expense.split_method}
        </Badge>
      </div>

      <h3 className="text-base mb-1" style={{ marginTop: "0.75rem" }}>
        <Link to={`/groups/${groupId}/expenses/${expense.id}`} className="text-primary">
          {expense.title}
        </Link>
      </h3>

      <div className="text-2xl text-bold mb-2">{formatMoney(expense.amount)}</div>

      <div className="flex items-center gap-2 text-sm text-secondary">
        {expense.paid_by_user && (
          <>
            <Avatar name={expense.paid_by_user.name} size="sm" />
            <span>Paid by {expense.paid_by_user.name}</span>
          </>
        )}
      </div>
      <div className="text-sm text-muted mt-1">
        {formatDate(expense.expense_date || expense.created_at)}
      </div>

      <div className="card-footer" style={{ paddingTop: "0.75rem", marginTop: "0.75rem" }}>
        <span className="text-sm text-muted">Tap for details</span>
        <Link
          to={`/groups/${groupId}/expenses/${expense.id}`}
          className="btn btn-ghost btn-sm"
          aria-label={`View details for ${expense.title}`}
        >
          Details <ArrowUpRight aria-hidden="true" />
        </Link>
      </div>
    </Card>
  );
}
