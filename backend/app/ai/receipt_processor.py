"""Receipt-to-Expense assistant.

Two extraction paths:
1. Text parsing (deterministic regex) - works offline, no API keys, fully
   testable. Handles merchant, date, line items, subtotal, tax, discount,
   grand total and currency.
2. Vision OCR via the configured Groq vision model - sends the uploaded
   receipt image and returns the raw text plus structured data. The
   deterministic parser runs on the returned text as validation/fallback.

Nothing is saved automatically - the UI always shows a review step and the
user must confirm before the expense is created.
"""
from __future__ import annotations

import base64
import json
import re
import urllib.error
import urllib.request
from dataclasses import dataclass, field
from datetime import datetime, timezone
from decimal import Decimal, InvalidOperation

from app.ai.categorization.categorizer import CATEGORIES, KEYWORDS
from app.core.config import get_settings

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
SUBTOTAL_HINTS = re.compile(r"\bsub\s*total\b|\bsubtotal\b", re.IGNORECASE)
TAX_HINTS = re.compile(r"\b(cgst|sgst|igst|vat|tax|service charge)\b", re.IGNORECASE)
DISCOUNT_HINTS = re.compile(r"\b(discount|off|promo|coupon)\b", re.IGNORECASE)
GRAND_TOTAL_HINTS = re.compile(r"\bgrand total\b|\bnet amount\b|\bamount due\b|\btotal\b", re.IGNORECASE)
CURRENCY_INR = re.compile(r"₹|\brs\.?\b|\binr\b", re.IGNORECASE)
ITEM_LINE = re.compile(
    r"^(?P<name>.+?)\s+(?P<qty>\d+(?:\.\d+)?)\s+(?:@\s*)?(?:₹|rs\.?)?\s*(?P<unit>[0-9][0-9,]*(?:\.\d+)?)\s+(?:₹|rs\.?)?\s*(?P<line_total>[0-9][0-9,]*(?:\.\d+)?)$",
    re.IGNORECASE,
)
ITEM_LINE_SIMPLE = re.compile(
    r"^(?P<name>.+?)\s+(?:₹|rs\.?)?\s*(?P<line_total>[0-9][0-9,]*(?:\.\d{1,2}))$"
)
DATE_PATTERNS = [
    re.compile(r"\b(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})\b"),
    re.compile(r"\b(\d{1,2})\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+(\d{4})\b", re.IGNORECASE),
    re.compile(r"\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+(\d{1,2}),?\s+(\d{4})\b", re.IGNORECASE),
]
NUMBER_LINE = re.compile(r"\d")
GROQ_CHAT_URL = "https://api.groq.com/openai/v1/chat/completions"

VISION_PROMPT = """Analyze this receipt image.

Extract only information that is actually visible in the receipt.
Do not invent or guess missing values.

Return valid JSON containing:
merchant,
date,
currency,
items,
subtotal,
tax,
discount,
total.

For each item return:
name,
quantity,
unit_price,
total.

If a value is unavailable, return null. Use this exact JSON shape:
{"merchant": str|null, "date": "YYYY-MM-DD"|null, "currency": str|null, "items": [{"name": str, "quantity": number|null, "unit_price": number|null, "total": number|null}], "subtotal": number|null, "tax": number|null, "discount": number|null, "total": number|null, "raw_text": str}
"""


class ReceiptExtractionError(Exception):
    """Raised when an amount cannot be reliably read from the receipt."""


RATE_LIMIT_MESSAGE = (
    "Receipt scanning is busy right now. Please try again in a minute."
)
UNREADABLE_MESSAGE = "We couldn't read this receipt. Try uploading a clearer image."

MAX_IMAGE_SIDE = 1400
JPEG_QUALITY = 85


def _prepare_image(image_bytes: bytes, media_type: str) -> tuple[bytes, str]:
    """Downscale/re-encode the image so vision requests stay small.

    Large phone photos consume thousands of input tokens and blow through
    per-minute provider limits; a ~1400px JPEG is plenty for OCR.
    """
    try:
        import io

        from PIL import Image

        image = Image.open(io.BytesIO(image_bytes))
        width, height = image.size
        longest = max(width, height)
        if longest > MAX_IMAGE_SIDE:
            scale = MAX_IMAGE_SIDE / longest
            image = image.resize(
                (max(1, int(width * scale)), max(1, int(height * scale))),
                Image.LANCZOS,
            )
        if image.mode not in ("RGB", "L"):
            image = image.convert("RGB")
        buffer = io.BytesIO()
        image.save(buffer, format="JPEG", quality=JPEG_QUALITY, optimize=True)
        prepared = buffer.getvalue()
        if len(prepared) < len(image_bytes) or longest > MAX_IMAGE_SIDE:
            return prepared, "image/jpeg"
        return image_bytes, media_type
    except Exception:
        return image_bytes, media_type


