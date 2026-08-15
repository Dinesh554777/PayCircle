"""AI chatbot module (Groq-backed with local rule-based fallback)."""

from app.ai.chatbot.chatbot import (
    EXPENSE_KEYWORDS,
    NO_DATA_MESSAGE,
    SYSTEM_PROMPT,
    UNRELATED_MESSAGE,
    Chatbot,
    default_chatbot,
)

__all__ = [
    "EXPENSE_KEYWORDS",
    "NO_DATA_MESSAGE",
    "SYSTEM_PROMPT",
    "UNRELATED_MESSAGE",
    "Chatbot",
    "default_chatbot",
]
