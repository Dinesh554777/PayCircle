import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Receipt, ScanLine, Wallet } from "lucide-react";
import Card from "../components/common/Card";
import Input from "../components/common/Input";
import Select from "../components/common/Select";
import Button from "../components/common/Button";
import Badge from "../components/common/Badge";
import ErrorState from "../components/common/ErrorState";
import Skeleton from "../components/common/Skeleton";
import Avatar from "../components/common/Avatar";
import ReceiptModal from "../components/ReceiptModal";
import { apiRequest } from "../api/client";
import { CURRENCY_SYMBOL } from "../utils/format";
import { useAuth } from "../context/AuthContext";

const METHODS = [
  { value: "equal", label: "Equal" },
  { value: "exact", label: "Exact" },
  { value: "percentage", label: "Percentage" },
];

export default function ExpenseForm() {
  const { id, expenseId } = useParams();
  const isEdit = Boolean(expenseId);
  const navigate = useNavigate();
  const { user } = useAuth();

  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [aiCategory, setAiCategory] = useState("");
  const [expenseDate, setExpenseDate] = useState("");
  const [splitMethod, setSplitMethod] = useState("equal");
  const [selected, setSelected] = useState([]);
  const [exactAmounts, setExactAmounts] = useState({});
  const [percentages, setPercentages] = useState({});
  const [payerSelected, setPayerSelected] = useState([]);
  const [payerAmounts, setPayerAmounts] = useState({});

  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);

  useEffect(() => {
    Promise.all([
      apiRequest(`/groups/${id}`, { auth: true }),
      isEdit
        ? apiRequest(`/groups/${id}/expenses/${expenseId}`, { auth: true })
        : Promise.resolve(null),
    ])
      .then(([group, expense]) => {
        const memberOptions = group.members.map((m) => ({
          value: String(m.user_id),
          label: m.user?.name || `User ${m.user_id}`,
        }));
        setMembers(memberOptions);

        if (expense) {
          setTitle(expense.title);
          setDescription(expense.description || "");
          setAmount(String(expense.amount));
          setCategory(expense.category || "");
          setAiCategory(expense.ai_category || "");
          setExpenseDate(expense.expense_date ? expense.expense_date.slice(0, 10) : "");
          setSplitMethod(expense.split_method || "equal");

          if (expense.split_method === "percentage") {
            const pct = {};
            expense.splits.forEach((s) => {
              const value =
                Number(expense.amount) > 0
                  ? ((Number(s.amount) / Number(expense.amount)) * 100).toFixed(2)
                  : "0";
              pct[s.user_id] = value;
            });
            setPercentages(pct);
          } else if (expense.split_method === "exact") {
            const exact = {};
            expense.splits.forEach((s) => {
              exact[s.user_id] = String(s.amount);
            });
            setExactAmounts(exact);
            setSelected(expense.splits.map((s) => s.user_id));
          } else {
            setSelected(expense.splits.map((s) => s.user_id));
          }

          if (expense.payments?.length) {
            setPayerSelected(expense.payments.map((p) => String(p.user_id)));
            const amounts = {};
            expense.payments.forEach((p) => {
              amounts[String(p.user_id)] = String(p.amount);
            });
            setPayerAmounts(amounts);
          } else {
            setPayerSelected([String(expense.paid_by)]);
            setPayerAmounts({ [String(expense.paid_by)]: String(expense.amount) });
          }
        } else {
          setSelected(memberOptions.map((m) => m.value));
          if (user?.id && memberOptions.some((m) => m.value === String(user.id))) {
            setPayerSelected([String(user.id)]);
          }
        }
      })
      .catch((err) => {
        setLoadError(err.message);
        setError(err.message);
      })
      .finally(() => setLoading(false));
  }, [id, expenseId, isEdit, user?.id]);

  const amountNum = Number(amount) || 0;
  const equalShare = selected.length > 0
    ? (Math.floor((amountNum / selected.length) * 100) / 100).toFixed(2)
    : "0.00";

  const splitTotal = useMemo(() => {
    if (splitMethod === "equal") {
      return selected.length > 0 ? amountNum : 0;
    }
    if (splitMethod === "exact") {
      return Object.values(exactAmounts).reduce((sum, v) => sum + (Number(v) || 0), 0);
    }
    return Object.values(percentages).reduce((sum, v) => sum + (Number(v) || 0), 0);
  }, [splitMethod, selected, exactAmounts, percentages, amountNum]);

  const totalValid =
    splitMethod === "percentage"
      ? Math.abs(splitTotal - 100) < 0.001
      : Math.abs(splitTotal - amountNum) < 0.001;

  const totalPaid = useMemo(
    () =>
      payerSelected.reduce(
        (sum, userId) => sum + (Number(payerAmounts[userId]) || 0),
        0
      ),
    [payerSelected, payerAmounts]
  );
  const remaining = amountNum - totalPaid;
  const paidValid = Math.abs(totalPaid - amountNum) < 0.005;

  function toggleMember(memberId) {
    setSelected((prev) =>
      prev.includes(memberId) ? prev.filter((m) => m !== memberId) : [...prev, memberId]
    );
  }

  function togglePayer(memberId) {
    setPayerSelected((prev) => {
      if (prev.includes(memberId)) {
        setPayerAmounts((amounts) => {
          const next = { ...amounts };
          delete next[memberId];
          return next;
        });
        return prev.filter((m) => m !== memberId);
      }
      return [...prev, memberId];
    });
  }

  function buildPayload() {
    const payments = payerSelected
      .map((userId) => ({
        user_id: Number(userId),
        amount: String(Number(payerAmounts[userId]) || 0),
      }))
      .filter((p) => p.amount > 0);
    const primaryPayer = payments.reduce(
      (top, p) => (p.amount > top.amount ? p : top),
      payments[0] || { user_id: Number(members[0]?.value || 0), amount: 0 }
    );
    const base = {
      title,
      description: description || null,
      amount: String(amountNum),
      category: category || null,
      paid_by: primaryPayer.user_id,
      expense_date: expenseDate ? new Date(expenseDate).toISOString() : null,
      split_method: splitMethod,
      payments,
    };
    if (splitMethod === "equal") {
      return { ...base, participants: selected.map(Number) };
    }
    if (splitMethod === "exact") {
      return {
        ...base,
        exact_amounts: Object.entries(exactAmounts)
          .filter(([, v]) => Number(v) > 0)
          .map(([userId, v]) => ({ user_id: Number(userId), amount: String(v) })),
      };
    }
    return {
      ...base,
      percentages: Object.entries(percentages)
        .filter(([, v]) => Number(v) > 0)
        .map(([userId, v]) => ({ user_id: Number(userId), percentage: String(v) })),
    };
  }

  function handleUseReceipt(info) {
    setTitle(info.title);
    setAmount(info.amount);
    if (info.category) setCategory(info.category);
    if (info.expenseDate) setExpenseDate(info.expenseDate);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    if (!amountNum || amountNum <= 0) {
      setError("Amount must be greater than 0");
      return;
    }
    if (payerSelected.length === 0) {
      setError("Select at least one person who paid");
      return;
    }
    const zeroPayer = payerSelected.find(
      (userId) => !(Number(payerAmounts[userId]) > 0)
    );
    if (zeroPayer) {
      const member = members.find((m) => m.value === zeroPayer);
      setError(`Enter a payment amount greater than 0 for ${member?.label || "the selected payer"}`);
      return;
    }
    if (!paidValid) {
      setError(
        `⚠ Payment amounts must total ${CURRENCY_SYMBOL}${amountNum.toFixed(2)}.`
      );
      return;
    }
    if (splitMethod === "equal" && selected.length === 0) {
      setError("Select at least one participant");
      return;
    }
    if (!totalValid) {
      setError(
        splitMethod === "percentage"
          ? "Percentages must add up to 100"
          : "Split total must equal the expense amount"
      );
      return;
    }
    setSubmitting(true);
    try {
      if (isEdit) {
        await apiRequest(`/groups/${id}/expenses/${expenseId}`, {
          method: "PUT",
          body: buildPayload(),
          auth: true,
        });
      } else {
        await apiRequest(`/groups/${id}/expenses`, {
          method: "POST",
          body: buildPayload(),
          auth: true,
        });
      }
      navigate(`/groups/${id}/expenses`);
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <Card>
        <Skeleton lines={6} />
      </Card>
    );
  }

  if (loadError) {
    return (
      <>
        <Link to={`/groups/${id}/expenses`} className="btn btn-ghost btn-sm mb-3">
          <ArrowLeft aria-hidden="true" /> Back to expenses
        </Link>
        <ErrorState title="Could not load this page" message={loadError} />
      </>
    );
  }

  return (
    <>
      <Link to={`/groups/${id}/expenses`} className="btn btn-ghost btn-sm mb-3">
        <ArrowLeft aria-hidden="true" /> Back to expenses
      </Link>

      <div className="flex justify-between items-center gap-3 wrap mb-4">
        <div>
          <h2 className="mb-1">{isEdit ? "Edit Expense" : "Add Expense"}</h2>
          <p className="text-secondary mb-0">
            {isEdit ? "Update the expense details below." : "Split a new expense with your group."}
          </p>
        </div>
        {!isEdit && (
          <Button variant="secondary" onClick={() => setShowReceipt(true)}>
            <ScanLine aria-hidden="true" /> Scan Receipt
          </Button>
        )}
      </div>

      <form onSubmit={handleSubmit} style={{ maxWidth: 560 }}>
        <Card title="Expense details" className="mb-4">
          <Input
            label="Title"
            name="title"
            required
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <Input
            label="Description (optional)"
            name="description"
            textarea
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <Input
            label={`Amount (${CURRENCY_SYMBOL})`}
            name="amount"
            type="number"
            step="0.01"
            min="0"
            required
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
          <div className="grid-2 gap-2">
            <Select
              label="Category"
              name="category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              options={["Food", "Transport", "Entertainment", "Shopping", "Utilities", "Healthcare", "Education", "Travel", "Rent", "Other"].map((c) => ({ value: c, label: c }))}
              placeholder="Auto (AI)"
            />
            <Input
              label="Expense date"
              name="expenseDate"
              type="date"
              value={expenseDate}
              onChange={(e) => setExpenseDate(e.target.value)}
            />
          </div>
          {isEdit && aiCategory ? (
            <p className="text-muted text-sm">
              Currently categorized as <Badge variant="primary">{aiCategory}</Badge> by AI.
            </p>
          ) : (
            <p className="text-muted text-sm">Leave category empty to auto-categorize with AI.</p>
          )}
        </Card>

        <Card title="Paid by" className="mb-4">
          <p className="text-sm text-secondary mb-3">
            Select one or more payers and enter how much each person paid. Payments
            must add up to the expense amount.
          </p>
          <div className="member-list">
            {members.map((member) => {
              const isPayer = payerSelected.includes(member.value);
              return (
                <div key={member.value} className="member-row">
                  <label className="selectable-row" style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 0 }}>
                    <input
                      type="checkbox"
                      className="checkbox"
                      checked={isPayer}
                      onChange={() => togglePayer(member.value)}
                    />
                    <Avatar name={member.label} size="sm" />
                    <span style={{ flex: 1 }}>{member.label}</span>
                  </label>
                  {isPayer && (
                    <div className="input-wrap" style={{ width: 120 }}>
                      <input
                        type="number"
                        className="input"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        aria-label={`${member.label} paid amount`}
                        value={payerAmounts[member.value] || ""}
                        onChange={(e) =>
                          setPayerAmounts((prev) => ({
                            ...prev,
                            [member.value]: e.target.value,
                          }))
                        }
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <div
            className={`split-total${paidValid ? " split-total-ok" : " split-total-bad"}`}
          >
            <span>
              <Wallet aria-hidden="true" style={{ verticalAlign: "-2px", marginRight: 4 }} />
              Total paid:
            </span>
            <strong>
              {totalPaid.toFixed(2)} / {amountNum.toFixed(2)}
              {paidValid ? " ✓" : ""}
            </strong>
          </div>
          {!paidValid && (
            <p className="form-error mb-0">
              ⚠ Payment amounts must total {CURRENCY_SYMBOL}{amountNum.toFixed(2)}
              {remaining > 0
                ? ` — ${CURRENCY_SYMBOL}${remaining.toFixed(2)} remaining.`
                : ` — ${CURRENCY_SYMBOL}${Math.abs(remaining).toFixed(2)} too much.`}
            </p>
          )}
        </Card>

        <Card title="Split" className="mb-4">
          <div className="flex gap-2 wrap mb-3">
            {METHODS.map((m) => (
              <button
                key={m.value}
                type="button"
                className={`chip${splitMethod === m.value ? " chip-active" : ""}`}
                onClick={() => setSplitMethod(m.value)}
                aria-pressed={splitMethod === m.value}
              >
                {m.label}
              </button>
            ))}
          </div>

          {splitMethod === "equal" && (
            <div>
              <p className="text-sm text-secondary mb-3">
                Each selected member pays <strong>{CURRENCY_SYMBOL}{equalShare}</strong>.
              </p>
              <div className="member-list">
                {members.map((member) => {
                  const isChecked = selected.includes(member.value);
                  return (
                    <label key={member.value} className="member-row selectable-row">
                      <input
                        type="checkbox"
                        className="checkbox"
                        checked={isChecked}
                        onChange={() => toggleMember(member.value)}
                      />
                      <Avatar name={member.label} size="sm" />
                      <span className="flex-1">{member.label}</span>
                      <span className="text-muted text-sm">{isChecked ? `pays ${CURRENCY_SYMBOL}${equalShare}` : "not split"}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {splitMethod === "exact" && (
            <div className="member-list">
              {members.map((member) => (
                <div key={member.value} className="member-row">
                  <Avatar name={member.label} size="sm" />
                  <span style={{ flex: 1 }}>{member.label}</span>
                  <div className="input-wrap" style={{ width: 130 }}>
                    <input
                      type="number"
                      className="input"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      value={exactAmounts[member.value] || ""}
                      onChange={(e) => {
                        setExactAmounts((prev) => ({ ...prev, [member.value]: e.target.value }));
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          {splitMethod === "percentage" && (
            <div className="member-list">
              {members.map((member) => (
                <div key={member.value} className="member-row">
                  <Avatar name={member.label} size="sm" />
                  <span style={{ flex: 1 }}>{member.label}</span>
                  <div className="input-wrap" style={{ width: 110 }}>
                    <input
                      type="number"
                      className="input"
                      step="0.01"
                      min="0"
                      placeholder="0"
                      value={percentages[member.value] || ""}
                      onChange={(e) => {
                        setPercentages((prev) => ({ ...prev, [member.value]: e.target.value }));
                      }}
                    />
                  </div>
                  <span className="text-muted">%</span>
                </div>
              ))}
            </div>
          )}

          <div
            className={`split-total${totalValid ? " split-total-ok" : " split-total-bad"}`}
          >
            <span>{splitMethod === "percentage" ? "Percentage" : "Split"} total:</span>
            <strong>
              {splitTotal.toFixed(2)}
              {splitMethod === "percentage" ? "%" : ` of ${CURRENCY_SYMBOL}${amountNum.toFixed(2)}`}
            </strong>
            {!totalValid && <span className="text-sm">— totals don't match</span>}
          </div>
        </Card>

        {error && <p className="form-error">{error}</p>}
        <div className="flex gap-2 items-center">
          <Button type="submit" loading={submitting} icon={Receipt}>
            {isEdit ? "Save Changes" : "Add Expense"}
          </Button>
          <Link to={`/groups/${id}/expenses`} className="btn btn-ghost">
            Cancel
          </Link>
        </div>
      </form>

      <ReceiptModal
        open={showReceipt}
        onClose={() => setShowReceipt(false)}
        onUseReceipt={handleUseReceipt}
      />
    </>
  );
}
