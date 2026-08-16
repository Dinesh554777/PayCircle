import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { MessageSquare, Send, Bot } from "lucide-react";
import Button from "../components/common/Button";
import Input from "../components/common/Input";
import { apiRequest } from "../api/client";

const EXAMPLE_QUESTIONS = [
  "How much did I spend this month?",
  "What is my highest spending category?",
  "How should we settle up?",
  "Who should I pay?",
  "Show my recent expenses.",
  "What should I expect to spend next month?",
];

export default function Chat() {
  const [searchParams] = useSearchParams();
  const [messages, setMessages] = useState([
    {
      role: "ai",
      text: "Hi! I'm PayCircle's smart assistant. I can answer questions about your spending, top categories, recent expenses, who you owe, and how to settle up efficiently — using only your own data.",
    },
  ]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const bottomRef = useRef(null);
  const autoAsked = useRef(false);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  useEffect(() => {
    const question = searchParams.get("q");
    if (question && !autoAsked.current) {
      autoAsked.current = true;
      send(question);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function send(text) {
    const message = (text ?? input).trim();
    if (!message || sending) return;
    setInput("");
    setError("");
    setMessages((prev) => [...prev, { role: "user", text: message }]);
    setSending(true);
    apiRequest("/ai/agent", { method: "POST", body: { message }, auth: true })
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
    <>
      <div className="mb-4">
        <h2 className="mb-1">AI Assistant</h2>
        <p className="text-secondary mb-0">
          Ask about your expenses, balances, and settlement suggestions. Answers are based only on
          your own PayCircle activity.
        </p>
      </div>

      <div className="chat-card">
        <div className="chat-scroll">
          {messages.map((message, index) => {
            const isUser = message.role === "user";
            return (
              <div key={index} className={`chat-row${isUser ? " chat-row-user" : ""}`}>
                {!isUser && (
                  <span className="chat-avatar">
                    <Bot aria-hidden="true" />
                  </span>
                )}
                <div className={`chat-bubble${isUser ? " chat-bubble-user" : " chat-bubble-ai"}`}>
                  {message.text}
                </div>
              </div>
            );
          })}
          {sending && (
            <div className="chat-row">
              <span className="chat-avatar">
                <Bot aria-hidden="true" />
              </span>
              <div className="chat-bubble chat-bubble-ai">
                <span className="typing-dot" aria-hidden="true" />
                <span className="typing-dot" aria-hidden="true" />
                <span className="typing-dot" aria-hidden="true" />
                <span className="sr-only">Thinking…</span>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {error && <p className="form-error" style={{ padding: "0 var(--space-4)" }}>{error}</p>}

        <form onSubmit={handleSubmit} className="chat-input-row">
          <div style={{ flex: 1 }}>
            <Input
              name="chat"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about your expenses..."
              aria-label="Ask about your expenses"
              icon={MessageSquare}
            />
          </div>
          <Button type="submit" loading={sending} disabled={!input.trim()} icon={Send}>
            Send
          </Button>
        </form>
      </div>

      <div className="mt-4">
        <div className="text-sm text-secondary mb-2">Try asking:</div>
        <div className="flex gap-2 wrap">
          {EXAMPLE_QUESTIONS.map((question) => (
            <button
              key={question}
              type="button"
              className="chip"
              onClick={() => send(question)}
              disabled={sending}
              aria-label={`Ask: ${question}`}
            >
              {question}
            </button>
          ))}
        </div>
      </div>

      <p className="text-muted text-xs mt-4">
        Chat answers are generated from your expense history and may be imperfect. Not financial
        advice.
      </p>
    </>
  );
}
