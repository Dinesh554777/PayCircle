import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Sparkles,
  AlertTriangle,
  HeartPulse,
  Bot,
  ChevronRight,
  Handshake,
} from "lucide-react";
import Card from "./common/Card";
import Badge from "./common/Badge";
import EmptyState from "./common/EmptyState";
import { SkeletonText } from "./common/Skeleton";
import MagicCard from "./magicui/MagicCard";
import BlurFade from "./magicui/BlurFade";
import { apiRequest } from "../api/client";
import { formatMoney } from "../utils/format";

const QUICK_QUESTIONS = [
  "How should we settle up?",
  "Who do I owe?",
  "Show my recent expenses.",
  "How much did I spend this month?",
];

function healthTone(score) {
  if (score >= 80) return "success";
  if (score >= 60) return "info";
  if (score >= 40) return "warning";
  return "danger";
}

function healthColor(score) {
  if (score >= 80) return "var(--success)";
  if (score >= 60) return "var(--info)";
  if (score >= 40) return "var(--warning)";
  return "var(--danger)";
}

export default function SmartFeatures({ groupId, groupFilterId = null }) {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!groupId) {
      setLoading(false);
      setData(null);
      return;
    }
    let active = true;
    setLoading(true);
    const anomalyParams = new URLSearchParams();
    if (groupFilterId) anomalyParams.set("group_id", String(groupFilterId));
    const anomalyQs = anomalyParams.toString();
    Promise.all([
      apiRequest(`/groups/${groupId}/settlement-suggestions`, { auth: true }),
      apiRequest(`/groups/${groupId}/health`, { auth: true }),
      apiRequest(`/ai/anomalies${anomalyQs ? `?${anomalyQs}` : ""}`, { auth: true }),
    ])
      .then(([suggestions, health, anomalies]) => {
        if (active) setData({ suggestions, health, anomalies });
      })
      .catch(() => {
        if (active) setData(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [groupId, groupFilterId]);

  if (loading) {
    return (
      <div className="grid-2 mb-4">
        <Card>
          <SkeletonText lines={3} />
        </Card>
        <Card>
          <SkeletonText lines={3} />
        </Card>
        <Card>
          <SkeletonText lines={3} />
        </Card>
        <Card>
          <SkeletonText lines={3} />
        </Card>
      </div>
    );
  }

  const first = data?.suggestions?.suggestions?.[0];
  const expenseAnomaly = data?.anomalies?.anomalies?.find(
    (item) => item.kind === "expense"
  );
  const health = data?.health;

  return (
    <div className="grid-2 mb-4">
      <BlurFade delay={0.04} duration={0.4} className="h-full">
        <MagicCard className="smart-feature-card">
          <Card title="Smart Settlement">
            {!first && data?.suggestions?.settled_up ? (
              <div>
                <p className="text-secondary text-sm mb-2">
                  Great news — every member in{" "}
                  <strong>{data.suggestions.group_name}</strong> is settled up.
                </p>
                <Link to={`/groups/${groupId}/balances`} className="link text-sm">
                  Open Balances <ChevronRight aria-hidden="true" />
                </Link>
              </div>
            ) : first ? (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Handshake aria-hidden="true" className="text-primary" />
                  <div>
                    <div className="text-semibold">
                      {first.payer?.name} should pay {first.receiver?.name}{" "}
                      {formatMoney(first.amount)}
                    </div>
                    <div className="text-muted text-sm">
                      Clearing {data.suggestions.payment_count} optimized payment
                      {data.suggestions.payment_count === 1 ? "" : "s"} (
                      {formatMoney(data.suggestions.total_amount)}) in{" "}
                      {data.suggestions.group_name}.
                    </div>
                  </div>
                </div>
                <Link to={`/groups/${groupId}/balances`} className="link text-sm">
                  Settle in Balances <ChevronRight aria-hidden="true" />
                </Link>
              </div>
            ) : (
              <EmptyState
                icon={Sparkles}
                title="No settlement suggestions"
                message="Add expenses to see optimized settlement suggestions."
              />
            )}
          </Card>
        </MagicCard>
      </BlurFade>

      <BlurFade delay={0.1} duration={0.4} className="h-full">
        <MagicCard className="smart-feature-card">
          <Card title="Unusual Spending">
            {expenseAnomaly ? (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle
                    aria-hidden="true"
                    className="text-warning"
                    style={{ flexShrink: 0 }}
                  />
                  <div>
                    <div className="text-semibold">
                      {expenseAnomaly.title} — {formatMoney(expenseAnomaly.amount)}
                    </div>
                    <div className="text-muted text-sm">
                      {expenseAnomaly.reason}
                    </div>
                  </div>
                </div>
                {expenseAnomaly.group_id && (
                  <Link
                    to={`/groups/${expenseAnomaly.group_id}/expenses`}
                    className="link text-sm"
                  >
                    View Expense <ChevronRight aria-hidden="true" />
                  </Link>
                )}
              </div>
            ) : (
              <EmptyState
                icon={AlertTriangle}
                title="No unusual spending"
                message="Nothing stands out — your expenses are in line with your usual patterns."
              />
            )}
          </Card>
        </MagicCard>
      </BlurFade>

      <BlurFade delay={0.16} duration={0.4} className="h-full">
        <MagicCard className="smart-feature-card">
          <Card
            title={
              <span className="flex items-center gap-2">
                <HeartPulse aria-hidden="true" className="text-primary" /> Group Health
              </span>
            }
          >
            {health ? (
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <Badge variant={healthTone(health.score)}>
                    {health.score}/100
                  </Badge>
                  <span className="text-semibold">{health.label}</span>
                </div>
                <p className="text-muted text-sm mb-2">{health.main_reason}</p>
                <p className="text-secondary text-sm mb-2">{health.suggested_action}</p>
                <Link to={`/groups/${health.group_id}`} className="link text-sm">
                  View group <ChevronRight aria-hidden="true" />
                </Link>
              </div>
            ) : (
              <EmptyState
                icon={HeartPulse}
                title="No group health"
                message="Create a group to see its spending health score."
              />
            )}
          </Card>
        </MagicCard>
      </BlurFade>

      <BlurFade delay={0.22} duration={0.4} className="h-full">
        <MagicCard
          className="smart-feature-card smart-feature-card-accent"
          gradientFrom="#6C4BF4"
          gradientTo="#8B7CF6"
          gradientColor="rgba(108, 75, 244, 0.16)"
        >
          <Card title="Ask PayCircle">
            <div>
              <p className="text-secondary text-sm mb-3">
                Get instant answers about your spending, who you owe, and how to
                settle up — powered by your own data.
              </p>
              <div className="flex flex-column gap-2">
                {QUICK_QUESTIONS.map((question) => (
                  <button
                    key={question}
                    type="button"
                    className="chip"
                    onClick={() =>
                      navigate(`/chat?q=${encodeURIComponent(question)}`)
                    }
                  >
                    <Bot aria-hidden="true" /> {question}
                  </button>
                ))}
              </div>
            </div>
          </Card>
        </MagicCard>
      </BlurFade>
    </div>
  );
}
