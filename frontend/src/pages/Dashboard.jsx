import { lazy, Suspense, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Plus, UserPlus, Receipt, Wallet, TrendingUp, AlertCircle, ArrowDownRight, ArrowUpRight } from "lucide-react";
import Card from "../components/common/Card";
import Select from "../components/common/Select";
import Button from "../components/common/Button";
import StatCard from "../components/common/StatCard";
import EmptyState from "../components/common/EmptyState";
import ErrorState from "../components/common/ErrorState";
import Skeleton, { SkeletonText } from "../components/common/Skeleton";
import TransactionItem from "../components/transactions/TransactionItem";
import AIInsights from "../components/AIInsights";
import SpendingPrediction from "../components/SpendingPrediction";
import BudgetCard from "../components/BudgetCard";
import ActivityTimeline from "../components/ActivityTimeline";
import SmartFeatures from "../components/SmartFeatures";
import BlurFade from "../components/magicui/BlurFade";
import AnimatedList from "../components/magicui/AnimatedList";
import MagicCard from "../components/magicui/MagicCard";
import { apiRequest } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { formatMoney } from "../utils/format";

const ChartsGrid = lazy(() =>
  import("../components/dashboard/Charts").then((module) => ({
    default: module.ChartsGrid,
  }))
);

function GroupFinancialCard({ group }) {
  const net = Number(group.my_balance || 0);
  const netLabel = net > 0 ? `+${formatMoney(net)}` : net < 0 ? formatMoney(net) : formatMoney(0);
  const netClass = net > 0 ? "text-success" : net < 0 ? "text-danger" : "text-secondary";

  return (
    <BlurFade delay={0.05} duration={0.4} className="h-full">
      <MagicCard className="h-full">
        <Card className="h-full" style={{ padding: "1.25rem" }}>
          <div className="flex justify-between items-start mb-3">
            <h3 className="mb-0 text-semibold">{group.name}</h3>
            <span className={`text-lg text-bold ${netClass}`}>{netLabel}</span>
          </div>

          <div className="flex flex-column gap-2 mb-3">
            <div className="flex justify-between text-sm">
              <span className="text-secondary">Total Spent</span>
              <span className="text-semibold">{formatMoney(group.total_expenses)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-secondary">You Paid</span>
              <span className="text-semibold">{formatMoney(group.amount_paid)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-secondary">You Owe</span>
              <span className="text-semibold text-danger">{formatMoney(group.amount_owed)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-secondary">You Are Owed</span>
              <span className="text-semibold text-success">{formatMoney(group.amount_to_receive)}</span>
            </div>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-muted text-xs">{group.member_count} member{group.member_count === 1 ? "" : "s"}</span>
            <Link to={`/groups/${group.id}`}>
              <Button variant="primary" size="sm">View Group</Button>
            </Link>
          </div>
        </Card>
      </MagicCard>
    </BlurFade>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [quickGroupId, setQuickGroupId] = useState("");
  const [selectedGroupId, setSelectedGroupId] = useState("");

  function loadDashboard() {
    setLoading(true);
    setError("");
    setData(null);
    const url = selectedGroupId
      ? `/dashboard?group_id=${selectedGroupId}`
      : "/dashboard";
    apiRequest(url, { auth: true })
      .then((dashboard) => {
        setData(dashboard);
        if (!selectedGroupId && dashboard.recent_groups.length > 0 && !quickGroupId) {
          setQuickGroupId(String(dashboard.recent_groups[0].id));
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadDashboard();
  }, [selectedGroupId]);

  function handleQuickAdd(event) {
    event.preventDefault();
    if (quickGroupId) {
      navigate(`/groups/${quickGroupId}/expenses/new`);
    }
  }

  const firstName = user?.name ? user.name.split(" ")[0] : "there";
  const hasGroups = data ? data.recent_groups.length > 0 : false;

  const stats = data
    ? [
        {
          label: "Total Expenses",
          value: formatMoney(data.total_expenses),
          countUp: Number(data.total_expenses || 0),
          icon: Wallet,
          tone: "primary",
        },
        {
          label: "Amount Paid",
          value: formatMoney(data.amount_paid),
          countUp: Number(data.amount_paid || 0),
          icon: Receipt,
          tone: "info",
        },
        {
          label: "Amount Owed",
          value: formatMoney(data.amount_owed),
          countUp: Number(data.amount_owed || 0),
          icon: AlertCircle,
          tone: "danger",
        },
        {
          label: "Amount to Receive",
          value: formatMoney(data.amount_to_receive),
          countUp: Number(data.amount_to_receive || 0),
          icon: TrendingUp,
          tone: "success",
        },
      ]
    : [];

  const filteredGroups = data?.recent_groups || [];

  const selectedGroupAnalytics = data?.analytics;

  return (
    <>
      <div className="flex justify-between items-end gap-3 wrap mb-4">
        <div>
          <h2 className="mb-1">Welcome back, {firstName}.</h2>
          <p className="text-secondary mb-0">Here's your money at a glance.</p>
        </div>
        {!loading && !error && data && (
          hasGroups ? (
            <form onSubmit={handleQuickAdd} className="flex gap-2 items-end wrap">
              <div style={{ width: 190 }}>
                <Select
                  label="Group"
                  name="quickGroup"
                  options={data.recent_groups.map((g) => ({ value: String(g.id), label: g.name }))}
                  value={quickGroupId}
                  onChange={(e) => setQuickGroupId(e.target.value)}
                />
              </div>
              <Button type="submit" variant="primary" className="btn-magic">
                <Plus aria-hidden="true" /> Quick Add
              </Button>
            </form>
          ) : (
            <Link to="/groups">
              <Button variant="secondary">
                <UserPlus aria-hidden="true" /> Create a Group
              </Button>
            </Link>
          )
        )}
      </div>

      {loading ? (
        <>
          <div className="grid-4 mb-4">
            <Skeleton />
            <Skeleton />
            <Skeleton />
            <Skeleton />
          </div>
          <Card className="mb-4">
            <SkeletonText lines={4} />
          </Card>
          <Card className="mb-4">
            <SkeletonText lines={3} />
          </Card>
        </>
      ) : error ? (
        <ErrorState title="Something went wrong" message={error} onRetry={loadDashboard} />
      ) : data ? (
        <>
          <div className="grid-4 mb-4">
            {stats.map((stat) => (
              <BlurFade key={stat.label} delay={0.05} duration={0.4} className="h-full">
                <StatCard magic {...stat} className="h-full" />
              </BlurFade>
            ))}
          </div>

          <BlurFade delay={0.1} duration={0.4}>
            <Suspense
              fallback={
                <Card className="mb-4">
                  <SkeletonText lines={4} />
                </Card>
              }
            >
              <ChartsGrid data={data} />
            </Suspense>
          </BlurFade>

          <BlurFade delay={0.14} duration={0.4}>
            <BudgetCard budget={selectedGroupAnalytics?.budget} />
          </BlurFade>

          <BlurFade delay={0.28} duration={0.4}>
            <div className="mb-4">
              <div className="flex justify-between items-end gap-3 wrap mb-3">
                <h2 className="mb-0">Your Groups</h2>
                {hasGroups && (
                  <div style={{ width: 200 }}>
                    <Select
                      name="groupFilter"
                      options={[
                        { value: "", label: "All Groups" },
                        ...data.recent_groups.map((g) => ({ value: String(g.id), label: g.name })),
                      ]}
                      value={selectedGroupId}
                      onChange={(e) => setSelectedGroupId(e.target.value)}
                    />
                  </div>
                )}
              </div>

              {filteredGroups.length === 0 ? (
                <Card>
                  <EmptyState
                    icon={UserPlus}
                    title="No groups yet"
                    message={
                      <>
                        Create your first group to start splitting expenses.{" "}
                        <Link to="/groups" className="link">
                          Get started
                        </Link>
                      </>
                    }
                  />
                </Card>
              ) : (
                <div className="grid-3">
                  {filteredGroups.map((group) => (
                    <GroupFinancialCard key={group.id} group={group} />
                  ))}
                </div>
              )}
            </div>
          </BlurFade>

          <BlurFade delay={0.32} duration={0.4}>
            <SmartFeatures
              groupId={filteredGroups.length > 0 ? filteredGroups[0].id : null}
              groupFilterId={selectedGroupId ? Number(selectedGroupId) : null}
            />
          </BlurFade>

          <BlurFade delay={0.36} duration={0.4}>
            <SpendingPrediction groupId={selectedGroupId ? Number(selectedGroupId) : null} />
          </BlurFade>

          <BlurFade delay={0.4} duration={0.4}>
            <AIInsights groupId={selectedGroupId ? Number(selectedGroupId) : null} />
          </BlurFade>

          <BlurFade delay={0.44} duration={0.4}>
            <div className="grid-2 mb-4">
              <Card title="Recent Transactions">
                {data.recent_transactions.length === 0 ? (
                  <EmptyState
                    icon={Receipt}
                    title="No activity yet"
                    message={
                      <>
                        Pick a group and add an expense to get started.{" "}
                        <Link to="/groups" className="link">
                          Browse groups
                        </Link>
                      </>
                    }
                  />
                ) : (
                  <AnimatedList
                    delay={140}
                    className="animated-list-stretch animated-list-gap-0"
                  >
                    {data.recent_transactions.map((item, index) => (
                      <TransactionItem
                        key={`${item.type}-${item.date}-${index}`}
                        item={item}
                        groupId={item.group?.id}
                      />
                    ))}
                  </AnimatedList>
                )}
              </Card>

              <Card title="Recent Activity">
                <ActivityTimeline items={data.recent_activity} />
              </Card>
            </div>
          </BlurFade>
        </>
      ) : null}
    </>
  );
}
