import { useState } from "react";
import { UserRound } from "lucide-react";
import Card from "../components/common/Card";
import Input from "../components/common/Input";
import Button from "../components/common/Button";
import Avatar from "../components/common/Avatar";
import Badge from "../components/common/Badge";
import { useToast } from "../components/common/Toast";
import { useAuth } from "../context/AuthContext";

export default function Profile() {
  const { user, updateProfile } = useAuth();
  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const toast = useToast();

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    const payload = { name, email };
    if (password) payload.password = password;
    setSubmitting(true);
    try {
      await updateProfile(payload);
      setPassword("");
      toast.success("Profile updated successfully");
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <div className="mb-4">
        <h2 className="mb-1">Profile</h2>
        <p className="text-secondary mb-0">Manage your account details.</p>
      </div>

      <div className="grid-2" style={{ alignItems: "start" }}>
        <Card>
          <div className="flex flex-column items-center gap-3 text-center" style={{ padding: "var(--space-4) 0" }}>
            <Avatar name={user?.name} avatar_url={user?.avatar_url} size="xl" />
            <div>
              <div className="text-lg text-bold">{user?.name}</div>
              <div className="text-secondary text-sm">{user?.email}</div>
            </div>
            <div className="flex gap-2 justify-center">
              {user?.is_admin && <Badge variant="primary">Administrator</Badge>}
              {user?.google_id && <Badge variant="success">Google Connected</Badge>}
            </div>
          </div>
        </Card>

        <Card title="Account details">
          <form onSubmit={handleSubmit}>
            <Input
              label="Full Name"
              name="name"
              icon={UserRound}
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
              label="New Password (leave blank to keep current)"
              name="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            {error && <p className="form-error">{error}</p>}
            <Button type="submit" loading={submitting}>
              Save Changes
            </Button>
          </form>
        </Card>
      </div>
    </>
  );
}
