import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, CheckCheck } from "lucide-react";
import Button from "../components/common/Button";
import Badge from "../components/common/Badge";
import EmptyState from "../components/common/EmptyState";
import ErrorState from "../components/common/ErrorState";
import Skeleton from "../components/common/Skeleton";
import { useToast } from "../components/common/Toast";
import { apiRequest } from "../api/client";
import { formatDateTime } from "../utils/format";

export default function Notifications() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const toast = useToast();

  function load() {
    setLoading(true);
    apiRequest("/notifications", { auth: true })
      .then((data) => {
        setNotifications(data.notifications);
        setTotal(data.total);
        setError("");
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  function markRead(item) {
    if (item.is_read) return;
    apiRequest(`/notifications/${item.id}/read`, { method: "PATCH", auth: true })
      .then(() => {
        setNotifications((items) =>
          items.map((n) => (n.id === item.id ? { ...n, is_read: true } : n))
        );
      })
      .catch(() => {});
  }

  function openNotification(item) {
    if (item.type === "group_invitation") {
      navigate("/invitations");
      return;
    }
    markRead(item);
  }

  function markAllRead() {
    apiRequest("/notifications/read-all", { method: "POST", auth: true })
      .then(() => {
        setNotifications((items) => items.map((n) => ({ ...n, is_read: true })));
        toast.success("All notifications marked as read");
      })
      .catch((err) => toast.error(err.message));
  }

  return (
    <>
      <div className="flex justify-between items-end gap-3 wrap mb-4">
        <div>
          <h2 className="mb-1">Notifications</h2>
          <p className="text-secondary mb-0">
            {total} notification{total === 1 ? "" : "s"}
            {unreadCount > 0 ? ` · ${unreadCount} unread` : ""}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button variant="secondary" onClick={markAllRead}>
            <CheckCheck aria-hidden="true" /> Mark all as read
          </Button>
        )}
      </div>

      {loading ? (
        <Skeleton type="card" style={{ height: 300 }} />
      ) : error ? (
        <ErrorState title="Couldn't load notifications" message={error} onRetry={load} />
      ) : notifications.length === 0 ? (
        <EmptyState icon={Bell} title="No notifications yet" message="You'll see activity here." />
      ) : (
        <div className="flex flex-column gap-2" style={{ maxWidth: 640 }}>
          {notifications.map((item) => (
            <div
              key={item.id}
              role={item.is_read ? undefined : "button"}
              tabIndex={item.is_read ? undefined : 0}
              onClick={() => openNotification(item)}
              onKeyDown={(event) => {
                if (!item.is_read && (event.key === "Enter" || event.key === " ")) {
                  event.preventDefault();
                  openNotification(item);
                }
              }}
              className={`notification-row${item.is_read ? "" : " notification-row-unread"}`}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="flex items-center gap-2">
                  <span className="text-semibold">{item.title}</span>
                  {!item.is_read && <Badge variant="warning" dotOnly title="Unread" />}
                </div>
                {item.message && <div className="text-sm text-secondary mt-1">{item.message}</div>}
                <div className="text-xs text-muted mt-1">{formatDateTime(item.created_at)}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
