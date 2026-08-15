import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, ArrowDownUp, CheckCircle2, Handshake } from "lucide-react";
import Card from "../components/common/Card";
import Input from "../components/common/Input";
import Select from "../components/common/Select";
import Button from "../components/common/Button";
import Modal from "../components/common/Modal";
import ConfirmModal from "../components/common/ConfirmModal";
import Badge from "../components/common/Badge";
import Avatar from "../components/common/Avatar";
import EmptyState from "../components/common/EmptyState";
import ErrorState from "../components/common/ErrorState";
import Skeleton from "../components/common/Skeleton";
import { useToast } from "../components/common/Toast";
import { apiRequest } from "../api/client";
import { formatDate, formatMoney } from "../utils/format";

export default function GroupBalances() {
  const { id } = useParams();
  const [group, setGroup] = useState(null);
  const [balances, setBalances] = useState(null);
  const [settlements, setSettlements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const toast = useToast();

  const [showSettle, setShowSettle] = useState(false);
  const [payerId, setPayerId] = useState("");
  const [receiverId, setReceiverId] = useState("");
  const [amount, setAmount] = useState("");
  const [saving, setSaving] = useState(false);
  const [completeTarget, setCompleteTarget] = useState(null);
  const [completing, setCompleting] = useState(false);

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
                        <span className="text-semibold">{settlement.payer?.name}</span>{" "}
                        <span className="text-secondary">paid</span>{" "}
                        <span className="text-semibold">{settlement.receiver?.name}</span>{" "}
                        <span className="text-secondary">{formatMoney(settlement.amount)}</span>
                      </div>
                      <div className="text-muted text-sm mt-1">
                        {formatDate(settlement.settlement_date)}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={settlement.status === "completed" ? "success" : "warning"}>
                        {settlement.status}
                      </Badge>
                      {settlement.status === "pending" && (
                        <Button variant="secondary" size="sm" onClick={() => setCompleteTarget(settlement)}>
                          <CheckCircle2 aria-hidden="true" /> Mark completed
                        </Button>
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
    </>
  );
}
