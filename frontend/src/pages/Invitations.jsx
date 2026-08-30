import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Mail } from "lucide-react";
import Card from "../components/common/Card";
import Button from "../components/common/Button";
import EmptyState from "../components/common/EmptyState";
import Skeleton, { SkeletonText } from "../components/common/Skeleton";
import ErrorState from "../components/common/ErrorState";
import ConfirmModal from "../components/common/ConfirmModal";
import InvitationCard from "../components/invitations/InvitationCard";
import { apiRequest } from "../api/client";
import { useToast } from "../components/common/Toast";

export default function Invitations() {
  const navigate = useNavigate();
  const toast = useToast();
  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionBusy, setActionBusy] = useState("");
  const [confirmDecline, setConfirmDecline] = useState(null);

  async function loadInvitations() {
    setLoading(true);
    setError("");
    try {
      const data = await apiRequest("/invitations", { auth: true });
      setInvitations(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadInvitations();
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

  return (
    <>
      <div className="flex justify-between items-end gap-3 wrap mb-4">
        <div>
          <h2 className="mb-1">
            <Mail aria-hidden="true" style={{ verticalAlign: "middle" }} /> Invitations
          </h2>
          <p className="text-secondary mb-0">
            Group invitations waiting for your response.
          </p>
        </div>
        <Button variant="secondary" onClick={loadInvitations}>
          Refresh
        </Button>
      </div>

      {loading ? (
        <div className="grid-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <SkeletonText lines={3} />
            </Card>
          ))}
        </div>
      ) : error ? (
        <ErrorState title="Couldn't load invitations" message={error} onRetry={loadInvitations} />
      ) : invitations.length === 0 ? (
        <Card>
          <EmptyState
            icon={Mail}
            title="No pending invitations"
            message="When someone invites you by username, it will appear here."
          />
        </Card>
      ) : (
        <div className="grid-3">
          {invitations.map((inv) => (
            <InvitationCard
              key={inv.id}
              invitation={inv}
              onAccept={handleAccept}
              onDecline={(i) => setConfirmDecline(i)}
              actionBusy={actionBusy}
            />
          ))}
        </div>
      )}

      <ConfirmModal
        open={Boolean(confirmDecline)}
        onClose={() => setConfirmDecline(null)}
        onConfirm={() => handleDecline(confirmDecline)}
        title="Decline invitation"
        message={`Decline the invitation to join "${confirmDecline?.group_name}"?`}
        confirmLabel="Decline"
        loading={Boolean(actionBusy)}
      />
    </>
  );
}
