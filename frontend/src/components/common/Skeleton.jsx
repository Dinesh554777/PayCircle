export default function Skeleton({ type = "text", width, height, style, className = "" }) {
  return (
    <div
      className={`skeleton ${type === "title" ? "skeleton-title" : ""} ${
        type === "card" ? "skeleton-card" : type === "avatar" ? "skeleton-avatar" : "skeleton-text"
      } ${className}`}
      style={{ width, height, ...style }}
      aria-hidden="true"
    />
  );
}

export function SkeletonText({ lines = 3, className = "" }) {
  return (
    <div className={`flex-col gap-2 ${className}`}>
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton key={index} style={{ width: `${100 - index * 12}%` }} />
      ))}
    </div>
  );
}

export function SkeletonCard({ height = 120, className = "" }) {
  return <Skeleton type="card" style={{ height }} className={className} />;
}

export function SkeletonStatGrid({ count = 4, className = "" }) {
  return (
    <div className={`grid grid-auto ${className}`}>
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="card">
          <Skeleton style={{ width: "40%" }} className="mb-2" />
          <Skeleton style={{ width: "70%", height: "1.5rem" }} />
        </div>
      ))}
    </div>
  );
}
