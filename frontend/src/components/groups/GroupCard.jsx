import { Link } from "react-router-dom";
import { Users, Wallet, ArrowUpRight } from "lucide-react";
import Card from "../common/Card";
import MagicCard from "../magicui/MagicCard";
import AvatarGroup from "../common/AvatarGroup";
import ProgressBar from "../common/ProgressBar";
import { formatMoney } from "../../utils/format";
import { cn } from "../../lib/utils";

export default function GroupCard({ group, magic = false }) {
  const balance = Number(group.my_balance || 0);
  const balanceText = balance > 0 ? `+${formatMoney(balance)}` : formatMoney(balance);
  const balanceTone = balance > 0 ? "var(--success-text)" : balance < 0 ? "var(--danger-text)" : "var(--text-muted)";
  const members = group.members || [];
  const totalExpenses = Number(group.total_expenses || 0);

  const body = (
    <>
      <div className="flex justify-between items-start gap-2">
        <h3 className="text-base mb-0 text-primary">{group.name}</h3>
        <span className="icon-btn" style={{ pointerEvents: "none" }} aria-hidden="true">
          <ArrowUpRight />
        </span>
      </div>

      {group.description && (
        <p className="text-sm text-secondary mb-0" style={{ marginTop: "-0.25rem" }}>
          {group.description.length > 90
            ? `${group.description.slice(0, 90)}…`
            : group.description}
        </p>
      )}

      <div className="group-card-meta">
        {members.length > 0 ? (
          <AvatarGroup people={members.map((m) => m.user)} size="sm" max={4} />
        ) : (
          <Users aria-hidden="true" />
        )}
        <span>{group.member_count} members</span>
        <span aria-hidden="true">·</span>
        <span>{formatMoney(totalExpenses)} total</span>
      </div>

      <div className="flex justify-between items-center">
        <span className="text-sm text-secondary">Your balance</span>
        <span className="text-semibold" style={{ color: balanceTone }}>
          {balanceText}
        </span>
      </div>

      <ProgressBar
        value={Math.abs(balance)}
        max={Math.max(Math.abs(balance), totalExpenses, 1)}
        color={balance >= 0 ? "var(--success)" : "var(--danger)"}
      />

      <div className="flex items-center gap-1 text-sm text-secondary" style={{ marginTop: "auto" }}>
        <Wallet aria-hidden="true" style={{ width: 14, height: 14 }} />
        <span>Tap to open</span>
      </div>
    </>
  );

  return (
    <Link to={`/groups/${group.id}`} style={{ textDecoration: "none", height: "100%" }}>
      {magic ? (
        <MagicCard className={cn("group-card", "group-card-magic")}>{body}</MagicCard>
      ) : (
        <Card className="group-card card-hover">{body}</Card>
      )}
    </Link>
  );
}
