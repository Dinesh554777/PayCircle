import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Card from "../components/common/Card";
import Input from "../components/common/Input";
import Button from "../components/common/Button";

export default function Register() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  function handleSubmit(event) {
    event.preventDefault();
    // TODO: call POST /api/auth/register once implemented
    localStorage.setItem("paycircle_user", email);
    navigate("/dashboard");
  }

  return (
    <div style={{ maxWidth: 400, margin: "4rem auto" }}>
      <Card title="Create your account">
        <form onSubmit={handleSubmit}>
          <Input
            label="Full Name"
            name="name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
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
            Register
          </Button>
        </form>
        <p style={{ textAlign: "center", marginBottom: 0 }}>
          Already have an account? <Link to="/login">Login</Link>
        </p>
      </Card>
    </div>
  );
}
