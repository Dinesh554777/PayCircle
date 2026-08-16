from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel


class AnomalyItem(BaseModel):
    """One "unusual spending" finding. Never labelled as fraud."""

    kind: str  # "expense" | "category_trend"
    expense_id: int | None = None
    title: str | None = None
    amount: Decimal | None = None  # user's share for expense anomalies
    category: str
    date: datetime | None = None
    group_id: int | None = None
    group_name: str | None = None
    reason: str
    severity: str  # "medium" | "high"


class AnomaliesOut(BaseModel):
    anomalies: list[AnomalyItem]
    count: int
