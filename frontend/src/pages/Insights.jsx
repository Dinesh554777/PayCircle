import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import AIInsights from "../components/AIInsights";
import SpendingPrediction from "../components/SpendingPrediction";
import BlurFade from "../components/magicui/BlurFade";
import Select from "../components/common/Select";
import Card from "../components/common/Card";
import EmptyState from "../components/common/EmptyState";
import { apiRequest } from "../api/client";

export default function Insights() {
  const [groups, setGroups] = useState([]);
  const [selectedGroupId, setSelectedGroupId] = useState("");

  useEffect(() => {
    apiRequest("/groups", { auth: true })
      .then((data) => {
        const list = Array.isArray(data) ? data : data.groups || [];
        setGroups(list);
      })
      .catch(() => {});
  }, []);

  return (
    <>
      <div className="flex justify-between items-end gap-3 wrap mb-4">
        <div>
          <h2 className="mb-1">
            <Sparkles aria-hidden="true" style={{ verticalAlign: "middle" }} /> AI Insights
          </h2>
          <p className="text-secondary mb-0">
            Understand your spending patterns and plan ahead.
          </p>
        </div>
        {groups.length > 0 && (
          <div style={{ width: 220 }}>
            <Select
              name="insightGroup"
              label="Group"
              options={[
                { value: "", label: "All Groups" },
                ...groups.map((g) => ({ value: String(g.id), label: g.name })),
              ]}
              value={selectedGroupId}
              onChange={(e) => setSelectedGroupId(e.target.value)}
            />
          </div>
        )}
      </div>

      {selectedGroupId && (
        <BlurFade delay={0} duration={0.3}>
          <Card className="mb-3">
            <p className="text-secondary mb-0 text-sm">
              Showing insights for <strong>{groups.find((g) => String(g.id) === selectedGroupId)?.name || "selected group"}</strong> only.
            </p>
          </Card>
        </BlurFade>
      )}

      <BlurFade delay={0.04} duration={0.4}>
        <SpendingPrediction groupId={selectedGroupId ? Number(selectedGroupId) : null} />
      </BlurFade>
      <BlurFade delay={0.1} duration={0.4}>
        <AIInsights groupId={selectedGroupId ? Number(selectedGroupId) : null} />
      </BlurFade>
    </>
  );
}
