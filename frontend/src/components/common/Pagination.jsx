import { ChevronLeft, ChevronRight } from "lucide-react";

export default function Pagination({ page, pageSize, total, onChange, className = "" }) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (totalPages <= 1) return null;

  return (
    <div className={`flex items-center gap-2 justify-between ${className}`}>
      <span className="text-xs text-muted">
        Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of {total}
      </span>
      <div className="flex gap-1 items-center">
        <button
          type="button"
          className="icon-btn"
          aria-label="Previous page"
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
        >
          <ChevronLeft aria-hidden="true" />
        </button>
        <span className="text-sm text-secondary" style={{ minWidth: 60, textAlign: "center" }}>
          {page} / {totalPages}
        </span>
        <button
          type="button"
          className="icon-btn"
          aria-label="Next page"
          disabled={page >= totalPages}
          onClick={() => onChange(page + 1)}
        >
          <ChevronRight aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
