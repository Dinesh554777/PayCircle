import { useEffect, useRef, useState } from "react";
import { apiRequest } from "../api/client";
import { formatDateTime } from "../utils/format";

export default function NotificationBell() {
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const ref = useRef(null);

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
          items.map((item) =>
            item.id === id ? { ...item, is_read: true } : item
          )
        );
        setUnreadCount((count) => Math.max(0, count - 1));
      })
      .catch(() => {});
  }

  function markAllRead() {
    apiRequest("/notifications/read-all", { method: "POST", auth: true })
      .then(() => {
        setNotifications((items) =>
          items.map((item) => ({ ...item, is_read: true }))
        );
        setUnreadCount(0);
      })
      .catch(() => {});
  }

  const unreadItems = notifications.filter((item) => !item.is_read);

  return (
    <div style={{ position: "relative" }} ref={ref}>
      <button
        type="button"
        onClick={toggle}
        aria-label="Notifications"
        style={{
          position: "relative",
          background: "#fff",
          border: "1px solid #e5e7eb",
          borderRadius: "0.5rem",
          width: 40,
          height: 40,
          fontSize: "1.1rem",
          cursor: "pointer",
        }}
      >
        <span aria-hidden="true">🔔</span>
        {unreadCount > 0 && (
          <span
            style={{
              position: "absolute",
              top: -6,
              right: -6,
              background: "#dc2626",
              color: "#fff",
              borderRadius: "999px",
              minWidth: 18,
              height: 18,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "0.7rem",
              fontWeight: 700,
              padding: "0 0.25rem",
            }}
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            right: 0,
            top: "calc(100% + 8px)",
            width: "min(360px, calc(100vw - 32px))",
            maxHeight: 420,
            overflowY: "auto",
            background: "#fff",
            border: "1px solid #e5e7eb",
            borderRadius: "0.5rem",
            boxShadow: "0 10px 25px rgba(0,0,0,0.15)",
            zIndex: 50,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "0.75rem 1rem",
              borderBottom: "1px solid #e5e7eb",
            }}
          >
            <strong>Notifications</strong>
            {unreadItems.length > 0 && (
              <button
                type="button"
                onClick={markAllRead}
                style={{
                  border: "none",
                  background: "none",
                  color: "#4f46e5",
                  cursor: "pointer",
                  fontSize: "0.875rem",
                }}
              >
                Mark all as read
              </button>
            )}
          </div>
          {loading ? (
            <p style={{ padding: "1rem", color: "#6b7280" }}>Loading...</p>
          ) : notifications.length === 0 ? (
            <p style={{ padding: "1rem", color: "#6b7280" }}>
              No notifications yet.
            </p>
          ) : (
            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {notifications.map((item) => (
                <li
                  key={item.id}
                  role={item.is_read ? undefined : "button"}
                  tabIndex={item.is_read ? undefined : 0}
                  aria-label={
                    item.is_read ? undefined : `Mark "${item.title}" as read`
                  }
                  onClick={() => !item.is_read && markRead(item.id)}
                  onKeyDown={(event) => {
                    if (
                      !item.is_read &&
                      (event.key === "Enter" || event.key === " ")
                    ) {
                      event.preventDefault();
                      markRead(item.id);
                    }
                  }}
                  style={{
                    padding: "0.6rem 1rem",
                    borderBottom: "1px solid #e5e7eb",
                    background: item.is_read ? "#fff" : "#f5f3ff",
                    cursor: item.is_read ? "default" : "pointer",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: "0.5rem",
                    }}
                  >
                    <strong style={{ fontSize: "0.875rem" }}>{item.title}</strong>
                    <span style={{ color: "#9ca3af", fontSize: "0.75rem", whiteSpace: "nowrap" }}>
                      {formatDateTime(item.created_at)}
                    </span>
                  </div>
                  {item.message && (
                    <div
                      style={{
                        color: "#4b5563",
                        fontSize: "0.8125rem",
                        marginTop: "0.2rem",
                      }}
                    >
                      {item.message}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
