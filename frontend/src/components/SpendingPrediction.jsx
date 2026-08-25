import { useEffect, useState } from "react";
import { LineChart as LineChartIcon } from "lucide-react";
import Card from "./common/Card";
import Skeleton, { SkeletonText } from "./common/Skeleton";
import EmptyState from "./common/EmptyState";
import Badge from "./common/Badge";
import { apiRequest } from "../api/client";
import { formatMoney } from "../utils/format";

export default function SpendingPrediction({ groupId = null }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams();
    if (groupId) params.set("group_id", String(groupId));
    const qs = params.toString();
    apiRequest(`/ai/prediction${qs ? `?${qs}` : ""}`, { auth: true })
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [groupId]);

  if (loading) {
    return (
      <Card className="mb-4">
        <div className="flex items-center gap-2 mb-3">
          <LineChartIcon aria-hidden="true" className="text-primary" />
          <h3 className="mb-0">Spending Prediction</h3>
        </div>
        <SkeletonText lines={2} />
      </Card>
    );
  }

  if (!data) return null;

  return (
    <Card className="mb-4">
      <div className="card-title-row">
        <span className="flex items-center gap-2">
          <LineChartIcon aria-hidden="true" className="text-primary" />
          <h3 className="mb-0">Spending Prediction</h3>
          <Badge variant="primary">AI</Badge>
        </span>
      </div>

      {data.has_prediction ? (
        <>
          <p className="text-secondary mb-3">
            Estimated spending for <strong className="text-primary">{data.period_label}</strong>:
          </p>
          <div className="prediction-amount">{formatMoney(data.predicted_amount)}</div>
          <p className="text-secondary text-sm">{data.message}</p>
          {data.based_on_months.length > 0 && (
            <div className="insight-block">
              <h4 className="insight-block-title">Based on your history</h4>
              {data.based_on_months.map((month) => (
                <div key={month.month} className="month-row">
                  <span className="text-secondary">{month.label}</span>
                  <span className="text-semibold">{formatMoney(month.amount)}</span>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        <EmptyState
          title="No prediction yet"
          message={data.message || "Add more expenses to unlock spending predictions."}
        />
      )}

      <p className="text-muted text-xs mb-0">
        Based on your monthly spending history. Rough estimate only.
      </p>
    </Card>
  );
}
