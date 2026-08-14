import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Card from "../components/common/Card";
import Input from "../components/common/Input";
import Button from "../components/common/Button";

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  function handleSubmit(event) {
    event.preventDefault();
    // TODO: call POST /api/auth/login once implemented
    localStorage.setItem("paycircle_user", email);
    navigate("/dashboard");
  }

  return (
    <div style={{ maxWidth: 400, margin: "4rem auto" }}>
      <Card title="Login to PayCircle">
        <form onSubmit={handleSubmit}>
          <Input
            label="Email"
            name="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Input
            label="Password"
            name="password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <Button type="submit" style={{ width: "100%" }}>
            Login
          </Button>
        </form>
        <p style={{ textAlign: "center", marginBottom: 0 }}>
          No account? <Link to="/register">Register</Link>
        </p>
      </Card>
    </div>
  );
}
