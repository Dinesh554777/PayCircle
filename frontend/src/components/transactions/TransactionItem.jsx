import { Link } from "react-router-dom";
import { Receipt, Handshake, CheckCircle2, Clock } from "lucide-react";
import Badge from "../common/Badge";
import CategoryBadge from "../expenses/CategoryBadge";
import { formatDateTime, formatMoney } from "../../utils/format";

export default function TransactionItem({ item, groupId }) {
  const isExpense = item.type === "expense";
  const category = item.category || item.ai_category;

  return (
    <div className="tx-item">
      <span
        className="tx-icon"
        style={{
          background: isExpense ? "var(--primary-soft-bg)" : "var(--success-bg)",
          color: isExpense ? "var(--primary)" : "var(--success-text)",
        }}
      >
        {isExpense ? <Receipt aria-hidden="true" /> : <Handshake aria-hidden="true" />}
      </span>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="flex items-center gap-2 wrap">
          {isExpense ? (
            <>
              <Link
                to={`/groups/${groupId}/expenses`}
                className="text-semibold text-primary text-sm"
              >
                {item.title || "Expense"}
              </Link>
              {category && <CategoryBadge category={category} />}
            </>
          ) : (
            <span className="text-semibold text-sm">
              {item.payer?.name} paid {item.receiver?.name}
            </span>
          )}
          {!isExpense && (
            <Badge variant={item.status === "completed" ? "success" : "warning"}>
              {item.status === "completed" ? (
                <>
                  <CheckCircle2 style={{ width: 12, height: 12 }} /> completed
                </>
              ) : (
                <>
                  <Clock style={{ width: 12, height: 12 }} /> pending
                </>
              )}
            </Badge>
          )}
        </div>
        <div className="text-xs text-muted mt-1">
          {item.group?.name && <>{item.group.name} · </>}
          {formatDateTime(item.date)}
          {isExpense && item.payer && <> · paid by {item.payer.name}</>}
        </div>
        {isExpense && item.splits && item.splits.length > 0 && (
          <div className="flex gap-3 text-xs text-muted mt-1 wrap">
            {item.splits.map((split) => (
              <span key={split.user_id}>
                {split.user?.name}: <span className="text-semibold text-secondary">{formatMoney(split.amount)}</span>
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="text-semibold" style={{ color: "var(--text-primary)", whiteSpace: "nowrap" }}>
        {formatMoney(item.amount)}
      </div>
    </div>
  );
}
