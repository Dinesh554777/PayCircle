import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import NotificationBell from "./NotificationBell";

export default function Layout() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  function handleLogout() {
    logout();
    navigate("/login");
  }

  const navItems = [
    { to: "/dashboard", label: "Dashboard" },
    { to: "/groups", label: "Groups" },
    { to: "/chat", label: "AI Chat" },
    { to: "/profile", label: "Profile" },
  ];
  if (user?.is_admin) {
    navItems.push({ to: "/admin", label: "Admin" });
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <aside
        className="layout-sidebar"
        style={{
          background: "#111827",
          color: "#e5e7eb",
          padding: "1rem",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <h2 style={{ marginTop: 0 }}>PayCircle</h2>
        <nav style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              style={({ isActive }) => ({
                color: isActive ? "#fff" : "#9ca3af",
                fontWeight: isActive ? 600 : 400,
                padding: "0.5rem",
                borderRadius: "0.25rem",
                background: isActive ? "#374151" : "transparent",
              })}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <p style={{ fontSize: "0.875rem", color: "#9ca3af", marginTop: "1rem" }}>
          Signed in as {user?.name || user?.email}
        </p>
        <button
          type="button"
          onClick={handleLogout}
          style={{
            marginTop: "auto",
            display: "block",
            width: "100%",
            padding: "0.5rem",
            border: "none",
            borderRadius: "0.25rem",
            background: "#dc2626",
            color: "#fff",
            cursor: "pointer",
          }}
        >
          Logout
        </button>
      </aside>
      <main className="layout-main">
        <div
          style={{
            position: "absolute",
            top: "1.5rem",
            right: "2rem",
            zIndex: 40,
          }}
        >
          <NotificationBell />
        </div>
        <Outlet />
      </main>
    </div>
  );
}
