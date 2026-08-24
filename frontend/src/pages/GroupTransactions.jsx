import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Activity, CheckCircle2 } from "lucide-react";
import Card from "../components/common/Card";
import Badge from "../components/common/Badge";
import Button from "../components/common/Button";
import SearchBar from "../components/common/SearchBar";
import Select from "../components/common/Select";
import EmptyState from "../components/common/EmptyState";
import ErrorState from "../components/common/ErrorState";
import Skeleton from "../components/common/Skeleton";
import TransactionItem from "../components/transactions/TransactionItem";
import { apiRequest } from "../api/client";
import { formatMoney } from "../utils/format";

const TYPE_OPTIONS = [
  { value: "all", label: "All activity" },
  { value: "expense", label: "Expenses only" },
  { value: "settlement", label: "Settlements only" },
];

export default function GroupTransactions() {
  const { id } = useParams();
  const [group, setGroup] = useState(null);
  const [feed, setFeed] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [query, setQuery] = useState("");

  useEffect(() => {
    setLoading(true);
    Promise.all([
      apiRequest(`/groups/${id}`, { auth: true }),
      apiRequest(`/groups/${id}/transactions`, { auth: true }),
      apiRequest("/payments", { auth: true }),
    ])
      .then(([g, items, paymentItems]) => {
        setGroup(g);
        setFeed(items);
        setPayments(paymentItems.filter((payment) => String(payment.group_id) === String(id)));
        setError("");
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return feed.filter((item) => {
      const matchesType = typeFilter === "all" || item.type === typeFilter;
      const searchable = [
        item.title,
        item.payer?.name,
        item.receiver?.name,
        item.group?.name,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return matchesType && (!q || searchable.includes(q));
    });
  }, [feed, typeFilter, query]);

  if (error && !group) {
    return <ErrorState title="Couldn't load transactions" message={error} />;
  }

  return (
    <>
      <Link to={`/groups/${id}`} className="btn btn-ghost btn-sm mb-3">
        <ArrowLeft aria-hidden="true" /> Back to {group?.name || "group"}
      </Link>

      <div className="flex justify-between items-end gap-3 wrap mb-4">
        <div>
          <h2 className="mb-1">Transactions</h2>
          <p className="text-secondary mb-0">Expenses and settlements in this group.</p>
        </div>
        <Link to={`/groups/${id}/expenses/new`}>
          <Button variant="primary">Add Expense</Button>
        </Link>
      </div>

      {loading ? (
        <Skeleton type="card" style={{ height: 320 }} />
      ) : error ? (
        <ErrorState title="Couldn't load transactions" message={error} />
      ) : feed.length === 0 ? (
        <EmptyState
          icon={Activity}
          title="No activity yet"
          message="Expenses and settlements will appear here."
        />
      ) : (
        <>
          <div className="flex gap-2 wrap items-center mb-4">
            <div style={{ flex: 1, minWidth: 200, maxWidth: 340 }}>
              <SearchBar
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search transactions…"
              />
            </div>
            <Select
              name="typeFilter"
              options={TYPE_OPTIONS}
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              placeholder="Type"
              style={{ minWidth: 170 }}
            />
          </div>

          {filtered.length === 0 ? (
            <EmptyState title="No matches" message="Try a different filter or search." />
          ) : (
            <div className="flex flex-column">
              {filtered.map((item, index) => (
                <TransactionItem
                  key={`${item.type}-${item.date}-${index}`}
                  item={item}
                  groupId={id}
                />
              ))}
            </div>
          )}

          <Card title="Payment history" className="mt-4">
            {payments.length === 0 ? (
              <EmptyState title="No payments yet" message="Verified settlement payments will appear here." />
            ) : (
              <ul className="member-list">
                {payments.map((payment) => (
                  <li key={payment.id} className="member-row">
                    <CheckCircle2 aria-hidden="true" className="text-success" />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="text-semibold">
                        {payment.payer?.name} paid {payment.receiver?.name}
                      </div>
                      <div className="text-muted text-sm">
                        {payment.gateway} · Payment ID: {payment.razorpay_payment_id || payment.razorpay_order_id}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-semibold">{formatMoney(payment.amount)}</div>
                      <Badge variant={payment.payment_status === "completed" ? "success" : "warning"}>
                        {payment.payment_status}
                      </Badge>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </>
      )}
    </>
  );
}
