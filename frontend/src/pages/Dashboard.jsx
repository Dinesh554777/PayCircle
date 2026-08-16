import { lazy, Suspense, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Plus, UserPlus, Receipt, Wallet, TrendingUp, AlertCircle } from "lucide-react";
import Card from "../components/common/Card";
import Select from "../components/common/Select";
import Button from "../components/common/Button";
import StatCard from "../components/common/StatCard";
import EmptyState from "../components/common/EmptyState";
import ErrorState from "../components/common/ErrorState";
import Skeleton, { SkeletonText } from "../components/common/Skeleton";
import GroupCard from "../components/groups/GroupCard";
import TransactionItem from "../components/transactions/TransactionItem";
import AIInsights from "../components/AIInsights";
import SpendingPrediction from "../components/SpendingPrediction";
import BudgetCard from "../components/BudgetCard";
import ActivityTimeline from "../components/ActivityTimeline";
import SmartFeatures from "../components/SmartFeatures";
import { apiRequest } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { formatMoney } from "../utils/format";

const ChartsGrid = lazy(() =>
  import("../components/dashboard/Charts").then((module) => ({
    default: module.ChartsGrid,
  }))
);

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [quickGroupId, setQuickGroupId] = useState("");

  function loadDashboard() {
    setLoading(true);
    setError("");
    apiRequest("/dashboard", { auth: true })
      .then((dashboard) => {
        setData(dashboard);
        if (dashboard.recent_groups.length > 0 && !quickGroupId) {
          setQuickGroupId(String(dashboard.recent_groups[0].id));
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadDashboard();
  }, []);

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
              <Button type="submit" variant="primary">
                <Plus aria-hidden="true" /> Quick Add
              </Button>
            </form>
          ) : (
            <Link to="/groups">
              <Button variant="primary">
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
              <StatCard key={stat.label} {...stat} />
            ))}
          </div>

          <Suspense
            fallback={
              <Card className="mb-4">
                <SkeletonText lines={4} />
              </Card>
            }
          >
            <ChartsGrid data={data} />
          </Suspense>

          <BudgetCard budget={data.analytics?.budget} />

          <SmartFeatures
            groupId={data.recent_groups.length > 0 ? data.recent_groups[0].id : null}
          />

          <SpendingPrediction />

          <AIInsights />

          <div className="grid-2 mb-4">
            <Card title={`Your Groups (${data.group_count})`}>
              {data.recent_groups.length === 0 ? (
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
              ) : (
                <div className="flex flex-column gap-3">
                  {data.recent_groups.map((group) => (
                    <GroupCard key={group.id} group={group} />
                  ))}
                </div>
              )}
              {data.recent_groups.length > 0 && (
                <p className="mb-0 mt-3">
                  <Link to="/groups" className="link">
                    View all groups →
                  </Link>
                </p>
              )}
            </Card>

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
                <div className="flex flex-column">
                  {data.recent_transactions.map((item, index) => (
                    <TransactionItem
                      key={`${item.type}-${item.date}-${index}`}
                      item={item}
                      groupId={item.group?.id}
                    />
                  ))}
                </div>
              )}
            </Card>
          </div>

          <Card title="Recent Activity" className="mb-4">
            <ActivityTimeline items={data.recent_activity} />
          </Card>
        </>
      ) : null}
    </>
  );
}
