import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Mail, Users, Check, X, Clock, AlertCircle } from "lucide-react";
import Card from "../components/common/Card";
import Button from "../components/common/Button";
import Badge from "../components/common/Badge";
import EmptyState from "../components/common/EmptyState";
import Skeleton, { SkeletonText } from "../components/common/Skeleton";
import ErrorState from "../components/common/ErrorState";
import ConfirmModal from "../components/common/ConfirmModal";
import Avatar from "../components/common/Avatar";
import BlurFade from "../components/magicui/BlurFade";
import MagicCard from "../components/magicui/MagicCard";
import { apiRequest } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../components/common/Toast";

function daysUntilExpiry(expiresAt) {
  const diff = new Date(expiresAt) - new Date();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

function InvitationCard({ invitation, onAccept, onDecline, actionBusy }) {
  const days = daysUntilExpiry(invitation.expires_at);
  return (
    <BlurFade delay={0.05} duration={0.4} className="h-full">
      <MagicCard className="h-full">
        <Card className="h-full" style={{ padding: "1.25rem" }}>
          <div className="flex justify-between items-start mb-3">
            <div>
              <h3 className="mb-0 text-semibold">{invitation.group_name}</h3>
              <p className="text-secondary text-sm mb-0">
                Invited by {invitation.inviter_name}
              </p>
            </div>
            <Badge variant="primary">
              <Users aria-hidden="true" style={{ width: 12, height: 12 }} /> {invitation.member_count}
            </Badge>
          </div>

          <div className="flex items-center gap-2 text-muted text-sm mb-3">
            <Clock aria-hidden="true" style={{ width: 14, height: 14 }} />
            <span>Expires in {days} day{days === 1 ? "" : "s"}</span>
          </div>

          <div className="flex gap-2">
            <Button
              variant="primary"
              size="sm"
              onClick={() => onAccept(invitation)}
              loading={actionBusy === `accept-${invitation.id}`}
            >
              <Check aria-hidden="true" /> Accept
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onDecline(invitation)}
              loading={actionBusy === `decline-${invitation.id}`}
            >
              <X aria-hidden="true" /> Decline
            </Button>
          </div>
        </Card>
      </MagicCard>
    </BlurFade>
  );
}

export default function Invitations() {
  const [searchParams] = useSearchParams();
  const tokenParam = searchParams.get("token");
  const { user } = useAuth();
  const toast = useToast();
  const [invitations, setInvitations] = useState([]);
  const [tokenInvitation, setTokenInvitation] = useState(null);
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

  async function loadTokenInvitation() {
    if (!tokenParam) return;
    try {
      const data = await apiRequest(`/invitations/${tokenParam}`);
      setTokenInvitation(data);
    } catch {
      setTokenInvitation(null);
    }
  }

  useEffect(() => {
    loadInvitations();
    loadTokenInvitation();
  }, [tokenParam]);

  async function handleAccept(inv) {
    setActionBusy(`accept-${inv.id}`);
    try {
      const res = await apiRequest(`/invitations/${inv.token}/accept`, {
        method: "POST",
        auth: true,
      });
      toast.success(res.message || "You joined the group!");
      setInvitations((prev) => prev.filter((i) => i.id !== inv.id));
      setTokenInvitation(null);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setActionBusy("");
    }
  }

  async function handleDecline(inv) {
    setActionBusy(`decline-${inv.id}`);
    try {
      await apiRequest(`/invitations/${inv.token}/decline`, {
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

  const hasTokenInv = tokenInvitation && tokenInvitation.status === "pending";

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
      </div>

      {hasTokenInv && (
        <BlurFade delay={0} duration={0.4}>
          <MagicCard className="mb-4" gradientFrom="#6C4BF4" gradientTo="#8B7CF6" gradientColor="rgba(108, 75, 244, 0.12)">
            <Card>
              <div className="flex items-center gap-2 mb-3">
                <Mail aria-hidden="true" className="text-primary" />
                <h3 className="mb-0">New Invitation</h3>
              </div>
              <p className="text-secondary mb-3">
                <strong>{tokenInvitation.inviter_name}</strong> invited you to join{" "}
                <strong>{tokenInvitation.group_name}</strong>
              </p>
              <div className="flex gap-2">
                <Button
                  variant="primary"
                  onClick={() => handleAccept(tokenInvitation)}
                  loading={actionBusy === `accept-${tokenInvitation.id}`}
                >
                  <Check aria-hidden="true" /> Accept Invitation
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => setConfirmDecline(tokenInvitation)}
                  loading={actionBusy === `decline-${tokenInvitation.id}`}
                >
                  <X aria-hidden="true" /> Decline
                </Button>
              </div>
            </Card>
          </MagicCard>
        </BlurFade>
      )}

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
      ) : invitations.length === 0 && !hasTokenInv ? (
        <Card>
          <EmptyState
            icon={Mail}
            title="No pending invitations"
            message="When someone invites you to a group, it will appear here."
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
