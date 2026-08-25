"""AI chatbot backed by Groq, with a local rule-based fallback."""
import json
import urllib.request

from app.core.config import get_settings

GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"

SYSTEM_PROMPT = (
    "You are PayCircle's expense assistant. You help a user understand their own "
    "expense data. You receive a CONTEXT section with the user's own expense data "
    "and a QUESTION.\n"
    "Answer concisely in 1-4 sentences using ONLY the provided context. Never invent "
    "expenses, amounts, categories, dates, or people that are not in the context. "
    "If the context does not contain enough information to answer, say so.\n"
    "Do not reveal other users' private spending information. Group member names may "
    "be mentioned only when they relate to the user's own balances.\n"
    "Do not give financial investment advice.\n"
    'Reply with JSON only in this shape: {"answer": "<your answer>"}. '
    "Never add extra text."
)

UNRELATED_MESSAGE = (
    "I'm here to help with your PayCircle expenses. Try asking about your monthly "
    "spending, highest spending category, recent expenses, who to pay, or a "
    "next-month spending estimate."
)

NO_DATA_MESSAGE = (
    "You don't have any expenses yet, so there isn't anything to analyze. "
    "Add an expense in one of your groups and I'll be able to help."
)

EXPENSE_KEYWORDS = (
    "spend", "spent", "spending", "expense", "expenses", "cost", "costs",
    "category", "categories", "food", "transport", "travel", "rent", "bill",
    "bills", "owe", "owed", "owes", "pay", "paid", "payment", "balance",
    "balances", "group", "groups", "recent", "money", "budget", "month",
    "monthly", "predict", "prediction", "estimate", "largest", "average",
    "shopping", "total", "settlement", "reimburs",
)


