import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Plus, ArrowLeft, UserMinus, LogOut, Clock, Send, Trash2, Receipt, CheckCircle2, Search, UserPlus, Check } from "lucide-react";
import Card from "../components/common/Card";
import Input from "../components/common/Input";
import Button from "../components/common/Button";
import ConfirmModal from "../components/common/ConfirmModal";
import Badge from "../components/common/Badge";
import Avatar from "../components/common/Avatar";
import Skeleton from "../components/common/Skeleton";
import EmptyState from "../components/common/EmptyState";
import ErrorState from "../components/common/ErrorState";
import { useToast } from "../components/common/Toast";
import { apiRequest } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { formatMoney, formatDate } from "../utils/format";

export default function GroupDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [group, setGroup] = useState(null);
  const [error, setError] = useState("");
  const [removeTarget, setRemoveTarget] = useState(null);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [busy, setBusy] = useState(false);
  const [pendingInvitations, setPendingInvitations] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [payments, setPayments] = useState([]);
  const [activeTab, setActiveTab] = useState("members");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [inviteStatus, setInviteStatus] = useState({});
  const toast = useToast();

  function setActiveGroup() {
    if (user?.id) {
      localStorage.setItem(`paycircle_active_group_${user.id}`, String(id));
    }
  }

  async function loadGroup() {
    try {
      const data = await apiRequest(`/groups/${id}`, { auth: true });
      setGroup(data);
      setError("");
    } catch (err) {
      setError(err.message);
    }
  }

  async function loadPendingInvitations() {
    try {
      const data = await apiRequest(`/groups/${id}/invitations`, { auth: true });
      setPendingInvitations(data.filter((inv) => inv.status === "pending"));
    } catch {
      setPendingInvitations([]);
    }
  }

  useEffect(() => {
    setActiveGroup();
    loadGroup();
    loadPendingInvitations();
    apiRequest(`/groups/${id}/expenses`, { auth: true })
      .then((data) => setExpenses(data))
      .catch(() => setExpenses([]));
    apiRequest(`/payments?group_id=${id}`, { auth: true })
      .then((data) => setPayments(data))
      .catch(() => setPayments([]));
  }, [id]);

  const MIN_SEARCH_CHARS = 2;

  useEffect(() => {
    const q = searchQuery.trim();
    if (q.length < MIN_SEARCH_CHARS) {
      setSearchResults([]);
      setSearched(false);
      setSearching(false);
      return undefined;
    }
    setSearching(true);
    const handle = setTimeout(() => {
      apiRequest(
        `/users/search?q=${encodeURIComponent(q)}&group_id=${id}`,
        { auth: true }
      )
        .then(setSearchResults)
        .catch(() => setSearchResults([]))
        .finally(() => {
          setSearching(false);
          setSearched(true);
        });
    }, 300);
    return () => clearTimeout(handle);
  }, [searchQuery, id]);

  function isPendingInvite(foundUser) {
    return pendingInvitations.some(
      (inv) => inv.invitee_user_id === foundUser.id
    );
  }

  async function handleSendInvite(foundUser) {
    if (isPendingInvite(foundUser)) {
      toast.success("Invitation already pending");
      return;
    }
    setInviteStatus((s) => ({ ...s, [foundUser.username]: "sending" }));
    try {
      await apiRequest(`/groups/${id}/invitations`, {
        method: "POST",
        body: { username: foundUser.username },
        auth: true,
      });
      setInviteStatus((s) => ({ ...s, [foundUser.username]: "sent" }));
      toast.success(`${foundUser.name} has been invited to join ${group.name}.`);
      await loadPendingInvitations();
      setSearchResults((prev) =>
        prev.map((u) =>
          u.id === foundUser.id ? { ...u, invited: true } : u
        )
      );
    } catch (err) {
      setInviteStatus((s) => {
        const next = { ...s };
        delete next[foundUser.username];
        return next;
      });
      toast.error(err.message);
      await loadPendingInvitations();
    }
  }

  async function handleResend(invitationId) {
    try {
      await apiRequest(`/invitations/${invitationId}/resend`, {
        method: "POST",
        auth: true,
      });
      toast.success("Invitation resent");
      await loadPendingInvitations();
    } catch (err) {
      toast.error(err.message);
    }
  }

  async function handleCancelInvitation(invitationId) {
    try {
      await apiRequest(`/invitations/${invitationId}`, {
        method: "DELETE",
        auth: true,
      });
      toast.success("Invitation cancelled");
      await loadPendingInvitations();
    } catch (err) {
      toast.error(err.message);
    }
  }

  async function handleRemoveMember() {
    if (!removeTarget) return;
    setBusy(true);
    try {
      await apiRequest(`/groups/${id}/members/${removeTarget.user_id}`, {
        method: "DELETE",
        auth: true,
      });
      setRemoveTarget(null);
      toast.success(`${removeTarget.user?.name} removed`);
      await loadGroup();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleLeave() {
    setBusy(true);
    try {
      await apiRequest(`/groups/${id}/leave`, { method: "DELETE", auth: true });
      setConfirmLeave(false);
      toast.success("You left the group");
      navigate("/groups");
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (error && !group) {
    return (
      <ErrorState
        title="Couldn't load this group"
        message={error}
        onRetry={loadGroup}
      />
    );
  }

  if (!group) {
    return (
      <Card>
        <Skeleton lines={4} />
      </Card>
    );
  }

  const canRemove = (member) =>
    member.user_id !== group.created_by && member.user_id !== user?.id;

  return (
    <>
      <Link to="/groups" className="btn btn-ghost btn-sm mb-3">
        <ArrowLeft aria-hidden="true" /> Back to groups
      </Link>

      <div className="flex justify-between items-start gap-3 wrap mb-4">
        <div>
          <h2 className="mb-1">
            {group.name}{" "}
            <Badge variant="neutral">
              {group.members.length} member{group.members.length === 1 ? "" : "s"}
            </Badge>
          </h2>
          {group.description && <p className="text-secondary mb-1">{group.description}</p>}
          <p className="text-muted text-sm mb-0">
            Created by {group.creator?.name || "someone"} on {formatDate(group.created_at)}
          </p>
        </div>
        <div className="flex items-center gap-2 wrap">
          <Link to={`/groups/${id}/expenses/new`}>
            <Button variant="primary" size="sm">
              <Plus aria-hidden="true" /> Add Expense
            </Button>
          </Link>
          <Button variant="secondary" size="sm" onClick={() => setConfirmLeave(true)}>
            <LogOut aria-hidden="true" /> Leave Group
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-2 wrap mb-4">
        <Link to={`/groups/${id}/balances`} className="btn btn-secondary btn-sm">
          Balances
        </Link>
      </div>

      <div className="flex gap-2 wrap mb-4">
        {[
          { key: "members", label: `Members (${group.members.length})`, icon: UserMinus },
          { key: "expenses", label: `Expenses (${expenses.length})`, icon: Receipt },
          { key: "payments", label: `Payments (${payments.length})`, icon: CheckCircle2 },
        ].map((tab) => (
          <button
            key={tab.key}
            className={`btn btn-sm ${activeTab === tab.key ? "btn-primary" : "btn-ghost"}`}
            onClick={() => setActiveTab(tab.key)}
          >
            <tab.icon aria-hidden="true" /> {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "members" && (
        <div className="flex flex-column gap-4">
          <Card title="Invite Members">
            <Input
              name="usernameSearch"
              icon={Search}
              placeholder="Search PayCircle username..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Search PayCircle username"
            />
            <p className="text-muted text-sm mt-2 mb-3">
              Type at least {MIN_SEARCH_CHARS} characters to search registered
              PayCircle users. You and existing members are hidden.
            </p>

            {searchQuery.trim().length >= MIN_SEARCH_CHARS && (
              <div>
                <p className="text-secondary text-sm mb-2">Search results</p>

                {searching ? (
                  <div className="text-muted text-sm">Searching users…</div>
                ) : searchResults.length === 0 ? (
                  <p className="text-muted text-sm mb-0">
                    {searched ? "No users found." : "Keep typing to search."}
                  </p>
                ) : (
                  <ul className="member-list">
                    {searchResults.map((found) => {
                      const status = inviteStatus[found.username] || (found.invited ? "sent" : isPendingInvite(found) ? "pending" : null);
                      return (
                        <li key={found.id} className="member-row">
                          <Avatar name={found.name} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div className="text-semibold">{found.name}</div>
                            <div className="text-muted text-sm">@{found.username}</div>
                          </div>
                          {status === "sent" ? (
                            <Button variant="primary" size="sm" disabled>
                              <Check aria-hidden="true" /> Invitation Sent
                            </Button>
                          ) : status === "pending" ? (
                            <Button variant="secondary" size="sm" disabled>
                              <Clock aria-hidden="true" /> Invitation pending
                            </Button>
                          ) : (
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => handleSendInvite(found)}
                              loading={status === "sending"}
                            >
                              <UserPlus aria-hidden="true" /> Invite
                            </Button>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            )}
          </Card>

          <Card title={`Current Members (${group.members.length})`}>
            <ul className="member-list">
              {group.members.map((member) => {
                const isCreator = member.user_id === group.created_by;
                return (
                  <li key={member.id} className="member-row">
                    <Avatar name={member.user?.name} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="flex items-center gap-2">
                        <span className="text-semibold">{member.user?.name}</span>
                        {isCreator && <Badge variant="primary">creator</Badge>}
                        {member.user_id === user?.id && <Badge variant="neutral">you</Badge>}
                      </div>
                      <div className="text-muted text-sm">
                        @{member.user?.username} · joined {formatDate(member.joined_at)}
                      </div>
                    </div>
                    {canRemove(member) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-danger"
                        onClick={() => setRemoveTarget(member)}
                      >
                        <UserMinus aria-hidden="true" /> Remove
                      </Button>
                    )}
                  </li>
                );
              })}
            </ul>
          </Card>
        </div>
      )}

      {activeTab === "expenses" && (
        <Card title={`Expenses (${expenses.length})`}>
          {expenses.length === 0 ? (
            <EmptyState
              icon={Receipt}
              title="No expenses yet"
              message="Add the first expense for this group."
              action={
                <Link to={`/groups/${id}/expenses/new`}>
                  <Button variant="primary"><Plus aria-hidden="true" /> Add Expense</Button>
                </Link>
              }
            />
          ) : (
            <>
              <div className="flex justify-between items-center mb-3">
                <span className="text-secondary text-sm">
                  Total: <span className="text-semibold">{formatMoney(expenses.reduce((s, e) => s + Number(e.amount || 0), 0))}</span>
                </span>
                <Link to={`/groups/${id}/expenses`} className="btn btn-ghost btn-sm">View All</Link>
              </div>
              <ul className="member-list">
                {expenses.slice(0, 10).map((expense) => (
                  <li key={expense.id} className="member-row">
                    <Receipt aria-hidden="true" className="text-primary" />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="text-semibold">{expense.title}</div>
                      <div className="text-muted text-sm">
                        {expense.paid_by_user?.name || "Someone"} · {formatDate(expense.expense_date || expense.created_at)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-semibold">{formatMoney(expense.amount)}</div>
                      <Badge variant="info">{expense.split_method}</Badge>
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}
        </Card>
      )}

      {activeTab === "payments" && (
        <Card title={`Payments (${payments.length})`}>
          {payments.length === 0 ? (
            <EmptyState
              icon={CheckCircle2}
              title="No payments yet"
              message="Settled payments will appear here."
            />
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
                      {payment.gateway} · {payment.razorpay_payment_id || payment.razorpay_order_id}
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
      )}

      {pendingInvitations.length > 0 && (
        <Card title={`Pending Invitations (${pendingInvitations.length})`} className="mt-4">
          <ul className="member-list">
            {pendingInvitations.map((inv) => (
              <li key={inv.id} className="member-row">
                <Avatar name={inv.invitee_name || `@${inv.invitee_username}`} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="text-semibold">
                    {inv.invitee_name || inv.invitee_username || "User"}
                    <span className="text-muted"> · @{inv.invitee_username}</span>
                  </div>
                  <div className="flex items-center gap-1 text-muted text-sm">
                    <Clock aria-hidden="true" style={{ width: 12, height: 12 }} />
                    <span>
                      Sent {formatDate(inv.created_at)} · Expires in{" "}
                      {Math.max(0, Math.ceil((new Date(inv.expires_at) - new Date()) / (1000 * 60 * 60 * 24)))} day
                      {Math.max(0, Math.ceil((new Date(inv.expires_at) - new Date()) / (1000 * 60 * 60 * 24))) === 1 ? "" : "s"}
                    </span>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleResend(inv.id)}
                  >
                    <Send aria-hidden="true" /> Resend
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-danger"
                    onClick={() => handleCancelInvitation(inv.id)}
                  >
                    <Trash2 aria-hidden="true" /> Cancel
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <ConfirmModal
        open={Boolean(removeTarget)}
        onClose={() => setRemoveTarget(null)}
        onConfirm={handleRemoveMember}
        title="Remove member"
        message={`Remove ${removeTarget?.user?.name} from this group? They will lose access to group expenses.`}
        confirmLabel="Remove"
        loading={busy}
      />

      <ConfirmModal
        open={confirmLeave}
        onClose={() => setConfirmLeave(false)}
        onConfirm={handleLeave}
        title="Leave group"
        message="Leave this group? You will lose access to it."
        confirmLabel="Leave"
        loading={busy}
      />
    </>
  );
}
