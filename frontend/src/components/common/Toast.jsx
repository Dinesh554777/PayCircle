import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from "lucide-react";

const ToastContext = createContext(null);

const ICONS = {
  success: CheckCircle2,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
};

let toastId = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timersRef = useRef({});

  const dismiss = useCallback((id) => {
    setToasts((items) => items.map((t) => (t.id === id ? { ...t, leaving: true } : t)));
    window.setTimeout(() => {
      setToasts((items) => items.filter((t) => t.id !== id));
      delete timersRef.current[id];
    }, 200);
  }, []);

  const push = useCallback(
    (message, type = "info", duration = 4000) => {
      const id = ++toastId;
      setToasts((items) => [...items, { id, message, type }]);
      timersRef.current[id] = window.setTimeout(() => dismiss(id), duration);
      return id;
    },
    [dismiss]
  );

  const showToast = useMemo(() => {
    const api = (message, type, duration) => push(message, type, duration);
    api.success = (message, duration) => push(message, "success", duration);
    api.error = (message, duration) => push(message, "error", duration ?? 6000);
    api.warning = (message, duration) => push(message, "warning", duration);
    api.info = (message, duration) => push(message, "info", duration);
    return api;
  }, [push]);

  return (
    <ToastContext.Provider value={showToast}>
      {children}
      {createPortal(
        <div className="toast-stack" role="status" aria-live="polite">
          {toasts.map((toast) => {
            const Icon = ICONS[toast.type] || Info;
            return (
              <div
                key={toast.id}
                className={`toast toast-${toast.type}${toast.leaving ? " toast-leaving" : ""}`}
              >
                <span className="toast-icon">
                  <Icon aria-hidden="true" style={{ width: 18, height: 18 }} />
                </span>
                <div className="toast-body">{toast.message}</div>
                <button
                  type="button"
                  className="toast-close"
                  onClick={() => dismiss(toast.id)}
                  aria-label="Dismiss notification"
                >
                  <X aria-hidden="true" />
                </button>
              </div>
            );
          })}
        </div>,
        document.body
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}
