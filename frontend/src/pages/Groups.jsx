import { useEffect, useState } from "react";
import { Plus, Users, UserPlus } from "lucide-react";
import Button from "../components/common/Button";
import Input from "../components/common/Input";
import Modal from "../components/common/Modal";
import SearchBar from "../components/common/SearchBar";
import EmptyState from "../components/common/EmptyState";
import ErrorState from "../components/common/ErrorState";
import Skeleton from "../components/common/Skeleton";
import { useToast } from "../components/common/Toast";
import GroupCard from "../components/groups/GroupCard";
import { apiRequest } from "../api/client";

export default function Groups() {
  const [groups, setGroups] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [loadError, setLoadError] = useState("");
  const [creating, setCreating] = useState(false);
  const toast = useToast();

  async function loadGroups() {
    try {
      const data = await apiRequest("/groups", { auth: true });
      setGroups(data);
      setFiltered(data);
      setLoadError("");
    } catch (err) {
      setLoadError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadGroups();
  }, []);

  useEffect(() => {
    const q = query.trim().toLowerCase();
    setFiltered(
      q
        ? groups.filter(
            (g) =>
              g.name.toLowerCase().includes(q) ||
              (g.description || "").toLowerCase().includes(q)
          )
        : groups
    );
  }, [query, groups]);

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
      toast.success("Group created");
      await loadGroups();
    } catch (err) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  }

  return (
    <>
      <div className="flex justify-between items-center gap-3 wrap mb-4">
        <div>
          <h2 className="mb-1">Groups</h2>
          <p className="text-secondary mb-0">
            Manage groups and split shared expenses with friends.
          </p>
        </div>
        <Button variant="primary" onClick={() => setShowCreate(true)}>
          <Plus aria-hidden="true" /> New Group
        </Button>
      </div>

      {groups.length > 0 && (
        <SearchBar
          value={query}
          onChange={setQuery}
          placeholder="Search groups by name or description…"
          className="mb-4"
        />
      )}

      {loading ? (
        <div className="grid-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} type="card" style={{ height: 160 }} />
          ))}
        </div>
      ) : loadError ? (
        <ErrorState title="Couldn't load groups" message={loadError} onRetry={loadGroups} />
      ) : groups.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No groups yet"
          message="Create a group to start tracking shared expenses with friends."
          action={
            <Button variant="primary" onClick={() => setShowCreate(true)}>
              <UserPlus aria-hidden="true" /> Create your first group
            </Button>
          }
        />
      ) : filtered.length === 0 ? (
        <EmptyState title="No matches" message={`No groups match "${query}".`} />
      ) : (
        <div className="grid-3">
          {filtered.map((group) => (
            <GroupCard key={group.id} group={group} />
          ))}
        </div>
      )}

      <Modal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        title="Create a new group"
        icon={Users}
        labelledBy="create-group-title"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowCreate(false)} disabled={creating}>
              Cancel
            </Button>
            <Button type="submit" form="create-group-form" loading={creating}>
              Create
            </Button>
          </>
        }
      >
        <form id="create-group-form" onSubmit={handleCreate}>
          <Input
            label="Group Name"
            name="name"
            required
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <Input
            label="Description (optional)"
            name="description"
            textarea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          {error && <p className="form-error">{error}</p>}
        </form>
      </Modal>
    </>
  );
}
