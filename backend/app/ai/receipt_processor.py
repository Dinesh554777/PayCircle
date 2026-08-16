"""Receipt-to-Expense assistant.

Turns the text of a receipt (as pasted/typed by the user or produced by a
phone OCR app) into a structured expense draft: merchant, amount, date and
category. Extraction is deterministic (regex + keyword matching) so it works
with no API keys and is fully testable.

Nothing is saved automatically — the UI always shows a review step and the
user must confirm before the expense is created.
"""
from __future__ import annotations

import re
from dataclasses import dataclass, field
from datetime import datetime, timezone
from decimal import Decimal, InvalidOperation

from app.ai.categorization.categorizer import CATEGORIES, KEYWORDS

NOISE_WORDS = {
    "total", "subtotal", "grand", "invoice", "receipt", "bill", "bill no",
    "amount", "pay", "paid", "cash", "card", "upi", "gst", "tax", "cgst",
    "sgst", "igst", "change", "due", "balance", "thank", "please", "phone",
    "tel", "order", "table", "server", "no", "item", "qty", "rate", "status",
    "customer", "copy", "online", "payment",
}
MONTH_NAMES = {
    "jan": 1, "feb": 2, "mar": 3, "apr": 4, "may": 5, "jun": 6,
    "jul": 7, "aug": 8, "sep": 9, "oct": 10, "nov": 11, "dec": 12,
}

AMOUNT_PATTERNS = [
    re.compile(r"(?:₹|rs\.?|inr)\s?([0-9][0-9,]*\.\d{2})", re.IGNORECASE),
    re.compile(r"(?:₹|rs\.?|inr)\s?([0-9][0-9,]*)", re.IGNORECASE),
    re.compile(r"([0-9][0-9,]*\.\d{2})"),
]
TOTAL_HINTS = re.compile(r"\b(total|grand total|amount due|amount paid|net)\b", re.IGNORECASE)
DATE_PATTERNS = [
    re.compile(r"\b(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})\b"),
    re.compile(r"\b(\d{1,2})\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+(\d{4})\b", re.IGNORECASE),
    re.compile(r"\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+(\d{1,2}),?\s+(\d{4})\b", re.IGNORECASE),
]
NUMBER_LINE = re.compile(r"\d")


class ReceiptExtractionError(Exception):
    """Raised when an amount cannot be reliably read from the receipt."""


@dataclass
class ReceiptInfo:
    merchant: str | None = None
    amount: Decimal | None = None
    date: datetime | None = None
    category: str | None = None
    confidence: float = 0.0
    notes: list[str] = field(default_factory=list)
    raw_text: str | None = None


def _to_decimal(text: str) -> Decimal:
    return Decimal(text.replace(",", ""))


def _extract_amount(lines: list[str]) -> tuple[Decimal | None, list[str]]:
    candidates: list[tuple[Decimal, int]] = []  # (amount, line_index)
    for index, line in enumerate(lines):
        for pattern in AMOUNT_PATTERNS:
            match = pattern.search(line)
            if match:
                try:
                    candidates.append((_to_decimal(match.group(1)), index))
                except (InvalidOperation, ValueError):
                    continue
                break
    if not candidates:
        return None, []
    total_hits = [
        (amount, index)
        for amount, index in candidates
        if TOTAL_HINTS.search(lines[index])
    ]
    if total_hits:
        return max(total_hits, key=lambda pair: pair[0])[0], [
            "Amount matched a TOTAL line."
        ]
    return max(candidates, key=lambda pair: pair[0])[0], [
        "No TOTAL line found; used the largest amount on the receipt."
    ]


def _extract_date(lines: list[str]) -> datetime | None:
    for line in lines:
        for pattern in DATE_PATTERNS:
            match = pattern.search(line)
            if not match:
                continue
            try:
                if len(match.groups()) == 3 and match.group(3).isdigit():
                    first, second, third = match.group(1, 2, 3)
                    if first.isdigit() and second.isdigit():
                        year = int(third) if int(third) > 1000 else int(third) + 2000
                        # Prefer dd/mm/yyyy unless that is impossible.
                        if int(first) > 12 and int(second) <= 12:
                            day, month = int(first), int(second)
                        else:
                            month, day = int(first), int(second)
                        return datetime(year, month, day, tzinfo=timezone.utc)
                    month = MONTH_NAMES[match.group(2).lower()]
                    return datetime(int(match.group(3)), month, int(match.group(1)), tzinfo=timezone.utc)
                # Month-name first (e.g. "Jan 15, 2026").
                month = MONTH_NAMES[match.group(1).lower()]
                return datetime(int(match.group(3)), month, int(match.group(2)), tzinfo=timezone.utc)
            except ValueError:
                continue
    return None


def _extract_merchant(lines: list[str]) -> str | None:
    for line in lines:
        cleaned = line.strip(" -*#\t.:;")
        lowered = cleaned.lower()
        if not cleaned:
            continue
        if NUMBER_LINE.search(cleaned):
            continue
        if lowered in NOISE_WORDS:
            continue
        if len(cleaned.split()) > 8:  # looks like a sentence, not a name
            continue
        return cleaned
    return None


def _extract_category(text: str) -> str | None:
    lowered = text.lower()
    for keywords, category in KEYWORDS:
        if any(keyword in lowered for keyword in keywords):
            return category
    return None


def extract_receipt(text: str) -> ReceiptInfo:
    """Extract structured info from raw receipt text.

    Raises ReceiptExtractionError when the amount cannot be determined.
    """
    lines = [line.strip() for line in text.splitlines() if line.strip()]
    info = ReceiptInfo(raw_text=text)

    amount, notes = _extract_amount(lines)
    if amount is None or amount <= 0:
        raise ReceiptExtractionError(
            "Could not read an amount from this receipt. "
            "Please add the expense manually."
        )
    info.amount = amount
    info.notes = notes
    info.date = _extract_date(lines)
    info.merchant = _extract_merchant(lines)
    info.category = _extract_category(text)

    info.confidence = 0.5  # amount found
    if info.merchant:
        info.confidence += 0.2
    if info.date:
        info.confidence += 0.2
    if info.category:
        info.confidence += 0.1
    return info
