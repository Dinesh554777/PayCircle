from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, Field


class ReceiptExtractIn(BaseModel):
    text: str = Field(min_length=1, description="Raw receipt text to parse")


class ReceiptExtractOut(BaseModel):
    extracted: bool
    merchant: str | None = None
    amount: Decimal | None = None
    date: datetime | None = None
    category: str | None = None
    confidence: float = 0.0
    notes: list[str] = []
    error: str | None = None
