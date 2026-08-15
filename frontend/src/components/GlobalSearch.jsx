import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Receipt, Users, ArrowLeftRight, X, Loader2 } from "lucide-react";
import { apiRequest } from "../api/client";
import { formatMoney } from "../utils/format";

export default function GlobalSearch() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  const timerRef = useRef(null);
  const queryRef = useRef("");

  useEffect(() => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
    const q = query.trim();
    queryRef.current = q;

    if (!q || q.length < 2) {
      setResults(null);
      setLoading(false);
      setOpen(false);
      return;
    }

    setLoading(true);
    setOpen(true);
    timerRef.current = window.setTimeout(() => {
      apiRequest(`/search?q=${encodeURIComponent(q)}`, { auth: true })
        .then((data) => {
          if (queryRef.current === q) setResults(data);
        })
        .catch(() => {
          if (queryRef.current === q) setResults(null);
        })
        .finally(() => {
          if (queryRef.current === q) setLoading(false);
        });
    }, 300);
  }, [query]);

  useEffect(() => {
    function onOutsideClick(event) {
      if (wrapRef.current && !wrapRef.current.contains(event.target)) setOpen(false);
    }
    function onKeyDown(event) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onOutsideClick);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onOutsideClick);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  function go(path) {
    setOpen(false);
    setQuery("");
    setResults(null);
    navigate(path);
  }

  const total =
    results?.expenses.length + results?.groups.length + results?.transactions.length || 0;

  return (
    <div className="global-search" ref={wrapRef}>
      <div className="input-wrap">
        {loading ? (
          <Loader2 aria-hidden="true" className="spin" />
        ) : (
          <Search aria-hidden="true" />
        )}
        <input
          type="search"
          className="input"
          placeholder="Search expenses, groups, transactions…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => query.trim().length >= 2 && setOpen(true)}
          aria-label="Global search"
        />
        {query && (
          <button
            type="button"
            className="icon-btn icon-btn-xs"
            onClick={() => setQuery("")}
            aria-label="Clear search"
          >
            <X aria-hidden="true" />
          </button>
        )}
      </div>

      {open && query.trim().length >= 2 && (
        <div className="global-search-results" role="listbox" aria-label="Search results">
          {!loading && results && total === 0 && (
            <div className="global-search-empty">
              No matches for <strong>"{query.trim()}"</strong>.
            </div>
          )}
          {!loading && results && total > 0 && (
            <>
              {results.expenses.length > 0 && (
                <Section title="Expenses" icon={Receipt}>
                  {results.expenses.map((expense) => (
                    <button
                      key={`e-${expense.id}`}
                      type="button"
                      className="global-search-row"
                      onClick={() => go(`/groups/${expense.group_id}/expenses/${expense.id}`)}
                    >
                      <span className="global-search-title">{expense.title}</span>
                      <span className="global-search-meta">
                        {expense.group_name} · {formatMoney(expense.amount)}
                      </span>
                    </button>
                  ))}
                </Section>
              )}
              {results.groups.length > 0 && (
                <Section title="Groups" icon={Users}>
                  {results.groups.map((group) => (
                    <button
                      key={`g-${group.id}`}
                      type="button"
                      className="global-search-row"
                      onClick={() => go(`/groups/${group.id}`)}
                    >
                      <span className="global-search-title">{group.name}</span>
                      <span className="global-search-meta">
                        {group.member_count} member{group.member_count === 1 ? "" : "s"}
                      </span>
                    </button>
                  ))}
                </Section>
              )}
              {results.transactions.length > 0 && (
                <Section title="Transactions" icon={ArrowLeftRight}>
                  {results.transactions.map((transaction) => (
                    <button
                      key={`t-${transaction.id}`}
                      type="button"
                      className="global-search-row"
                      onClick={() => go(`/groups/${transaction.group_id}/transactions`)}
                    >
                      <span className="global-search-title">
                        {transaction.description || transaction.type}
                      </span>
                      <span className="global-search-meta">
                        {transaction.group_name} · {formatMoney(transaction.amount)}
                      </span>
                    </button>
                  ))}
                </Section>
              )}
            </>
          )}
          {loading && (
            <div className="global-search-empty">
              <Loader2 aria-hidden="true" className="spin" /> Searching…
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Section({ title, icon: Icon, children }) {
  return (
    <div className="global-search-section">
      <div className="global-search-section-title">
        <Icon aria-hidden="true" /> {title}
      </div>
      <div className="global-search-section-list">{children}</div>
    </div>
  );
}
