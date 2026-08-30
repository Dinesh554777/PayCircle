import { useState } from "react";
import { UserRound, AtSign, Volume2, VolumeOff } from "lucide-react";
import Card from "../components/common/Card";
import Input from "../components/common/Input";
import Button from "../components/common/Button";
import Avatar from "../components/common/Avatar";
import Badge from "../components/common/Badge";
import { useToast } from "../components/common/Toast";
import { useAuth } from "../context/AuthContext";
import { useNotificationSound } from "../hooks/useNotificationSound";
import { playTestSound } from "../utils/notificationSound";

export default function Profile() {
  const { user, updateProfile } = useAuth();
  const [name, setName] = useState(user?.name || "");
  const [username, setUsername] = useState(user?.username || "");
  const [email, setEmail] = useState(user?.email || "");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const toast = useToast();
  const { soundOn, toggleSound } = useNotificationSound(0);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    if (!/^[a-zA-Z0-9_.-]+$/.test(username)) {
      setError("Username can only contain letters, numbers, dots, underscores and dashes");
      return;
    }
    const payload = { name, username, email };
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
              <div className="text-secondary text-sm">@{user?.username}</div>
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
              label="Username"
              name="username"
              icon={AtSign}
              required
              value={username}
              hint="How friends find and invite you to a group."
              onChange={(e) => setUsername(e.target.value)}
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

      <Card title="Notification Sound" className="mt-4" style={{ maxWidth: 480 }}>
        <div className="flex justify-between items-center gap-3">
          <div style={{ flex: 1 }}>
            <div className="text-semibold text-sm">Play sound for new notifications</div>
            <div className="text-muted text-sm mt-1">
              {soundOn
                ? "You will hear a chime when a new notification arrives."
                : "Notifications will appear silently."}
            </div>
          </div>
          <button
            type="button"
            className={`btn btn-sm ${soundOn ? "btn-primary" : "btn-secondary"}`}
            onClick={toggleSound}
          >
            {soundOn ? <Volume2 aria-hidden="true" /> : <VolumeOff aria-hidden="true" />}
            {soundOn ? " ON" : " OFF"}
          </button>
        </div>
        <div className="mt-3">
          <Button variant="ghost" size="sm" onClick={playTestSound}>
            <Volume2 aria-hidden="true" /> Test Notification Sound
          </Button>
        </div>
      </Card>
    </>
  );
}
