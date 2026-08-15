import { useEffect, useRef, useState } from "react";
import Button from "../components/common/Button";
import { apiRequest } from "../api/client";

const EXAMPLE_QUESTIONS = [
  "How much did I spend this month?",
  "What is my highest spending category?",
  "Who should I pay?",
  "Show my recent expenses.",
  "How can I reduce my spending?",
  "What should I expect to spend next month?",
];

export default function Chat() {
  const [messages, setMessages] = useState([
    {
      role: "ai",
      text: "Hi! I can answer questions about your PayCircle expenses, such as your spending, top categories, recent expenses, who to pay, and a next-month estimate.",
    },
  ]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  function send(text) {
    const message = (text ?? input).trim();
    if (!message || sending) return;
    setInput("");
    setError("");
    setMessages((prev) => [...prev, { role: "user", text: message }]);
    setSending(true);
    apiRequest("/ai/chat", { method: "POST", body: { message }, auth: true })
      .then((data) => {
        setMessages((prev) => [...prev, { role: "ai", text: data.answer }]);
      })
      .catch((err) => setError(err.message))
      .finally(() => setSending(false));
  }

  function handleSubmit(event) {
    event.preventDefault();
    send();
  }

  return (
    <div style={{ maxWidth: 720 }}>
      <h1 style={{ marginBottom: "0.25rem" }}>AI Chat</h1>
      <p style={{ color: "#6b7280", marginTop: 0 }}>
        Ask about your expense data. Answers are based only on your own PayCircle
        activity.
      </p>

      <div
        style={{
          background: "#fff",
          border: "1px solid #e5e7eb",
          borderRadius: "0.5rem",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div
          style={{
            flex: 1,
            padding: "1.25rem",
            overflowY: "auto",
            maxHeight: 480,
            display: "flex",
            flexDirection: "column",
            gap: "0.75rem",
          }}
        >
          {messages.map((message, index) => (
            <div
              key={index}
              style={{
                alignSelf: message.role === "user" ? "flex-end" : "flex-start",
                maxWidth: "80%",
                background: message.role === "user" ? "#4f46e5" : "#f3f4f6",
                color: message.role === "user" ? "#fff" : "#1f2937",
                padding: "0.6rem 0.9rem",
                borderRadius: "0.75rem",
                whiteSpace: "pre-wrap",
              }}
            >
              {message.text}
            </div>
          ))}
          {sending && (
            <div
              style={{
                alignSelf: "flex-start",
                background: "#f3f4f6",
                padding: "0.6rem 0.9rem",
                borderRadius: "0.75rem",
                color: "#6b7280",
              }}
            >
              Thinking...
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {error && (
          <p style={{ color: "#dc2626", padding: "0 1.25rem", margin: "0 0 0.5rem" }}>
            {error}
          </p>
        )}

        <form
          onSubmit={handleSubmit}
          style={{
            display: "flex",
            gap: "0.5rem",
            padding: "1rem",
            borderTop: "1px solid #e5e7eb",
          }}
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about your expenses..."
            style={{
              flex: 1,
              padding: "0.6rem",
              borderRadius: "0.375rem",
              border: "1px solid #d1d5db",
            }}
          />
          <Button type="submit" disabled={sending}>
            Send
          </Button>
        </form>
      </div>

      <div style={{ marginTop: "1rem" }}>
        <div style={{ fontSize: "0.875rem", color: "#6b7280", marginBottom: "0.5rem" }}>
          Try asking:
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
          {EXAMPLE_QUESTIONS.map((question) => (
            <button
              key={question}
              onClick={() => send(question)}
              disabled={sending}
              style={{
                background: "#fff",
                border: "1px solid #d1d5db",
                borderRadius: "999px",
                padding: "0.4rem 0.8rem",
                fontSize: "0.85rem",
                cursor: "pointer",
                color: "#1f2937",
              }}
            >
              {question}
            </button>
          ))}
        </div>
      </div>

      <p style={{ fontSize: "0.75rem", color: "#9ca3af", marginTop: "1rem" }}>
        Chat answers are generated from your expense history and may be imperfect.
        Not financial advice.
      </p>
    </div>
  );
}
