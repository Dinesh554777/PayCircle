const AVATAR_COLORS = [
  "#6C4BF4",
  "#4F46E5",
  "#8B7CF6",
  "#7C3AED",
  "#9333EA",
  "#6366F1",
  "#A78BFA",
  "#5B21B6",
  "#4338CA",
  "#4C1D95",
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
