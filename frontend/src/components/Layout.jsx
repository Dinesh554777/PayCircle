import { useEffect, useState } from "react";
import { useLocation, useNavigate, NavLink, Outlet } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  Receipt,
  Scale,
  ArrowLeftRight,
  Sparkles,
  MessageSquare,
  Bell,
  User,
  Shield,
  LogOut,
  Moon,
  Sun,
  Menu,
  ChevronLeft,
  Wallet,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import Avatar from "./common/Avatar";
import Dropdown from "./common/Dropdown";
import GlobalSearch from "./GlobalSearch";
import NotificationBell from "./NotificationBell";

function activeGroupKey(userId) {
  return `paycircle_active_group_${userId}`;
}

function getPageTitle(pathname) {
  if (pathname.startsWith("/groups")) {
    if (pathname.includes("/expenses/new")) return "Add Expense";
    if (pathname.includes("/expenses/edit")) return "Edit Expense";
    if (pathname.includes("/expenses")) return "Expenses";
    if (pathname.includes("/balances")) return "Balances";
    if (pathname.includes("/transactions")) return "Transactions";
    return "Group";
  }
  if (pathname.startsWith("/chat")) return "AI Assistant";
  if (pathname.startsWith("/insights")) return "AI Insights";
  if (pathname.startsWith("/notifications")) return "Notifications";
  if (pathname.startsWith("/profile")) return "Profile";
  if (pathname.startsWith("/admin")) return "Admin";
  if (pathname.startsWith("/groups")) return "Groups";
  return "Dashboard";
}

export default function Layout() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeGroupId, setActiveGroupId] = useState("");

  useEffect(() => {
    setActiveGroupId(user?.id ? localStorage.getItem(activeGroupKey(user.id)) || "" : "");
  }, [user, location.pathname]);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  function handleLogout() {
    logout();
    navigate("/login");
  }

  const groupRoute = (suffix) =>
    activeGroupId ? `/groups/${activeGroupId}${suffix}` : "/groups";

  const navItems = [
    { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { to: "/groups", label: "Groups", icon: Users },
    { to: groupRoute("/expenses"), label: "Expenses", icon: Receipt },
    { to: groupRoute("/balances"), label: "Balances", icon: Scale },
    { to: groupRoute("/transactions"), label: "Transactions", icon: ArrowLeftRight },
    { to: "/insights", label: "AI Insights", icon: Sparkles },
    { to: "/chat", label: "AI Assistant", icon: MessageSquare },
    { to: "/notifications", label: "Notifications", icon: Bell },
    { to: "/profile", label: "Profile", icon: User },
  ];
  if (user?.is_admin) {
    navItems.push({ to: "/admin", label: "Admin", icon: Shield });
  }

  const title = getPageTitle(location.pathname);

  return (
    <div className="layout-shell">
      {mobileOpen && (
        <div className="sidebar-backdrop" onClick={() => setMobileOpen(false)} aria-hidden="true" />
      )}

      <aside
        className={`sidebar${collapsed ? " sidebar-collapsed" : ""}${mobileOpen ? " sidebar-open" : ""}`}
        aria-label="Main navigation"
      >
        <div className="sidebar-brand">
          <span className="sidebar-brand-logo">
            <Wallet aria-hidden="true" />
          </span>
          {!collapsed && <span className="sidebar-brand-name">PayCircle</span>}
          <button
            type="button"
            className="sidebar-toggle sidebar-collapse-toggle"
            onClick={() => setCollapsed((v) => !v)}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            style={{ marginLeft: "auto" }}
          >
            <ChevronLeft
              aria-hidden="true"
              style={{ transform: collapsed ? "rotate(180deg)" : "none", transition: "transform 0.3s" }}
            />
          </button>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <NavLink
              key={item.label}
              to={item.to}
              className={({ isActive }) => `sidebar-link${isActive ? " sidebar-link-active" : ""}`}
              title={collapsed ? item.label : undefined}
            >
              <item.icon aria-hidden="true" />
              {!collapsed && <span className="sidebar-label">{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-foot">
          <div className="sidebar-user">
            <Avatar name={user?.name} size="sm" />
            {!collapsed && (
              <div style={{ minWidth: 0 }}>
                <div className="sidebar-user-name">{user?.name}</div>
                <div className="sidebar-user-mail">{user?.email}</div>
              </div>
            )}
          </div>
          <button type="button" className="sidebar-link" onClick={handleLogout}>
            <LogOut aria-hidden="true" />
            {!collapsed && <span className="sidebar-label">Logout</span>}
          </button>
        </div>
      </aside>

      <div className="main-content">
        <header className="header">
          <button
            type="button"
            className="icon-btn header-menu-btn"
            onClick={() => setMobileOpen(true)}
            aria-label="Open navigation menu"
          >
            <Menu aria-hidden="true" />
          </button>
          <h1 className="header-title">{title}</h1>

          <div className="header-search">
            <GlobalSearch />
          </div>

          <div className="header-actions">
            <button
              type="button"
              className="icon-btn"
              onClick={toggleTheme}
              aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            >
              {theme === "dark" ? <Sun aria-hidden="true" /> : <Moon aria-hidden="true" />}
            </button>

            <NotificationBell />

            <Dropdown
              trigger={
                <button type="button" className="icon-btn" aria-label="Account menu">
                  <Avatar name={user?.name} size="sm" />
                </button>
              }
            >
              {({ close }) => (
                <>
                  <div className="dropdown-head">
                    Signed in as {user?.name || user?.email}
                  </div>
                  <button type="button" className="dropdown-item" onClick={() => { close(); navigate("/profile"); }}>
                    <User aria-hidden="true" /> Profile
                  </button>
                  {user?.is_admin && (
                    <button type="button" className="dropdown-item" onClick={() => { close(); navigate("/admin"); }}>
                      <Shield aria-hidden="true" /> Admin
                    </button>
                  )}
                  <div className="dropdown-divider" />
                  <button type="button" className="dropdown-item" onClick={() => { close(); handleLogout(); }}>
                    <LogOut aria-hidden="true" /> Logout
                  </button>
                </>
              )}
            </Dropdown>
          </div>
        </header>

        <main className="content">
          <div className="page route-fade">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
