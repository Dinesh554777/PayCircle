import { Clock, Check, X, Users } from "lucide-react";
import Card from "../common/Card";
import Button from "../common/Button";
import Badge from "../common/Badge";
import Avatar from "../common/Avatar";
import BlurFade from "../magicui/BlurFade";
import MagicCard from "../magicui/MagicCard";

function daysUntilExpiry(expiresAt) {
  const diff = new Date(expiresAt) - new Date();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

export default function InvitationCard({ invitation, onAccept, onDecline, actionBusy }) {
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
              <Users aria-hidden="true" style={{ width: 12, height: 12 }} />{" "}
              {invitation.member_count}
            </Badge>
          </div>

          <div className="flex items-center gap-2 text-sm mb-4">
            <Avatar name={invitation.inviter_name} size="xs" />
            <span className="text-muted">
              @{invitation.inviter_name} · invited you
            </span>
          </div>

          <div className="flex items-center gap-2 text-muted text-sm mb-3">
            <Clock aria-hidden="true" style={{ width: 14, height: 14 }} />
            <span>
              {days === 0 ? "Expires today" : `Expires in ${days} day${days === 1 ? "" : "s"}`}
            </span>
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
