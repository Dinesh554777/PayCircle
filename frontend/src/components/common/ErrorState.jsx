import { AlertCircle, RefreshCw } from "lucide-react";

export default function ErrorState({ title = "Something went wrong", message, onRetry, retryLabel = "Retry", compact = false, className = "" }) {
  return (
    <div className={`error-state ${className}`} role="alert">
      <AlertCircle aria-hidden="true" style={{ width: compact ? 20 : 28, height: compact ? 20 : 28, color: "var(--danger)" }} />
      <div className="error-title">{title}</div>
      {message && <div className="error-text">{message}</div>}
      {onRetry && (
        <button type="button" className="btn btn-secondary btn-sm" onClick={onRetry}>
          <RefreshCw aria-hidden="true" />
          {retryLabel}
        </button>
      )}
    </div>
  );
}
