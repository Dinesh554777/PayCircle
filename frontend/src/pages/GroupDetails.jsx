import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import Card from "../components/common/Card";
import Input from "../components/common/Input";
import Button from "../components/common/Button";
import { apiRequest } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { formatDate } from "../utils/format";

export default function GroupDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [group, setGroup] = useState(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [email, setEmail] = useState("");
  const [adding, setAdding] = useState(false);

  async function loadGroup() {
    try {
      const data = await apiRequest(`/groups/${id}`, { auth: true });
      setGroup(data);
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    loadGroup();
  }, [id]);

  async function handleAddMember(event) {
    event.preventDefault();
    setError("");
    setNotice("");
    setAdding(true);
    try {
      await apiRequest(`/groups/${id}/members`, {
        method: "POST",
        body: { email },
        auth: true,
      });
      setEmail("");
      setNotice("Member added");
      await loadGroup();
    } catch (err) {
      setError(err.message);
    } finally {
      setAdding(false);
    }
  }

  async function handleRemoveMember(userId, name) {
    setError("");
    setNotice("");
    if (!window.confirm(`Remove ${name} from this group?`)) return;
    try {
      await apiRequest(`/groups/${id}/members/${userId}`, {
        method: "DELETE",
        auth: true,
      });
      await loadGroup();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleLeave() {
    setError("");
    if (!window.confirm("Leave this group? You will lose access to it.")) return;
    try {
      await apiRequest(`/groups/${id}/leave`, { method: "DELETE", auth: true });
      navigate("/groups");
    } catch (err) {
      setError(err.message);
    }
  }

  if (error && !group) {
    return (
      <div>
        <h1>Group</h1>
        <p style={{ color: "#dc2626" }}>{error}</p>
        <Link to="/groups">Back to groups</Link>
      </div>
    );
  }

  if (!group) {
    return <p>Loading...</p>;
  }

  const canRemove = (member) =>
    member.user_id !== group.created_by && member.user_id !== user?.id;

  return (
    <div style={{ maxWidth: 640 }}>
      <Link to="/groups">&larr; Back to groups</Link>
      <h1>{group.name}</h1>
      <p>{group.description || "No description"}</p>
      <p style={{ color: "#6b7280", fontSize: "0.875rem" }}>
        Created by {group.creator?.name} on {formatDate(group.created_at)}
      </p>

      <div
        style={{
          display: "flex",
          gap: "0.5rem",
          flexWrap: "wrap",
          marginBottom: "1rem",
        }}
      >
        <Link to={`/groups/${id}/expenses`}>
          <Button>Expenses</Button>
        </Link>
        <Link to={`/groups/${id}/balances`}>
          <Button>Balances</Button>
        </Link>
        <Link to={`/groups/${id}/transactions`}>
          <Button>Transactions</Button>
        </Link>
        <Button variant="secondary" onClick={handleLeave}>
          Leave Group
        </Button>
      </div>

      {notice && (
        <p style={{ color: "#15803d", fontSize: "0.875rem" }}>{notice}</p>
      )}
      {error && (
        <p style={{ color: "#dc2626", fontSize: "0.875rem" }}>{error}</p>
      )}

      <Card title={`Members (${group.members.length})`}>
        <form onSubmit={handleAddMember}>
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "flex-end" }}>
            <div style={{ flex: 1 }}>
              <Input
                label="Add member by email"
                name="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <Button type="submit" disabled={adding} style={{ marginBottom: "1rem" }}>
              {adding ? "Adding..." : "Add"}
            </Button>
          </div>
        </form>

        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {group.members.map((member) => (
            <li
              key={member.id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "0.5rem 0",
                borderBottom: "1px solid #e5e7eb",
              }}
            >
              <div>
                <strong>{member.user?.name}</strong>{" "}
                {member.user_id === group.created_by && (
                  <span
                    style={{
                      fontSize: "0.75rem",
                      background: "#eef2ff",
                      color: "#4f46e5",
                      padding: "0.1rem 0.4rem",
                      borderRadius: "0.25rem",
                    }}
                  >
                    creator
                  </span>
                )}
                <div style={{ color: "#6b7280", fontSize: "0.875rem" }}>
                  {member.user?.email} &middot; joined {formatDate(member.joined_at)}
                </div>
              </div>
              {canRemove(member) && (
                <button
                  type="button"
                  onClick={() => handleRemoveMember(member.user_id, member.user?.name)}
                  style={{
                    border: "none",
                    background: "none",
                    color: "#dc2626",
                    cursor: "pointer",
                    fontSize: "0.875rem",
                  }}
                >
                  Remove
                </button>
              )}
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
