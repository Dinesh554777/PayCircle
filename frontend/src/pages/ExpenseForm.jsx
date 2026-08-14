import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import Card from "../components/common/Card";
import Input from "../components/common/Input";
import Button from "../components/common/Button";
import { apiRequest } from "../api/client";

const METHODS = [
  { value: "equal", label: "Equal Split" },
  { value: "exact", label: "Exact Amounts" },
  { value: "percentage", label: "Percentage" },
];

export default function ExpenseForm() {
  const { id, expenseId } = useParams();
  const isEdit = Boolean(expenseId);
  const navigate = useNavigate();

  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [paidBy, setPaidBy] = useState("");
  const [expenseDate, setExpenseDate] = useState("");
  const [splitMethod, setSplitMethod] = useState("equal");
  const [selected, setSelected] = useState([]);
  const [exactAmounts, setExactAmounts] = useState({});
  const [percentages, setPercentages] = useState({});

  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    Promise.all([
      apiRequest(`/groups/${id}`, { auth: true }),
      isEdit ? apiRequest(`/groups/${id}/expenses/${expenseId}`, { auth: true }) : Promise.resolve(null),
    ])
      .then(([group, expense]) => {
        const memberOptions = group.members.map((m) => ({
          id: m.user_id,
          name: m.user.name,
          email: m.user.email,
        }));
        setMembers(memberOptions);

        if (expense) {
          setTitle(expense.title);
          setDescription(expense.description || "");
          setAmount(String(expense.amount));
          setCategory(expense.category || "");
          setPaidBy(String(expense.paid_by));
          setExpenseDate(expense.expense_date ? expense.expense_date.slice(0, 10) : "");
          setSplitMethod(expense.split_method || "equal");

          if (expense.split_method === "percentage") {
            const pct = {};
            expense.splits.forEach((s) => {
              const value = Number(expense.amount) > 0
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
        } else {
          setSelected(memberOptions.map((m) => m.id));
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id, expenseId, isEdit]);

  const amountNum = Number(amount) || 0;

  const splitTotal = useMemo(() => {
    if (splitMethod === "equal") {
      return selected.length > 0 ? Math.round(amountNum * 100) / 100 : 0;
    }
    if (splitMethod === "exact") {
      return Object.values(exactAmounts).reduce(
        (sum, v) => sum + (Number(v) || 0),
        0
      );
    }
    return Object.values(percentages).reduce(
      (sum, v) => sum + (Number(v) || 0),
      0
    );
  }, [splitMethod, selected, exactAmounts, percentages, amountNum]);

  const totalValid =
    splitMethod === "percentage"
      ? Math.abs(splitTotal - 100) < 0.001
      : Math.abs(splitTotal - amountNum) < 0.001;

  function toggleMember(memberId) {
    setSelected((prev) =>
      prev.includes(memberId)
        ? prev.filter((m) => m !== memberId)
        : [...prev, memberId]
    );
  }

  function updateExact(memberId, value) {
    setExactAmounts((prev) => ({ ...prev, [memberId]: value }));
  }

  function updatePercentage(memberId, value) {
    setPercentages((prev) => ({ ...prev, [memberId]: value }));
  }

  function buildPayload() {
    const base = {
      title,
      description: description || null,
      amount: String(amountNum),
      category: category || null,
      paid_by: Number(paidBy),
      expense_date: expenseDate ? new Date(expenseDate).toISOString() : null,
      split_method: splitMethod,
    };
    if (splitMethod === "equal") {
      return { ...base, participants: selected };
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

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    if (!amountNum || amountNum <= 0) {
      setError("Amount must be greater than 0");
      return;
    }
    if (!paidBy) {
      setError("Select who paid");
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

  if (loading) return <p>Loading...</p>;

  const equalShare = selected.length > 0
    ? (Math.floor((amountNum / selected.length) * 100) / 100).toFixed(2)
    : "0.00";

  return (
    <div style={{ maxWidth: 560 }}>
      <Link to={`/groups/${id}/expenses`}>&larr; Back to expenses</Link>
      <h1>{isEdit ? "Edit Expense" : "Add Expense"}</h1>

      <form onSubmit={handleSubmit}>
        <Card title="Expense details">
          <Input
            label="Title"
            name="title"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <Input
            label="Description (optional)"
            name="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <Input
            label="Amount (₹)"
            name="amount"
            type="number"
            step="0.01"
            min="0"
            required
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
          <Input
            label="Category (optional)"
            name="category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          />
          <Input
            label="Paid by"
            name="paidBy"
            type="select"
            required
            value={paidBy}
            onChange={(e) => setPaidBy(e.target.value)}
            options={members}
          />
          <Input
            label="Expense date"
            name="expenseDate"
            type="date"
            value={expenseDate}
            onChange={(e) => setExpenseDate(e.target.value)}
          />
        </Card>

        <Card title="Split">
          <div style={{ display: "flex", gap: "1rem", marginBottom: "1rem" }}>
            {METHODS.map((m) => (
              <label key={m.value} style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
                <input
                  type="radio"
                  name="splitMethod"
                  value={m.value}
                  checked={splitMethod === m.value}
                  onChange={() => setSplitMethod(m.value)}
                />
                {m.label}
              </label>
            ))}
          </div>

          {splitMethod === "equal" && (
            <div>
              <p style={{ color: "#6b7280", fontSize: "0.875rem" }}>
                Each selected member pays ₹{equalShare}
              </p>
              {members.map((member) => (
                <label
                  key={member.id}
                  style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.25rem 0" }}
                >
                  <input
                    type="checkbox"
                    checked={selected.includes(member.id)}
                    onChange={() => toggleMember(member.id)}
                  />
                  {member.name}
                </label>
              ))}
            </div>
          )}

          {splitMethod === "exact" && (
            <div>
              {members.map((member) => (
                <div key={member.id} style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.25rem 0" }}>
                  <span style={{ flex: 1 }}>{member.name}</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={exactAmounts[member.id] || ""}
                    onChange={(e) => updateExact(member.id, e.target.value)}
                    style={{ width: 120, padding: "0.4rem", borderRadius: "0.375rem", border: "1px solid #d1d5db" }}
                  />
                </div>
              ))}
            </div>
          )}

          {splitMethod === "percentage" && (
            <div>
              {members.map((member) => (
                <div key={member.id} style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.25rem 0" }}>
                  <span style={{ flex: 1 }}>{member.name}</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0"
                    value={percentages[member.id] || ""}
                    onChange={(e) => updatePercentage(member.id, e.target.value)}
                    style={{ width: 120, padding: "0.4rem", borderRadius: "0.375rem", border: "1px solid #d1d5db" }}
                  />
                  %
                </div>
              ))}
            </div>
          )}

          <p style={{ color: totalValid ? "#15803d" : "#dc2626", fontWeight: 600 }}>
            {splitMethod === "percentage" ? "Percentage" : "Split"} total: {splitTotal.toFixed(2)}{" "}
            {splitMethod === "percentage" ? "%" : `of ₹${amountNum.toFixed(2)}`}
            {!totalValid && " — totals don't match"}
          </p>
        </Card>

        {error && <p style={{ color: "#dc2626", fontSize: "0.875rem" }}>{error}</p>}
        <Button type="submit" disabled={submitting}>
          {submitting ? "Saving..." : isEdit ? "Save Changes" : "Add Expense"}
        </Button>
      </form>
    </div>
  );
}
