import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { UserRound, Mail, Lock } from "lucide-react";
import Input from "../components/common/Input";
import Button from "../components/common/Button";
import AuthShell from "../components/auth/AuthShell";
import { useAuth } from "../context/AuthContext";

import GoogleAuthButton from "../components/auth/GoogleAuthButton";

export default function Register() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    setSubmitting(true);
    try {
      await register(name, email, password);
      navigate("/dashboard");
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  }

  return (
    <AuthShell title="Create your account" subtitle="Start splitting expenses in seconds.">
      <div className="flex flex-column gap-3 mb-4">
        <GoogleAuthButton />
      </div>

      <div className="auth-divider">
        <span>or continue with email</span>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-column gap-3">
        <Input
          label="Full Name"
          name="name"
          icon={UserRound}
          required
          autoComplete="name"
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <Input
          label="Email"
          name="email"
          type="email"
          icon={Mail}
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Input
          label="Password"
          name="password"
          type="password"
          icon={Lock}
          required
          autoComplete="new-password"
          passwordToggle
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <Input
          label="Confirm Password"
          name="confirmPassword"
          type="password"
          icon={Lock}
          required
          autoComplete="new-password"
          passwordToggle
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
        />
        {error && <p className="form-error mb-0">{error}</p>}
        <Button type="submit" loading={submitting} className="w-full" size="lg">
          Register
        </Button>
      </form>
      <p className="auth-foot">
        Already have an account?{" "}
        <Link to="/login" className="link">
          Login
        </Link>
      </p>
    </AuthShell>
  );
}