def _ocr_image_local(image_bytes: bytes, media_type: str) -> str | None:
    """Run fully-offline OCR (RapidOCR) on a receipt image.

    Returns the raw recognized text, or None if local OCR is unavailable or
    recognizes nothing usable. Local OCR has no rate limits, so it gives a
    reliable path even when the hosted vision provider is busy. The OCR model
    is loaded once and reused across calls.
    """
    try:
        import io

        from PIL import Image
        from rapidocr_onnxruntime import RapidOCR

        engine = _get_local_ocr_engine()
        image = Image.open(io.BytesIO(image_bytes))
        if image.mode not in ("RGB", "L"):
            image = image.convert("RGB")
        buffer = io.BytesIO()
        image.save(buffer, format="PNG")
        result, _ = engine(buffer.getvalue())
        if not result:
            return None
        lines = [line[1] for line in result if line and isinstance(line[1], str)]
        text = "\n".join(lines).strip()
        return text or None
    except Exception:
        return None


_LOCAL_OCR_ENGINE = None
_LOCAL_OCR_LOCK = None


def _get_local_ocr_engine():
    """Lazily build and cache the RapidOCR engine (thread-safe once built)."""
    global _LOCAL_OCR_ENGINE, _LOCAL_OCR_LOCK
    if _LOCAL_OCR_ENGINE is not None:
        return _LOCAL_OCR_ENGINE
    if _LOCAL_OCR_LOCK is None:
        import threading

        _LOCAL_OCR_LOCK = threading.Lock()
    with _LOCAL_OCR_LOCK:
        if _LOCAL_OCR_ENGINE is None:
            from rapidocr_onnxruntime import RapidOCR

            _LOCAL_OCR_ENGINE = RapidOCR()
    return _LOCAL_OCR_ENGINE

@dataclass
class ReceiptItemInfo:
    name: str
    quantity: Decimal | None = None
    unit_price: Decimal | None = None
    total: Decimal | None = None


@dataclass
class ReceiptInfo:
    merchant: str | None = None
    amount: Decimal | None = None
    date: datetime | None = None
    category: str | None = None
    confidence: float = 0.0
    notes: list[str] = field(default_factory=list)
    raw_text: str | None = None
    items: list[ReceiptItemInfo] = field(default_factory=list)
    subtotal: Decimal | None = None
    tax: Decimal | None = None
    discount: Decimal | None = None
    total: Decimal | None = None
    currency: str | None = None


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


def _is_noise_line(lowered: str) -> bool:
    return bool(
        SUBTOTAL_HINTS.search(lowered)
        or TAX_HINTS.search(lowered)
        or DISCOUNT_HINTS.search(lowered)
        or GRAND_TOTAL_HINTS.search(lowered)
        or lowered.strip() in NOISE_WORDS
    )


def _extract_items(lines: list[str]) -> list[ReceiptItemInfo]:
    items: list[ReceiptItemInfo] = []
    number_re = re.compile(r"[0-9][0-9,]*(?:\.\d+)?")
    for line in lines:
        lowered = line.lower()
        if _is_noise_line(lowered):
            continue
        matches = list(number_re.finditer(line))
        if not matches:
            continue
        name = line[: matches[0].start()].strip(" -*#.:;\t")
        if not name or name.lower() in NOISE_WORDS:
            continue
        if not re.search(r"[A-Za-z]", name):
            continue
        try:
            numbers = [_to_decimal(match.group(0)) for match in matches]
        except (InvalidOperation, ValueError):
            continue
        if len(numbers) >= 3:
            quantity, unit_price, line_total = numbers[0], numbers[1], numbers[2]
        elif len(numbers) == 2:
            quantity, line_total = numbers[0], numbers[1]
            unit_price = (
                (line_total / quantity).quantize(Decimal("0.01"))
                if quantity
                else None
            )
        else:
            quantity, unit_price, line_total = None, None, numbers[0]
        items.append(
            ReceiptItemInfo(
                name=name[:120],
                quantity=quantity,
                unit_price=unit_price,
                total=line_total,
            )
        )
    return items


def _labeled_amount(lines: list[str], hints: re.Pattern[str]) -> Decimal | None:
    """Last amount on the first matching label line (e.g. 'Subtotal  700.00')."""
    for line in lines:
        if hints.search(line):
            amounts = AMOUNT_PATTERNS[0].findall(line) + AMOUNT_PATTERNS[2].findall(line)
            if amounts:
                try:
                    return _to_decimal(amounts[-1])
                except (InvalidOperation, ValueError):
                    continue
    return None


