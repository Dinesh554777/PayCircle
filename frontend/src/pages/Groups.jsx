import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Card from "../components/common/Card";
import Input from "../components/common/Input";
import Button from "../components/common/Button";
import { apiRequest } from "../api/client";

function formatDate(value) {
  return value ? new Date(value).toLocaleDateString() : "";
}

export default function Groups() {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);

  async function loadGroups() {
    try {
      const data = await apiRequest("/groups", { auth: true });
      setGroups(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadGroups();
  }, []);

  async function handleCreate(event) {
    event.preventDefault();
    setError("");
    setCreating(true);
    try {
      await apiRequest("/groups", {
        method: "POST",
        body: { name, description: description || null },
        auth: true,
      });
      setName("");
      setDescription("");
      setShowCreate(false);
      await loadGroups();
    } catch (err) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  }

  return (
    <div style={{ maxWidth: 640 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <h1>Groups</h1>
        <Button onClick={() => setShowCreate((v) => !v)}>
          {showCreate ? "Cancel" : "Create Group"}
        </Button>
      </div>

      {showCreate && (
        <Card title="Create a new group">
          <form onSubmit={handleCreate}>
            <Input
              label="Group Name"
              name="name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <Input
              label="Description (optional)"
              name="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
            {error && (
              <p style={{ color: "#dc2626", fontSize: "0.875rem", marginBottom: "1rem" }}>
                {error}
              </p>
            )}
            <Button type="submit" disabled={creating}>
              {creating ? "Creating..." : "Create"}
            </Button>
          </form>
        </Card>
      )}

      {loading ? (
        <p>Loading...</p>
      ) : groups.length === 0 ? (
        <Card title="No groups yet">
          <p>Create a group to start tracking shared expenses with friends.</p>
        </Card>
      ) : (
        groups.map((group) => (
          <Card key={group.id} title={group.name}>
            <p>{group.description || "No description"}</p>
            <p style={{ color: "#6b7280", fontSize: "0.875rem" }}>
              Created {formatDate(group.created_at)}
            </p>
            <Link to={`/groups/${group.id}`}>View group</Link>
          </Card>
        ))
      )}
    </div>
  );
}
