import { Wallet, Moon, Sun } from "lucide-react";
import { useTheme } from "../../context/ThemeContext";

export default function AuthShell({ title, subtitle, children }) {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="auth-shell">
      <button
        type="button"
        className="icon-btn auth-theme-toggle"
        onClick={toggleTheme}
        aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      >
        {theme === "dark" ? <Sun aria-hidden="true" /> : <Moon aria-hidden="true" />}
      </button>

      <div className="auth-card">
        <div className="auth-brand">
          <span className="auth-logo">
            <Wallet aria-hidden="true" />
          </span>
          <span className="auth-name">PayCircle</span>
        </div>
        <h1 className="auth-title">{title}</h1>
        {subtitle && <p className="auth-subtitle">{subtitle}</p>}
        {children}
      </div>
    </div>
  );
}
