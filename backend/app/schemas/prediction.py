from decimal import Decimal

from pydantic import BaseModel


class PredictionMonth(BaseModel):
    month: str  # "2026-07"
    label: str  # "Jul 2026"
    amount: Decimal


class SpendingPredictionOut(BaseModel):
    has_prediction: bool
    predicted_amount: Decimal | None = None
    period_label: str | None = None
    method: str | None = None
    based_on_months: list[PredictionMonth]
    message: str
