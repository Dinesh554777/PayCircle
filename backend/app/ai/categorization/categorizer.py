"""AI expense categorization backed by Groq, with a keyword fallback."""
import json
import urllib.request
from dataclasses import dataclass

from app.core.config import get_settings

CATEGORIES = [
    "Food",
    "Transport",
    "Entertainment",
    "Shopping",
    "Utilities",
    "Healthcare",
    "Education",
    "Travel",
    "Rent",
    "Other",
]

GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"

SYSTEM_PROMPT = (
    "You categorize expense line items into exactly one of these categories: "
    + ", ".join(CATEGORIES)
    + ". "
    "Reply with JSON only in this shape: "
    '{"category": "<one category>", "confidence": <float between 0 and 1>}. '
    "Never add extra text."
)

KEYWORDS: list[tuple[list[str], str]] = [
    (["pizza", "food", "burger", "restaurant", "lunch", "dinner", "coffee", "tea", "cafe", "grocer", "swiggy", "zomato", "breakfast", "snack", "grocery", "beer", "wine", "bar"], "Food"),
    (["uber", "ola", "cab", "taxi", "metro", "fuel", "petrol", "diesel", "bus", "train", "parking", "toll", "auto", "gas"], "Transport"),
    (["movie", "ticket", "netflix", "concert", "game", "spotify", "amazon prime", "amusement", "theater", "theatre"], "Entertainment"),
    (["shopping", "amazon", "flipkart", "clothes", "shoes", "dress", "mall", "electronics"], "Shopping"),
    (["electricity", "water bill", "internet", "wifi", "mobile", "phone", "bill", "gas bill", "broadband", "recharge"], "Utilities"),
    (["doctor", "medicine", "pharmacy", "hospital", "clinic", "medical", "health", "dentist", "gym"], "Healthcare"),
    (["book", "course", "tuition", "school", "college", "exam", "fee", "class", "education", "workshop"], "Education"),
    (["flight", "hotel", "trip", "vacation", "travel", "airbnb", "tour", "visa", "resort"], "Travel"),
    (["rent", "lease", "deposit"], "Rent"),
]

FALLBACK_CONFIDENCE = 0.0


@dataclass
class CategorizationResult:
    category: str
    confidence: float | None
    ai_generated: bool
    method: str  # "groq" | "fallback"


class GroqCategorizer:
    """Categorize expense titles via the Groq API with offline fallback."""

    def __init__(self, api_key: str | None = None, model: str | None = None) -> None:
        settings = get_settings()
        self.api_key = (
            api_key if api_key is not None else settings.effective_ai_api_key
        )
        self.model = model or settings.AI_MODEL

    def categorize(self, text: str) -> CategorizationResult:
        text = (text or "").strip()
        if not text:
            return CategorizationResult("Other", None, False, "fallback")

        if self.api_key:
            try:
                result = self._categorize_with_ai(text)
                if result is not None:
                    return result
            except Exception:
                pass  # fall back to keywords

        return self._keyword_fallback(text)

    def _categorize_with_ai(self, text: str) -> CategorizationResult | None:
        payload = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": f"Categorize: {text}"},
            ],
            "temperature": 0,
            "response_format": {"type": "json_object"},
        }
        data = self._request(payload)
        content = data["choices"][0]["message"]["content"]
        parsed = json.loads(content)
        category = str(parsed["category"]).strip()
        if category not in CATEGORIES:
            return None
        try:
            confidence = float(parsed["confidence"])
        except (KeyError, TypeError, ValueError):
            confidence = None
        confidence = max(0.0, min(1.0, confidence)) if confidence is not None else None
        return CategorizationResult(category, confidence, True, "groq")

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
        with urllib.request.urlopen(request, timeout=8) as response:
            return json.loads(response.read().decode("utf-8"))

    def _keyword_fallback(self, text: str) -> CategorizationResult:
        lowered = text.lower()
        for keywords, category in KEYWORDS:
            if any(keyword in lowered for keyword in keywords):
                return CategorizationResult(
                    category, FALLBACK_CONFIDENCE, False, "fallback"
                )
        return CategorizationResult("Other", FALLBACK_CONFIDENCE, False, "fallback")


default_categorizer = GroqCategorizer()
