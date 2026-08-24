import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Mail, Lock } from "lucide-react";
import Input from "../components/common/Input";
import Button from "../components/common/Button";
import AuthShell from "../components/auth/AuthShell";
import { useAuth } from "../context/AuthContext";

import GoogleAuthButton from "../components/auth/GoogleAuthButton";

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await login(email, password);
      navigate("/dashboard");
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  }

  return (
    <AuthShell title="Welcome back" subtitle="Log in to manage your shared expenses.">
      <div className="flex flex-column gap-3 mb-4">
        <GoogleAuthButton />
      </div>
      
      <div className="auth-divider">
        <span>or continue with email</span>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-column gap-3">
        <Input
          label="Email"
          name="email"
          type="email"
          icon={Mail}
          required
          autoComplete="email"
          autoFocus
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Input
          label="Password"
          name="password"
          type="password"
          icon={Lock}
          required
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error && <p className="form-error mb-0">{error}</p>}
        <Button type="submit" loading={submitting} className="w-full" size="lg">
          Login
        </Button>
      </form>
      <p className="auth-foot">
        No account?{" "}
        <Link to="/register" className="link">
          Register
        </Link>
      </p>
    </AuthShell>
  );
}
