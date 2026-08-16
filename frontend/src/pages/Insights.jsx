import { Sparkles } from "lucide-react";
import AIInsights from "../components/AIInsights";
import SpendingPrediction from "../components/SpendingPrediction";
import BlurFade from "../components/magicui/BlurFade";

export default function Insights() {
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
      </div>

      <BlurFade delay={0.04} duration={0.4}>
        <SpendingPrediction />
      </BlurFade>
      <BlurFade delay={0.1} duration={0.4}>
        <AIInsights />
      </BlurFade>
    </>
  );
}
