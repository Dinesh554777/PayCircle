import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Activity } from "lucide-react";
import Button from "../components/common/Button";
import SearchBar from "../components/common/SearchBar";
import Select from "../components/common/Select";
import EmptyState from "../components/common/EmptyState";
import ErrorState from "../components/common/ErrorState";
import Skeleton from "../components/common/Skeleton";
import TransactionItem from "../components/transactions/TransactionItem";
import { apiRequest } from "../api/client";

const TYPE_OPTIONS = [
  { value: "all", label: "All activity" },
  { value: "expense", label: "Expenses only" },
  { value: "settlement", label: "Settlements only" },
];

export default function GroupTransactions() {
  const { id } = useParams();
  const [group, setGroup] = useState(null);
  const [feed, setFeed] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [query, setQuery] = useState("");

  useEffect(() => {
    setLoading(true);
    Promise.all([
      apiRequest(`/groups/${id}`, { auth: true }),
      apiRequest(`/groups/${id}/transactions`, { auth: true }),
    ])
      .then(([g, items]) => {
        setGroup(g);
        setFeed(items);
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
        </>
      )}
    </>
  );
}
