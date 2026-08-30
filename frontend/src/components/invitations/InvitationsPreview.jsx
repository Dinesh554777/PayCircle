import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Mail } from "lucide-react";
import Card from "../common/Card";
import Button from "../common/Button";
import EmptyState from "../common/EmptyState";
import Skeleton from "../common/Skeleton";
import ConfirmModal from "../common/ConfirmModal";
import InvitationCard from "./InvitationCard";
import { apiRequest } from "../../api/client";
import { useToast } from "../common/Toast";

export default function InvitationsPreview() {
  const navigate = useNavigate();
  const toast = useToast();
  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionBusy, setActionBusy] = useState("");
  const [confirmDecline, setConfirmDecline] = useState(null);

  useEffect(() => {
    apiRequest("/invitations", { auth: true })
      .then(setInvitations)
      .catch(() => setInvitations([]))
      .finally(() => setLoading(false));
  }, []);

  async function handleAccept(inv) {
    setActionBusy(`accept-${inv.id}`);
    try {
      const res = await apiRequest(`/invitations/${inv.id}/accept`, {
        method: "POST",
        auth: true,
      });
      toast.success(res.message || "You joined the group!");
      setInvitations((prev) => prev.filter((i) => i.id !== inv.id));
      navigate(`/groups/${res.group_id}`);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setActionBusy("");
    }
  }

  async function handleDecline(inv) {
    setActionBusy(`decline-${inv.id}`);
    try {
      await apiRequest(`/invitations/${inv.id}/decline`, {
        method: "POST",
        auth: true,
      });
      toast.success("Invitation declined.");
      setInvitations((prev) => prev.filter((i) => i.id !== inv.id));
      setConfirmDecline(null);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setActionBusy("");
    }
  }

  if (loading) {
    return (
      <Card className="mb-4">
        <Skeleton style={{ height: 120 }} />
      </Card>
    );
  }

  if (invitations.length === 0) return null;

  return (
    <div className="mb-4">
      <div className="flex justify-between items-end gap-3 wrap mb-3">
        <h2 className="mb-0">Pending Invitations</h2>
        <Link to="/invitations" className="btn btn-ghost btn-sm">
          View all
        </Link>
      </div>
      <div className="grid-3">
        {invitations.slice(0, 3).map((inv) => (
          <InvitationCard
            key={inv.id}
            invitation={inv}
            onAccept={handleAccept}
            onDecline={(i) => setConfirmDecline(i)}
            actionBusy={actionBusy}
          />
        ))}
      </div>

      <ConfirmModal
        open={Boolean(confirmDecline)}
        onClose={() => setConfirmDecline(null)}
        onConfirm={() => handleDecline(confirmDecline)}
        title="Decline invitation"
        message={`Decline the invitation to join "${confirmDecline?.group_name}"?`}
        confirmLabel="Decline"
        loading={Boolean(actionBusy)}
      />
    </div>
  );
}
