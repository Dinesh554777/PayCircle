export default function Button({ children, type = "button", variant = "primary", ...props }) {
  const styles = {
    primary: { background: "#4f46e5", color: "#fff" },
    secondary: { background: "#e5e7eb", color: "#1f2937" },
  };

  return (
    <button
      type={type}
      style={{
        padding: "0.6rem 1rem",
        border: "none",
        borderRadius: "0.375rem",
        cursor: "pointer",
        fontWeight: 600,
        ...styles[variant],
      }}
      {...props}
    >
      {children}
    </button>
  );
}
