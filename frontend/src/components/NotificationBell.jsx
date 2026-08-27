import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, CheckCheck, Settings, Volume2, VolumeOff } from "lucide-react";
import { apiRequest } from "../api/client";
import { formatDateTime } from "../utils/format";
import Badge from "./common/Badge";
import { useNotificationSound } from "../hooks/useNotificationSound";

export default function NotificationBell() {
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const ref = useRef(null);
  const navigate = useNavigate();
  const { soundOn, toggleSound } = useNotificationSound(unreadCount);

  function refreshCount() {
    apiRequest("/notifications/unread-count", { auth: true })
      .then((data) => setUnreadCount(data.unread_count))
      .catch(() => {});
  }

  useEffect(() => {
    refreshCount();
    const interval = setInterval(refreshCount, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    function handleClickOutside(event) {
      if (ref.current && !ref.current.contains(event.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function toggle() {
    const nextOpen = !open;
    setOpen(nextOpen);
    if (nextOpen) {
      setLoading(true);
      apiRequest("/notifications", { auth: true })
        .then((data) => {
          setNotifications(data.notifications);
          setUnreadCount(data.unread_count);
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }

  function markRead(id) {
    apiRequest(`/notifications/${id}/read`, { method: "PATCH", auth: true })
      .then(() => {
        setNotifications((items) =>
          items.map((item) => (item.id === id ? { ...item, is_read: true } : item))
        );
        setUnreadCount((count) => Math.max(0, count - 1));
      })
      .catch(() => {});
  }

  function markAllRead() {
    apiRequest("/notifications/read-all", { method: "POST", auth: true })
      .then(() => {
        setNotifications((items) => items.map((item) => ({ ...item, is_read: true })));
        setUnreadCount(0);
      })
      .catch(() => {});
  }

  const unreadItems = notifications.filter((item) => !item.is_read);

  return (
    <div style={{ position: "relative" }} ref={ref}>
      <button
        type="button"
        className="icon-btn"
        onClick={toggle}
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
      >
        <Bell aria-hidden="true" />
        {unreadCount > 0 && (
          <span className="badge-dot" aria-hidden="true">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="dropdown dropdown-right dropdown-lg notification-panel">
          <div className="dropdown-head">
            <span className="text-semibold">Notifications</span>
            <div className="flex gap-1">
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={toggleSound}
                aria-label={soundOn ? "Mute notification sounds" : "Unmute notification sounds"}
                title={soundOn ? "Sound on" : "Sound off"}
              >
                {soundOn ? <Volume2 aria-hidden="true" /> : <VolumeOff aria-hidden="true" />}
              </button>
              {unreadItems.length > 0 && (
                <button type="button" className="btn btn-ghost btn-sm" onClick={markAllRead}>
                  <CheckCheck aria-hidden="true" /> Mark all read
                </button>
              )}
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => {
                  setOpen(false);
                  navigate("/notifications");
                }}
              >
                <Settings aria-hidden="true" /> View all
              </button>
            </div>
          </div>
          {loading ? (
            <p className="dropdown-empty">Loading…</p>
          ) : notifications.length === 0 ? (
            <p className="dropdown-empty">No notifications yet.</p>
          ) : (
            <ul className="notification-list" style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {notifications.map((item) => (
                <li
                  key={item.id}
                  role={item.is_read ? undefined : "button"}
                  tabIndex={item.is_read ? undefined : 0}
                  aria-label={item.is_read ? undefined : `Mark "${item.title}" as read`}
                  onClick={() => !item.is_read && markRead(item.id)}
                  onKeyDown={(event) => {
                    if (!item.is_read && (event.key === "Enter" || event.key === " ")) {
                      event.preventDefault();
                      markRead(item.id);
                    }
                  }}
                  className={item.is_read ? "notification-item" : "notification-item notification-item-unread"}
                >
                  <div className="flex justify-between gap-2">
                    <span className="text-semibold text-sm">{item.title}</span>
                    {!item.is_read && <Badge variant="warning" dotOnly />}
                  </div>
                  {item.message && <div className="text-sm text-secondary mt-1">{item.message}</div>}
                  <div className="text-xs text-muted mt-1">{formatDateTime(item.created_at)}</div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
