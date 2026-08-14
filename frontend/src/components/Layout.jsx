import { Outlet, NavLink, useNavigate } from "react-router-dom";

export default function Layout() {
  const navigate = useNavigate();

  function handleLogout() {
    localStorage.removeItem("paycircle_user");
    navigate("/login");
  }

  const navItems = [
    { to: "/dashboard", label: "Dashboard" },
    { to: "/groups", label: "Groups" },
    { to: "/expenses", label: "Expenses" },
    { to: "/insights", label: "AI Insights" },
    { to: "/profile", label: "Profile" },
  ];

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <aside
        style={{
          width: 220,
          background: "#111827",
          color: "#e5e7eb",
          padding: "1rem",
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
        <button
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
      <main style={{ flex: 1, padding: "2rem" }}>
        <Outlet />
      </main>
    </div>
  );
}