def _extract_structured(lines: list[str], text: str, info: ReceiptInfo) -> None:
    info.items = _extract_items(lines)
    info.subtotal = _labeled_amount(lines, SUBTOTAL_HINTS)

    tax_parts: list[Decimal] = []
    for line in lines:
        if TAX_HINTS.search(line) and not SUBTOTAL_HINTS.search(line):
            amounts = AMOUNT_PATTERNS[0].findall(line) + AMOUNT_PATTERNS[2].findall(line)
            if amounts:
                try:
                    tax_parts.append(_to_decimal(amounts[-1]))
                except (InvalidOperation, ValueError):
                    continue
    if len(tax_parts) > 1:
        info.tax = sum(tax_parts, Decimal("0.00"))
    elif len(tax_parts) == 1:
        info.tax = tax_parts[0]

    info.discount = _labeled_amount(lines, DISCOUNT_HINTS)

    grand = None
    for line in reversed(lines):
        if GRAND_TOTAL_HINTS.search(line):
            amounts = AMOUNT_PATTERNS[0].findall(line) + AMOUNT_PATTERNS[2].findall(line)
            if amounts:
                try:
                    grand = _to_decimal(amounts[-1])
                    break
                except (InvalidOperation, ValueError):
                    continue
    info.total = grand
    if CURRENCY_INR.search(text):
        info.currency = "INR"
    elif TAX_HINTS.search(text) and re.search(r"\bcgst\b|\bsgst\b|\bigst\b", text, re.IGNORECASE):
        info.currency = "INR"


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
    _extract_structured(lines, text, info)
    if info.total is None:
        info.total = amount

    info.confidence = 0.5  # amount found
    if info.merchant:
        info.confidence += 0.2
    if info.date:
        info.confidence += 0.2
    if info.category:
        info.confidence += 0.1
    return info


