import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Plus, Receipt } from "lucide-react";
import Button from "../components/common/Button";
import SearchBar from "../components/common/SearchBar";
import Select from "../components/common/Select";
import Badge from "../components/common/Badge";
import EmptyState from "../components/common/EmptyState";
import ErrorState from "../components/common/ErrorState";
import Skeleton from "../components/common/Skeleton";
import CategoryBadge from "../components/expenses/CategoryBadge";
import { apiRequest } from "../api/client";
import { formatDate, formatMoney } from "../utils/format";

const SORT_OPTIONS = [
  { value: "date-desc", label: "Newest first" },
  { value: "date-asc", label: "Oldest first" },
  { value: "amount-desc", label: "Highest amount" },
  { value: "amount-asc", label: "Lowest amount" },
];

export default function GroupExpenses() {
  const { id } = useParams();
  const [group, setGroup] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [sort, setSort] = useState("date-desc");

  useEffect(() => {
    setLoading(true);
    Promise.all([
      apiRequest(`/groups/${id}`, { auth: true }),
      apiRequest(`/groups/${id}/expenses`, { auth: true }),
    ])
      .then(([g, e]) => {
        setGroup(g);
        setExpenses(e);
        setError("");
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  const categories = useMemo(() => {
    const set = new Set();
    expenses.forEach((expense) => {
      if (expense.category) set.add(expense.category);
      if (expense.ai_category) set.add(expense.ai_category);
    });
    return Array.from(set).sort();
  }, [expenses]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let items = expenses.filter((expense) => {
      const matchesQuery =
        !q ||
        expense.title.toLowerCase().includes(q) ||
        (expense.paid_by_user?.name || "").toLowerCase().includes(q);
      const cat = category
        ? expense.category === category || expense.ai_category === category
        : true;
      return matchesQuery && cat;
    });

    const sign = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
    items = [...items].sort((a, b) => {
      if (sort === "date-asc") return sign(a.expense_date || a.created_at, b.expense_date || b.created_at);
      if (sort === "amount-desc") return sign(Number(b.amount), Number(a.amount));
      if (sort === "amount-asc") return sign(Number(a.amount), Number(b.amount));
      return sign(b.expense_date || b.created_at, a.expense_date || a.created_at);
    });
    return items;
  }, [expenses, query, category, sort]);

  const total = filtered.reduce((sum, expense) => sum + Number(expense.amount || 0), 0);

  if (error && !group) {
    return <ErrorState title="Couldn't load expenses" message={error} />;
  }

  return (
    <>
      <Link to={`/groups/${id}`} className="btn btn-ghost btn-sm mb-3">
        <ArrowLeft aria-hidden="true" /> Back to {group?.name || "group"}
      </Link>

      <div className="flex justify-between items-end gap-3 wrap mb-4">
        <div>
          <h2 className="mb-1">Expenses</h2>
          <p className="text-secondary mb-0">
            {expenses.length} expense{expenses.length === 1 ? "" : "s"} recorded
            {filtered.length !== expenses.length ? ` (${filtered.length} shown)` : ""}
          </p>
        </div>
        <Link to={`/groups/${id}/expenses/new`}>
          <Button variant="primary">
            <Plus aria-hidden="true" /> Add Expense
          </Button>
        </Link>
      </div>

      {loading ? (
        <CardList />
      ) : error ? (
        <ErrorState title="Couldn't load expenses" message={error} />
      ) : expenses.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title="No expenses yet"
          message="Add the first expense for this group."
          action={
            <Link to={`/groups/${id}/expenses/new`}>
              <Button variant="primary">
                <Plus aria-hidden="true" /> Add Expense
              </Button>
            </Link>
          }
        />
      ) : (
        <>
          <div className="flex gap-2 wrap items-center mb-4">
            <div style={{ flex: 1, minWidth: 200, maxWidth: 340 }}>
              <SearchBar
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search expenses…"
              />
            </div>
            {categories.length > 0 && (
              <Select
                name="category"
                options={categories.map((c) => ({ value: c, label: c }))}
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="All categories"
                style={{ minWidth: 170 }}
              />
            )}
            <Select
              name="sort"
              options={SORT_OPTIONS}
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              placeholder="Sort by"
              style={{ minWidth: 170 }}
            />
          </div>

          {filtered.length === 0 ? (
            <EmptyState title="No matching expenses" message={`Nothing matches your search.`} />
          ) : (
            <>
              <p className="text-sm text-secondary mb-2">
                Showing {filtered.length} of {expenses.length} · Total{" "}
                <span className="text-semibold">{formatMoney(total)}</span>
              </p>

              <div className="table-responsive">
                <table className="table table-hover">
                  <thead>
                    <tr>
                      <th>Title</th>
                      <th>Category</th>
                      <th>Paid by</th>
                      <th>Date</th>
                      <th>Split</th>
                      <th style={{ textAlign: "right" }}>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((expense) => (
                      <tr key={expense.id} className="clickable">
                        <td>
                          <Link to={`/groups/${id}/expenses/${expense.id}`} className="text-semibold link">
                            {expense.title}
                          </Link>
                        </td>
                        <td>
                          <CategoryBadge
                            category={expense.category || expense.ai_category}
                            showAi={Boolean(expense.ai_category)}
                          />
                        </td>
                        <td>{expense.paid_by_user?.name || "—"}</td>
                        <td>{formatDate(expense.expense_date || expense.created_at)}</td>
                        <td>
                          <Badge variant={expense.split_method === "equal" ? "info" : expense.split_method === "percentage" ? "warning" : "primary"}>
                            {expense.split_method}
                          </Badge>
                        </td>
                        <td style={{ textAlign: "right" }}>
                          <span className="text-semibold">{formatMoney(expense.amount)}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </>
      )}
    </>
  );
}

function CardList() {
  return (
    <div className="flex flex-column gap-3">
      {Array.from({ length: 3 }).map((_, index) => (
        <Skeleton key={index} type="card" style={{ height: 120 }} />
      ))}
    </div>
  );
}
