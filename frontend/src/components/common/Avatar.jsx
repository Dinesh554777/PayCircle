const AVATAR_COLORS = [
  "#4f46e5",
  "#0ea5e9",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#14b8a6",
  "#f97316",
  "#ec4899",
  "#64748b",
];

function initials(name) {
  if (!name) return "?";
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function colorFor(name) {
  let hash = 0;
  for (let i = 0; i < (name || "").length; i += 1) {
    hash = (hash * 31 + name.charCodeAt(i)) % 997;
  }
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

export default function Avatar({ name, size = "md", className = "" }) {
  return (
    <span
      className={`avatar avatar-${size} ${className}`}
      style={{ background: colorFor(name) }}
      aria-label={name || "user"}
      title={name}
    >
      {initials(name)}
    </span>
  );
}