def extract_receipt_from_image(image_bytes: bytes, media_type: str) -> ReceiptInfo:
    """OCR a receipt image and return parsed ReceiptInfo.

    Strategy (robust regardless of provider rate limits):
    1. Fully-offline local OCR (RapidOCR) -> deterministic text parser. No
       external API, no rate limits, always available -> returns fast.
    2. If local OCR yields no usable amount, fall back to the hosted Groq
       vision model (with automatic retry on transient 429/5xx).

    Raises ReceiptExtractionError with a safe, non-technical message when the
    image cannot be read at all.
    """
    # ── Path 1: offline local OCR + deterministic parser ─────────────────
    try:
        local_text = _ocr_image_local(image_bytes, media_type)
        if local_text and local_text.strip():
            try:
                info = extract_receipt(local_text)
                info.confidence = max(info.confidence, 0.75)
                info.raw_text = local_text
                return info
            except ReceiptExtractionError:
                pass  # amount not readable locally -> fall through to vision
    except Exception:
        pass

    # ── Path 2: hosted Groq vision model (fallback) ──────────────────────
    settings = get_settings()
    api_key = settings.effective_ai_api_key
    if not api_key:
        raise ReceiptExtractionError(
            "Receipt scanning is not configured on this server. "
            "Please enter the receipt details manually."
        )

    image_bytes, media_type = _prepare_image(image_bytes, media_type)
    data_url = f"data:{media_type};base64,{base64.b64encode(image_bytes).decode('ascii')}"

    def _payload(with_reasoning_flag: bool) -> dict:
        payload = {
            "model": settings.AI_VISION_MODEL,
            "messages": [
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": VISION_PROMPT},
                        {"type": "image_url", "image_url": {"url": data_url}},
                    ],
                }
            ],
            "temperature": 0,
            "max_tokens": 4096,
        }
        if with_reasoning_flag:
            payload["reasoning_format"] = "hidden"
        return payload

    import random as _random
    import time as _time

    def _post(
        payload: dict,
        *,
        retries: int = 6,
        base_delay: float = 1.5,
        max_delay: float = 20.0,
    ) -> dict:
        """POST to Groq, retrying transient 429/5xx responses with backoff.

        Provider per-minute limits are common for vision models. We wait (and
        respect any Retry-After header) and retry a few times so a transient
        rate limit resolves itself instead of failing the scan.
        """
        request = urllib.request.Request(
            GROQ_CHAT_URL,
            data=json.dumps(payload).encode("utf-8"),
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
                "User-Agent": "PayCircle/0.1 (FastAPI backend)",
            },
            method="POST",
        )
        attempt = 0
        while attempt <= retries:
            try:
                with urllib.request.urlopen(request, timeout=90) as response:
                    return json.loads(response.read().decode("utf-8"))
            except urllib.error.HTTPError as exc:
                retryable = exc.code == 429 or exc.code >= 500
                if not retryable or attempt >= retries:
                    raise
                attempt += 1
                delay = min(base_delay * (2 ** (attempt - 1)), max_delay)
                retry_after = exc.headers.get("Retry-After") if exc.headers else None
                if retry_after and retry_after.isdigit():
                    delay = max(delay, min(float(retry_after), max_delay))
                delay = delay + _random.uniform(0, 1.0)
                _time.sleep(delay)
        raise RuntimeError("vision request exhausted retries")

    try:
        try:
            body = _post(_payload(True))
        except urllib.error.HTTPError as exc:
            if exc.code == 429:
                raise ReceiptExtractionError(RATE_LIMIT_MESSAGE) from exc
            if exc.code in (400, 422):
                body = _post(_payload(False))
            else:
                detail = ""
                try:
                    detail = exc.read().decode("utf-8", "replace")[:200]
                except Exception:
                    pass
                raise RuntimeError(f"vision HTTP {exc.code}: {detail}") from exc
        content = body["choices"][0]["message"]["content"]
        finish_reason = body["choices"][0].get("finish_reason")
    except ReceiptExtractionError:
        raise
    except Exception as exc:
        raise ReceiptExtractionError(UNREADABLE_MESSAGE) from exc

    structured, raw_text = _parse_vision_content(content)
    if not structured and not (raw_text or "").strip():
        stripped = THINK_BLOCK.sub("", content or "").strip()
        if stripped:
            raw_text = stripped
        elif finish_reason == "length":
            raise ReceiptExtractionError(
                "We couldn't read this receipt. Try uploading a clearer image."
            )

    if structured.get("total") is not None or structured.get("items"):
        info = ReceiptInfo(raw_text=raw_text or "")

        def _dec(value) -> Decimal | None:
            if value is None:
                return None
            try:
                return Decimal(str(value))
            except (InvalidOperation, ValueError):
                return None

        info.merchant = structured.get("merchant") or None
        currency_in = structured.get("currency")
        info.currency = (currency_in or "").upper() or None
        date_str = structured.get("date")
        if date_str:
            try:
                info.date = datetime.strptime(str(date_str)[:10], "%Y-%m-%d").replace(
                    tzinfo=timezone.utc
                )
            except ValueError:
                info.date = None
        for item in structured.get("items") or []:
            if isinstance(item, dict) and item.get("name"):
                info.items.append(
                    ReceiptItemInfo(
                        name=str(item["name"])[:120],
                        quantity=_dec(item.get("quantity")),
                        unit_price=_dec(item.get("unit_price")),
                        total=_dec(item.get("total")),
                    )
                )
        info.subtotal = _dec(structured.get("subtotal"))
        info.tax = _dec(structured.get("tax"))
        info.discount = _dec(structured.get("discount"))
        info.total = _dec(structured.get("total"))
        info.amount = info.total or info.subtotal or (
            sum((item.total or Decimal("0.00") for item in info.items), Decimal("0.00")) or None
        )
        if info.amount is None or info.amount <= 0:
            raise ReceiptExtractionError(
                "We couldn't read this receipt. Try uploading a clearer image."
            )
        info.category = _extract_category(json.dumps(structured))
        info.confidence = 0.9
        return info

    if raw_text:
        try:
            return extract_receipt(raw_text)
        except ReceiptExtractionError:
            pass

    raise ReceiptExtractionError(
        "We couldn't read this receipt. Try uploading a clearer image."
    )


THINK_BLOCK = re.compile(r"<think>.*?</think>", re.DOTALL)


def _parse_vision_content(content: str) -> tuple[dict, str | None]:
    """Safely parse the model's JSON reply; never raises."""
    if isinstance(content, str):
        content = THINK_BLOCK.sub("", content).strip()
    try:
        data = json.loads(content)
        if isinstance(data, dict):
            raw_text = data.pop("raw_text", None)
            return data, raw_text if isinstance(raw_text, str) else None
    except (json.JSONDecodeError, AttributeError):
        pass
    match = re.search(r"\{.*\}", content or "", re.DOTALL)
    if match:
        try:
            data = json.loads(match.group(0))
            if isinstance(data, dict):
                raw_text = data.pop("raw_text", None)
                return data, raw_text if isinstance(raw_text, str) else None
        except json.JSONDecodeError:
            pass
    return {}, content if isinstance(content, str) else None
