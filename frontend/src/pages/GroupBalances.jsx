import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, ArrowDownUp, CheckCircle2, Handshake, Sparkles } from "lucide-react";
import Card from "../components/common/Card";
import Input from "../components/common/Input";
import Select from "../components/common/Select";
import Button from "../components/common/Button";
import Modal from "../components/common/Modal";
import ConfirmModal from "../components/common/ConfirmModal";
import Badge from "../components/common/Badge";
import Avatar from "../components/common/Avatar";
import PaymentButton from "../components/payments/PaymentButton";
import EmptyState from "../components/common/EmptyState";
import ErrorState from "../components/common/ErrorState";
import Skeleton from "../components/common/Skeleton";
import { useToast } from "../components/common/Toast";
import { apiRequest } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { formatDate, formatMoney } from "../utils/format";

export default function GroupBalances() {
  const { id } = useParams();
  const [group, setGroup] = useState(null);
  const [balances, setBalances] = useState(null);
  const [settlements, setSettlements] = useState([]);
  const [suggestions, setSuggestions] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const toast = useToast();
  const { user } = useAuth();

  const [showSettle, setShowSettle] = useState(false);
  const [payerId, setPayerId] = useState("");
  const [receiverId, setReceiverId] = useState("");
  const [amount, setAmount] = useState("");
  const [saving, setSaving] = useState(false);
  const [completeTarget, setCompleteTarget] = useState(null);
  const [completing, setCompleting] = useState(false);

  const [showAll, setShowAll] = useState(false);
  const [confirmSettle, setConfirmSettle] = useState(null);
  const [settling, setSettling] = useState(false);

  function loadAll() {
    setLoading(true);
    Promise.all([
      apiRequest(`/groups/${id}`, { auth: true }),
      apiRequest(`/groups/${id}/balances`, { auth: true }),
      apiRequest(`/groups/${id}/settlements`, { auth: true }),
      apiRequest(`/groups/${id}/settlement-suggestions`, { auth: true }),
    ])
      .then(([g, b, s, sug]) => {
        setGroup(g);
        setBalances(b);
        setSettlements(s);
        setSuggestions(sug);
        setError("");
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadAll();
  }, [id]);

  function resetSettlement() {
    setPayerId("");
    setReceiverId("");
    setAmount("");
    setShowSettle(false);
  }

  async function handleSettlement(event) {
    event.preventDefault();
    setSaving(true);
    try {
      await apiRequest(`/groups/${id}/settlements`, {
        method: "POST",
        body: { payer_id: Number(payerId), receiver_id: Number(receiverId), amount },
        auth: true,
      });
      resetSettlement();
      toast.success("Settlement recorded");
      loadAll();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleComplete() {
    if (!completeTarget) return;
    setCompleting(true);
    try {
      await apiRequest(`/groups/${id}/settlements/${completeTarget.id}`, {
        method: "PATCH",
        body: { status: "completed" },
        auth: true,
      });
      setCompleteTarget(null);
      toast.success("Settlement marked as completed");
      loadAll();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setCompleting(false);
    }
  }

  function settlementBadgeVariant(status) {
    if (status === "completed") return "success";
    if (status === "failed") return "danger";
    if (status === "processing") return "primary";
    return "warning";
  }

  function settlementCopy(settlement) {
    const isPayer = settlement.payer_id === user?.id;
    const isReceiver = settlement.receiver_id === user?.id;
    const otherName = isPayer
      ? settlement.receiver?.name
      : isReceiver
        ? settlement.payer?.name
        : settlement.receiver?.name;

    if (settlement.status === "completed") {
      if (isPayer) return `${formatMoney(settlement.amount)} paid to ${otherName}`;
      if (isReceiver) return `${formatMoney(settlement.amount)} received from ${otherName}`;
      return `${settlement.payer?.name} paid ${formatMoney(settlement.amount)} to ${settlement.receiver?.name}`;
    }

    if (isPayer) return `You owe ${otherName}`;
    if (isReceiver) return `${otherName} owes you`;
    return `${settlement.payer?.name} owes ${settlement.receiver?.name}`;
  }

  async function handleSmartSettle() {
    if (!confirmSettle) return;
    setSettling(true);
    try {
      await apiRequest(`/groups/${id}/settlements`, {
        method: "POST",
        body: {
          payer_id: confirmSettle.payer_id,
          receiver_id: confirmSettle.receiver_id,
          amount: String(confirmSettle.amount),
        },
        auth: true,
      });
      setConfirmSettle(null);
      toast.success("Optimized settlement recorded");
      loadAll();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSettling(false);
    }
  }

  if (error && !group) {
    return <ErrorState title="Couldn't load balances" message={error} />;
  }

  const members = group?.members || [];
  const memberOptions = members.map((m) => ({
    value: String(m.user_id),
    label: m.user?.name || `User ${m.user_id}`,
  }));
  const canSubmit =
    Boolean(payerId) &&
    Boolean(receiverId) &&
    Number(payerId) !== Number(receiverId) &&
    Number(amount) > 0;

  return (
    <>
      <Link to={`/groups/${id}`} className="btn btn-ghost btn-sm mb-3">
        <ArrowLeft aria-hidden="true" /> Back to {group?.name || "group"}
      </Link>

      <div className="flex justify-between items-end gap-3 wrap mb-4">
        <div>
          <h2 className="mb-1">Balances</h2>
          <p className="text-secondary mb-0">Who owes what in this group.</p>
        </div>
        <Button variant="primary" onClick={() => setShowSettle(true)}>
          <ArrowDownUp aria-hidden="true" /> Record Settlement
        </Button>
      </div>

      {loading ? (
        <div className="grid-2">
          <Skeleton type="card" style={{ height: 220 }} />
          <Skeleton type="card" style={{ height: 220 }} />
        </div>
      ) : error ? (
        <ErrorState title="Couldn't load balances" message={error} onRetry={loadAll} />
      ) : (
        <div className="flex flex-column gap-4">
          <div className="grid-2">
            <Card title="Member balances">
              {balances.balances.length === 0 ? (
                <EmptyState title="No balances yet" message="Add expenses to see who owes what." />
              ) : (
                <ul className="member-list">
                  {balances.balances.map((item) => {
                    const net = Number(item.net_balance);
                    const tone = net > 0 ? "success" : net < 0 ? "danger" : "neutral";
                    return (
                      <li key={item.user_id} className="member-row">
                        <Avatar name={item.user?.name} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div className="text-semibold">{item.user?.name || `User ${item.user_id}`}</div>
                          <div className="text-muted text-sm">
                            paid {formatMoney(item.total_paid)} · owes {formatMoney(item.total_owed)}
                          </div>
                        </div>
                        <Badge variant={tone}>
                          {net > 0 ? "+" : ""}
                          {formatMoney(item.net_balance)}
                        </Badge>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Card>

            <Card title="Who owes whom">
              {balances.who_owes_whom.length === 0 ? (
                <EmptyState icon={Handshake} title="All settled up" message="No outstanding debts." />
              ) : (
                <ul className="member-list">
                  {balances.who_owes_whom.map((transfer) => (
                    <li key={`${transfer.from_user_id}-${transfer.to_user_id}`} className="member-row">
                      <div style={{ flex: 1 }}>
                        <span className="text-semibold">{transfer.from_user?.name}</span>{" "}
                        <span className="text-secondary">owes</span>{" "}
                        <span className="text-semibold">{transfer.to_user?.name}</span>
                      </div>
                      <span className="text-semibold">{formatMoney(transfer.amount)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>

          <Card
            title={
              <span className="flex items-center gap-2">
                <Sparkles aria-hidden="true" className="text-primary" /> Smart Settlement
              </span>
            }
          >
            {!suggestions ? (
              <EmptyState
                icon={Sparkles}
                title="Couldn't load suggestions"
                message="Refresh the page to recalculate optimized settlements."
              />
            ) : suggestions.settled_up ? (
              <EmptyState
                icon={Handshake}
                title="All settled up"
                message="There's nothing to settle — every member has a zero balance."
              />
            ) : (
              <div>
                <div className="flex justify-between items-center wrap gap-2 mb-3">
                  <p className="text-secondary text-sm mb-0">
                    Clear every outstanding balance in{" "}
                    <strong>
                      {suggestions.payment_count}{" "}
                      payment{suggestions.payment_count === 1 ? "" : "s"}
                    </strong>{" "}
                    totalling{" "}
                    <strong>{formatMoney(suggestions.total_amount)}</strong> instead of
                    paying everyone separately.
                  </p>
                  {suggestions.suggestions.length > 1 && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setShowAll((prev) => !prev)}
                    >
                      {showAll ? "Hide" : "View all"} suggestions (
                      {suggestions.suggestions.length})
                    </Button>
                  )}
                </div>

                <ul className="member-list">
                  {(showAll
                    ? suggestions.suggestions
                    : suggestions.suggestions.slice(0, 1)
                  ).map((suggestion, index) => (
                    <li
                      key={`${suggestion.payer_id}-${suggestion.receiver_id}-${index}`}
                      className="member-row"
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div>
                          <span className="text-semibold">{suggestion.payer?.name}</span>{" "}
                          <span className="text-secondary">pays</span>{" "}
                          <span className="text-semibold">{suggestion.receiver?.name}</span>{" "}
                          <span className="text-secondary">{formatMoney(suggestion.amount)}</span>
                        </div>
                      </div>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => setConfirmSettle(suggestion)}
                      >
                        Settle now
                      </Button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Card>

          <Card title={`Settlement history (${settlements.length})`}>
            {settlements.length === 0 ? (
              <EmptyState
                title="No settlements yet"
                message="Record a settlement when someone pays someone back."
              />
            ) : (
              <ul className="member-list">
                {settlements.map((settlement) => (
                  <li key={settlement.id} className="member-row">
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div>
                        <span className="text-semibold">{settlementCopy(settlement)}</span>
                        {settlement.status !== "completed" && (
                          <div className="text-secondary mt-1">{formatMoney(settlement.amount)}</div>
                        )}
                      </div>
                      <div className="text-muted text-sm mt-1">
                        {formatDate(settlement.settlement_date)}
                        {settlement.payment_transaction_id && (
                          <> · Transaction ID: {settlement.payment_transaction_id}</>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={settlementBadgeVariant(settlement.status)}>
                        {settlement.status}
                      </Badge>
                      {settlement.status === "pending" && (
                        <>
                          <PaymentButton
                            settlement={settlement}
                            onSuccess={() => {
                              toast.success("Payment completed");
                              loadAll();
                            }}
                            onFailure={(err) => {
                              toast.error(err.message || "Payment failed");
                              loadAll();
                            }}
                          />
                          <Button variant="secondary" size="sm" onClick={() => setCompleteTarget(settlement)}>
                            <CheckCircle2 aria-hidden="true" /> Mark completed
                          </Button>
                        </>
                      )}
                      {settlement.status === "failed" && (
                        <PaymentButton
                          settlement={settlement}
                          onSuccess={() => {
                            toast.success("Payment completed");
                            loadAll();
                          }}
                          onFailure={(err) => toast.error(err.message || "Payment failed")}
                        />
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      )}

      <Modal
        open={showSettle}
        onClose={resetSettlement}
        title="Record a settlement"
        icon={ArrowDownUp}
        labelledBy="settlement-title"
        footer={
          <>
            <Button variant="secondary" onClick={resetSettlement} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" form="settlement-form" disabled={!canSubmit} loading={saving}>
              Record
            </Button>
          </>
        }
      >
        <form id="settlement-form" onSubmit={handleSettlement}>
          <div className="grid-2 gap-2">
            <Select
              label="Who pays"
              name="payerId"
              required
              options={memberOptions}
              value={payerId}
              onChange={(e) => setPayerId(e.target.value)}
            />
            <Select
              label="Who receives"
              name="receiverId"
              required
              options={memberOptions}
              value={receiverId}
              onChange={(e) => setReceiverId(e.target.value)}
            />
          </div>
          <Input
            label="Amount"
            name="amount"
            type="number"
            step="0.01"
            min="0.01"
            required
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
          {Number(payerId) > 0 && Number(payerId) === Number(receiverId) && (
            <p className="form-error">Payer and receiver must be different users.</p>
          )}
        </form>
      </Modal>

      <ConfirmModal
        open={Boolean(completeTarget)}
        onClose={() => setCompleteTarget(null)}
        onConfirm={handleComplete}
        title="Mark settlement completed"
        message={
          completeTarget
            ? `Mark the ${formatMoney(completeTarget.amount)} settlement from ${completeTarget.payer?.name} to ${completeTarget.receiver?.name} as completed?`
            : ""
        }
        confirmLabel="Mark completed"
        loading={completing}
      />

      <ConfirmModal
        open={Boolean(confirmSettle)}
        onClose={() => setConfirmSettle(null)}
        onConfirm={handleSmartSettle}
        title="Record optimized settlement"
        message={
          confirmSettle
            ? `Record the ${formatMoney(confirmSettle.amount)} settlement from ${confirmSettle.payer?.name} to ${confirmSettle.receiver?.name}? This is the suggested payment that clears the group's balances most efficiently.`
            : ""
        }
        confirmLabel="Record settlement"
        danger={false}
        loading={settling}
      />
    </>
  );
}
