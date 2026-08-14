export default function Input({ label, name, type = "text", ...props }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: "0.25rem", marginBottom: "1rem" }}>
      <span>{label}</span>
      <input
        name={name}
        type={type}
        style={{
          padding: "0.6rem",
          borderRadius: "0.375rem",
          border: "1px solid #d1d5db",
        }}
        {...props}
      />
    </label>
  );
}
