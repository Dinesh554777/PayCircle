export default function Input({ label, name, type = "text", options, ...props }) {
  const baseStyle = {
    padding: "0.6rem",
    borderRadius: "0.375rem",
    border: "1px solid #d1d5db",
  };

  return (
    <label style={{ display: "flex", flexDirection: "column", gap: "0.25rem", marginBottom: "1rem" }}>
      <span>{label}</span>
      {type === "select" ? (
        <select name={name} style={baseStyle} {...props}>
          <option value="">Select...</option>
          {(options || []).map((option) => (
            <option key={option.id} value={option.id}>
              {option.name}
            </option>
          ))}
        </select>
      ) : (
        <input
          name={name}
          type={type}
          style={baseStyle}
          {...props}
        />
      )}
    </label>
  );
}
