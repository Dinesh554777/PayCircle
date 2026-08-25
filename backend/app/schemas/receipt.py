from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, Field


class ReceiptExtractIn(BaseModel):
    text: str = Field(min_length=1, description="Raw receipt text to parse")


class ReceiptItem(BaseModel):
    name: str
    quantity: Decimal | None = None
    unit_price: Decimal | None = None
    total: Decimal | None = None


class ReceiptExtractOut(BaseModel):
    extracted: bool
    merchant: str | None = None
    amount: Decimal | None = None
    date: datetime | None = None
    category: str | None = None
    confidence: float = 0.0
    notes: list[str] = []
    error: str | None = None
    raw_text: str | None = None
    items: list[ReceiptItem] = []
    subtotal: Decimal | None = None
    tax: Decimal | None = None
    discount: Decimal | None = None
    total: Decimal | None = None
    currency: str | None = None
