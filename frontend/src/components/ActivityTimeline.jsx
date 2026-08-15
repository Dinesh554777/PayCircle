import { Link } from "react-router-dom";
import {
  Activity,
  CheckCircle2,
  HandCoins,
  LogOut,
  Pencil,
  Receipt,
  Trash2,
  UserMinus,
  UserPlus,
  Users,
} from "lucide-react";
import EmptyState from "./common/EmptyState";
import { formatDateTime } from "../utils/format";

const TYPE_META = {
  group_created: { icon: Users },
  member_added: { icon: UserPlus },
  member_removed: { icon: UserMinus },
  member_left: { icon: LogOut },
  expense_added: { icon: Receipt },
  expense_edited: { icon: Pencil },
  expense_deleted: { icon: Trash2 },
  settlement_created: { icon: HandCoins },
  settlement_completed: { icon: CheckCircle2 },
};

function typeStyle(type) {
  const base = { display: "inline-flex", alignItems: "center", justifyContent: "center" };
  switch (type) {
    case "group_created":
      return { ...base, background: "var(--primary-soft-bg)", color: "var(--primary)" };
    case "member_added":
    case "expense_edited":
      return { ...base, background: "var(--info-bg)", color: "var(--info-text)" };
    case "member_removed":
    case "expense_deleted":
      return { ...base, background: "var(--danger-bg)", color: "var(--danger-text)" };
    case "member_left":
    case "settlement_created":
      return { ...base, background: "var(--warning-bg)", color: "var(--warning-text)" };
    case "expense_added":
    case "settlement_completed":
      return { ...base, background: "var(--success-bg)", color: "var(--success-text)" };
    default:
      return { ...base, background: "var(--card-background-hover)", color: "var(--text-secondary)" };
  }
}

export default function ActivityTimeline({ items, groupId }) {
  if (!items || items.length === 0) {
    return (
      <EmptyState
        icon={Activity}
        title="No recent activity"
        message="Changes to groups, expenses, and settlements will appear here."
      />
    );
  }

  return (
    <div className="timeline">
      {items.map((activity) => {
        const Icon = TYPE_META[activity.type]?.icon || Activity;
        const groupLink = groupId || activity.group_id;
        return (
          <div key={activity.id} className="timeline-item">
            <span className="timeline-dot" style={typeStyle(activity.type)} aria-hidden="true">
              <Icon style={{ width: 9, height: 9 }} />
            </span>
            <div style={{ minWidth: 0 }}>
              <div className="text-sm">{activity.message}</div>
              <div className="text-muted text-xs mt-1">
                {formatDateTime(activity.created_at)}
                {groupLink ? (
                  <>
                    {" · "}
                    <Link to={`/groups/${groupLink}`} className="link">
                      View group
                    </Link>
                  </>
                ) : null}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
