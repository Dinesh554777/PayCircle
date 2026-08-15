"""Future spending estimation in an AI-consumable shape.

Thin adapter over PredictionService. Estimates always use only the
authenticated user's own expense history.
"""
from __future__ import annotations

from app.schemas.prediction import SpendingPredictionOut
from app.services.prediction_service import PredictionService


class AISpendingPrediction:
    def __init__(self, db) -> None:
        self.db = db

    def get(self, user) -> SpendingPredictionOut:
        return PredictionService(self.db).get_prediction(user)

    def snapshot(self, user) -> dict:
        prediction = self.get(user)
        return {
            "has_prediction": prediction.has_prediction,
            "predicted_amount": (
                float(prediction.predicted_amount)
                if prediction.predicted_amount is not None
                else None
            ),
            "period_label": prediction.period_label,
            "method": prediction.method,
            "message": prediction.message,
            "based_on_months": [
                {"month": item.month, "label": item.label, "amount": float(item.amount)}
                for item in prediction.based_on_months
            ],
        }
