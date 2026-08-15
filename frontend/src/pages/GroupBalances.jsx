import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Card from "../components/common/Card";
import Input from "../components/common/Input";
import Button from "../components/common/Button";
import { apiRequest } from "../api/client";
import { CURRENCY_SYMBOL, formatDate, formatMoney } from "../utils/format";

export default function GroupBalances() {
  const { id } = useParams();
  const [group, setGroup] = useState(null);
  const [balances, setBalances] = useState(null);
  const [settlements, setSettlements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [payerId, setPayerId] = useState("");
  const [receiverId, setReceiverId] = useState("");
  const [amount, setAmount] = useState("");
  const [saving, setSaving] = useState(false);

  function loadAll() {
    setLoading(true);
    Promise.all([
      apiRequest(`/groups/${id}`, { auth: true }),
      apiRequest(`/groups/${id}/balances`, { auth: true }),
      apiRequest(`/groups/${id}/settlements`, { auth: true }),
    ])
      .then(([g, b, s]) => {
        setGroup(g);
        setBalances(b);
        setSettlements(s);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadAll();
  }, [id]);

  async function handleSettlement(event) {
    event.preventDefault();
    setError("");
    setNotice("");
    setSaving(true);
    try {
      await apiRequest(`/groups/${id}/settlements`, {
        method: "POST",
        body: { payer_id: Number(payerId), receiver_id: Number(receiverId), amount },
        auth: true,
      });
      setPayerId("");
      setReceiverId("");
      setAmount("");
      setNotice("Settlement recorded");
      loadAll();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleComplete(settlement) {
    setError("");
    if (!window.confirm("Mark this settlement as completed?")) return;
    try {
      await apiRequest(`/groups/${id}/settlements/${settlement.id}`, {
        method: "PATCH",
        body: { status: "completed" },
        auth: true,
      });
      loadAll();
    } catch (err) {
      setError(err.message);
    }
  }

  if (error && !group) {
    return (
      <div>
        <h1>Balances</h1>
        <p style={{ color: "#dc2626" }}>{error}</p>
        <Link to="/groups">Back to groups</Link>
      </div>
    );
  }

  const members = group?.members || [];
  const memberOptions = members.map((m) => ({
    id: m.user_id,
    name: m.user?.name || `User ${m.user_id}`,
  }));
  const canSubmit =
    Boolean(payerId) &&
    Boolean(receiverId) &&
    Number(payerId) !== Number(receiverId) &&
    Number(amount) > 0;

  return (
    <div style={{ maxWidth: 640 }}>
      <Link to={`/groups/${id}`}>&larr; Back to {group?.name || "group"}</Link>
      <h1>Balances</h1>

      {notice && <p style={{ color: "#15803d" }}>{notice}</p>}
      {error && <p style={{ color: "#dc2626" }}>{error}</p>}

      {loading ? (
        <p>Loading...</p>
      ) : (
        <>
          <Card title="Member balances">
            {balances.balances.length === 0 ? (
              <p style={{ marginBottom: 0 }}>No member balances to show.</p>
            ) : (
              <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                {balances.balances.map((item) => {
                  const net = parseFloat(item.net_balance);
                  return (
                    <li
                      key={item.user_id}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        padding: "0.5rem 0",
                        borderBottom: "1px solid #e5e7eb",
                      }}
                    >
                      <span>
                        <strong>{item.user?.name || `User ${item.user_id}`}</strong>
                        <span style={{ color: "#6b7280", fontSize: "0.875rem" }}>
                          {" "}
                          &middot; paid {formatMoney(item.total_paid)} / owes{" "}
                          {formatMoney(item.total_owed)}
                        </span>
                      </span>
                      <span
                        style={{
                          fontWeight: 600,
                          color: net > 0 ? "#15803d" : net < 0 ? "#dc2626" : "#6b7280",
                        }}
                      >
                        {net > 0 ? "+" : ""}
                        {formatMoney(item.net_balance)}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>

          <Card title="Who owes whom">
            {balances.who_owes_whom.length === 0 ? (
              <p style={{ marginBottom: 0 }}>All settled up.</p>
            ) : (
              <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                {balances.who_owes_whom.map((transfer) => (
                  <li key={`${transfer.from_user_id}-${transfer.to_user_id}`}>
                    <strong>{transfer.from_user?.name}</strong> owes{" "}
                    <strong>{transfer.to_user?.name}</strong>{" "}
                    <strong>{formatMoney(transfer.amount)}</strong>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title="Record a settlement">
            <form onSubmit={handleSettlement}>
              <div
                style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}
              >
                <div style={{ flex: 1, minWidth: 160 }}>
                  <Input
                    label="Who pays"
                    name="payerId"
                    type="select"
                    required
                    options={memberOptions}
                    value={payerId}
                    onChange={(e) => setPayerId(e.target.value)}
                  />
                </div>
                <div style={{ flex: 1, minWidth: 160 }}>
                  <Input
                    label="Who receives"
                    name="receiverId"
                    type="select"
                    required
                    options={memberOptions}
                    value={receiverId}
                    onChange={(e) => setReceiverId(e.target.value)}
                  />
                </div>
                <div style={{ flex: 1, minWidth: 160 }}>
                  <Input
                    label={`Amount (${CURRENCY_SYMBOL})`}
                    name="amount"
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                  />
                </div>
              </div>
              {Number(payerId) > 0 &&
                Number(payerId) === Number(receiverId) && (
                  <p style={{ color: "#dc2626", fontSize: "0.875rem" }}>
                    Payer and receiver must be different users.
                  </p>
                )}
              <Button type="submit" disabled={saving || !canSubmit}>
                {saving ? "Saving..." : "Record Settlement"}
              </Button>
            </form>
          </Card>

          <Card title={`Settlement history (${settlements.length})`}>
            {settlements.length === 0 ? (
              <p style={{ marginBottom: 0 }}>No settlements yet.</p>
            ) : (
              <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                {settlements.map((settlement) => (
                  <li
                    key={settlement.id}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "0.5rem 0",
                      borderBottom: "1px solid #e5e7eb",
                    }}
                  >
                    <div>
                      <strong>{settlement.payer?.name}</strong> paid{" "}
                      <strong>{settlement.receiver?.name}</strong>{" "}
                      <strong>{formatMoney(settlement.amount)}</strong>
                      <div style={{ color: "#6b7280", fontSize: "0.875rem" }}>
                        {formatDate(settlement.settlement_date)} &middot;{" "}
                        <span
                          style={{
                            color:
                              settlement.status === "completed"
                                ? "#15803d"
                                : "#d97706",
                          }}
                        >
                          {settlement.status}
                        </span>
                      </div>
                    </div>
                    {settlement.status === "pending" && (
                      <Button
                        variant="secondary"
                        onClick={() => handleComplete(settlement)}
                      >
                        Mark completed
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
