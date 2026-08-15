import { getCategoryConfig } from "../../constants/categories";

export default function CategoryBadge({ category, showAi, aiConfidence, size = "md" }) {
  if (!category) return null;
  const config = getCategoryConfig(category);
  const Icon = config.icon;

  return (
    <span
      className="cat-badge"
      style={{ color: config.color, background: config.soft }}
      title={showAi ? `Category suggested by AI (${Math.round((aiConfidence ?? 0) * 100)}% confidence)` : undefined}
    >
      <Icon aria-hidden="true" />
      {category}
      {showAi && <span className="text-xs" style={{ opacity: 0.85 }}>· AI</span>}
    </span>
  );
}
