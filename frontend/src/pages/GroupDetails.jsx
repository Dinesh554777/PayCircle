import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Plus, ArrowLeft, UserMinus, LogOut, Mail } from "lucide-react";
import Card from "../components/common/Card";
import Input from "../components/common/Input";
import Button from "../components/common/Button";
import ConfirmModal from "../components/common/ConfirmModal";
import Badge from "../components/common/Badge";
import Avatar from "../components/common/Avatar";
import Skeleton from "../components/common/Skeleton";
import ErrorState from "../components/common/ErrorState";
import { useToast } from "../components/common/Toast";
import { apiRequest } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { formatDate } from "../utils/format";

export default function GroupDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [group, setGroup] = useState(null);
  const [error, setError] = useState("");
  const [email, setEmail] = useState("");
  const [adding, setAdding] = useState(false);
  const [removeTarget, setRemoveTarget] = useState(null);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [busy, setBusy] = useState(false);
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

  useEffect(() => {
    setActiveGroup();
    loadGroup();
  }, [id]);

  async function handleAddMember(event) {
    event.preventDefault();
    setError("");
    setAdding(true);
    try {
      await apiRequest(`/groups/${id}/members`, {
        method: "POST",
        body: { email },
        auth: true,
      });
      setEmail("");
      toast.success("Member added");
      await loadGroup();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setAdding(false);
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
        <Link to={`/groups/${id}/expenses`} className="btn btn-secondary btn-sm">
          Expenses
        </Link>
        <Link to={`/groups/${id}/balances`} className="btn btn-secondary btn-sm">
          Balances
        </Link>
        <Link to={`/groups/${id}/transactions`} className="btn btn-secondary btn-sm">
          Transactions
        </Link>
      </div>

      <Card title={`Members (${group.members.length})`}>
        <form onSubmit={handleAddMember} className="flex gap-2 items-end wrap mb-3">
          <div style={{ flex: 1, minWidth: 220, maxWidth: 320 }}>
            <Input
              label="Add member by email"
              name="email"
              type="email"
              icon={Mail}
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <Button type="submit" loading={adding}>
            Add Member
          </Button>
        </form>

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
                    {member.user?.email} · joined {formatDate(member.joined_at)}
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