class Chatbot:
    """Answer questions about a user's expense data via Groq with fallback."""

    def __init__(self, api_key: str | None = None, model: str | None = None) -> None:
        settings = get_settings()
        self.api_key = (
            api_key if api_key is not None else settings.effective_ai_api_key
        )
        self.model = model or settings.AI_MODEL

    def answer(self, question: str, context: dict) -> str:
        if self.api_key:
            try:
                result = self._answer_with_ai(question, context)
                if result:
                    return result
            except Exception:
                pass  # fall back to local answers
        return self._local_answer(question, context)

    def _answer_with_ai(self, question: str, context: dict) -> str | None:
        payload = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": SYSTEM_PROMPT},
                {
                    "role": "user",
                    "content": (
                        f"CONTEXT:\n{self._context_to_text(context)}\n\n"
                        f"QUESTION: {question}"
                    ),
                },
            ],
            "temperature": 0.2,
            "response_format": {"type": "json_object"},
        }
        data = self._request(payload)
        content = data["choices"][0]["message"]["content"]
        parsed = json.loads(content)
        answer = str(parsed.get("answer", "")).strip()
        return answer or None

    def _request(self, payload: dict) -> dict:
        request = urllib.request.Request(
            GROQ_URL,
            data=json.dumps(payload).encode("utf-8"),
            headers={
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json",
                "User-Agent": "PayCircle/0.1 (FastAPI backend)",
            },
            method="POST",
        )
        with urllib.request.urlopen(request, timeout=10) as response:
            return json.loads(response.read().decode("utf-8"))

    @staticmethod
    def _context_to_text(context: dict) -> str:
        lines = [context.get("summary", "")]
        top = context.get("top_category")
        if top:
            lines.append(
                f"Top category: {top['category']} ({top['share']:.0f}% of spending, "
                f"₹{top['amount']:,.2f})."
            )
        categories = context.get("category_breakdown") or []
        if categories:
            lines.append(
                "Category breakdown: "
                + ", ".join(
                    f"{item['category']} ₹{item['amount']:,.2f} ({item['count']} "
                    f"expense{'s' if item['count'] != 1 else ''})"
                    for item in categories
                )
            )
        months = context.get("monthly_totals") or []
        if months:
            lines.append(
                "Monthly totals: "
                + ", ".join(
                    f"{item['month']} ₹{item['amount']:,.2f}" for item in months
                )
            )
        prediction = context.get("prediction")
        if prediction:
            lines.append(
                f"Next-month estimate: ₹{prediction['amount']:,.2f} "
                f"(period {prediction['period']})."
            )
        recent = context.get("recent_expenses") or []
        if recent:
            lines.append("Recent expenses:")
            for expense in recent:
                lines.append(
                    f"- {expense['title']} ₹{expense['amount']:,.2f} "
                    f"({expense['category']}, {expense['date']}, group "
                    f"{expense['group']}, paid by {expense['paid_by']})"
                )
        owes = context.get("balances", {}).get("you_owe") or []
        if owes:
            lines.append("You owe:")
            for item in owes:
                lines.append(
                    f"- {item['to']} ₹{item['amount']:,.2f} in group {item['group']}"
                )
        owed_to = context.get("balances", {}).get("you_are_owed") or []
        if owed_to:
            lines.append("You are owed:")
            for item in owed_to:
                lines.append(
                    f"- {item['from']} ₹{item['amount']:,.2f} in group {item['group']}"
                )
        suggestions = context.get("suggestions") or []
        if suggestions:
            lines.append("Suggestions: " + " ".join(suggestions))
        return "\n".join(line for line in lines if line)

    def _local_answer(self, question: str, context: dict) -> str:
        lowered = question.lower()

        if any(word in lowered for word in ("who", "should i pay", "how much do i owe")):
            return self._answer_owed(context)
        if any(word in lowered for word in ("who owes", "how much am i owed", "to receive")):
            return self._answer_owed_to(context)
        if any(word in lowered for word in ("this month", "this month's", "this month spending")):
            return self._answer_this_month(context)
        if any(word in lowered for word in ("highest spending", "top category", "most of my money", "biggest category")):
            return self._answer_top_category(context)
        if "average" in lowered:
            return self._answer_average(context)
        if any(word in lowered for word in ("recent expense", "recently", "show my expenses", "last expense")):
            return self._answer_recent(context)
        if any(word in lowered for word in ("reduce", "save", "cut", "budget", "less")):
            return self._answer_suggestions(context)
        if any(word in lowered for word in ("predict", "prediction", "estimate", "next month")):
            return self._answer_prediction(context)

        return (
            "I couldn't find that in your data. Try asking about your monthly "
            "spending, highest spending category, recent expenses, who to pay, or "
            "a next-month spending estimate."
        )

    def _answer_owed(self, context: dict) -> str:
        owes = context.get("balances", {}).get("you_owe") or []
        if not owes:
            return "You don't owe anyone right now."
        parts = [
            f"You owe {item['to']} ₹{item['amount']:,.2f} in {item['group']}"
            for item in owes
        ]
        return " ".join(parts) + "."

    def _answer_owed_to(self, context: dict) -> str:
        owed_to = context.get("balances", {}).get("you_are_owed") or []
        if not owed_to:
            return "Nobody owes you right now."
        parts = [
            f"{item['from']} owes you ₹{item['amount']:,.2f} in {item['group']}"
            for item in owed_to
        ]
        return " ".join(parts) + "."

    def _answer_this_month(self, context: dict) -> str:
        current = context.get("current_month")
        if not current:
            return "You have no recorded spending in the current month."
        return (
            f"In {current['month']} you spent ₹{current['amount']:,.2f} "
            f"across {current['count']} expense{'s' if current['count'] != 1 else ''}."
        )

    def _answer_top_category(self, context: dict) -> str:
        top = context.get("top_category")
        if not top:
            return "You don't have any category data yet."
        return (
            f"Your highest spending category is {top['category']} "
            f"(₹{top['amount']:,.2f}, {top['share']:.0f}% of spending)."
        )

    def _answer_average(self, context: dict) -> str:
        average = context.get("average_expense")
        if average is None:
            return "You don't have any expense data yet."
        return f"Your average expense is ₹{average:,.2f}."

    def _answer_recent(self, context: dict) -> str:
        recent = context.get("recent_expenses") or []
        if not recent:
            return "You don't have any recorded expenses yet."
        lines = [f"{item['title']} ₹{item['amount']:,.2f} ({item['category']}, {item['date']})" for item in recent]
        return "Your recent expenses: " + "; ".join(lines) + "."

    def _answer_suggestions(self, context: dict) -> str:
        suggestions = context.get("suggestions") or []
        if not suggestions:
            return "Keep tracking your expenses and I'll have suggestions for you."
        return " ".join(suggestions)

    def _answer_prediction(self, context: dict) -> str:
        prediction = context.get("prediction")
        if not prediction:
            return "Not enough data for prediction."
        return (
            f"Based on your recent months, you might spend around "
            f"₹{prediction['amount']:,.2f} in {prediction['period']}. "
            "This is only a rough estimate."
        )


default_chatbot = Chatbot()
