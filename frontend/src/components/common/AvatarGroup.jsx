import Avatar from "./Avatar";

export default function AvatarGroup({ people = [], max = 4, size = "md" }) {
  if (people.length === 0) return null;
  const visible = people.slice(0, max);
  const overflow = people.length - visible.length;

  return (
    <div className="avatar-group" aria-label={`${people.length} members`}>
      {visible.map((person) => (
        <Avatar key={person.id ?? person.user_id} name={person.name} size={size} />
      ))}
      {overflow > 0 && (
        <span
          className={`avatar avatar-${size}`}
          style={{ background: "var(--border-strong)" }}
          aria-label={`${overflow} more`}
          title={`${overflow} more`}
        >
          +{overflow}
        </span>
      )}
    </div>
  );
}
