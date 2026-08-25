"""Next-month spending prediction based on the user's historical expenses."""
from collections import defaultdict
from decimal import Decimal

from sqlalchemy.orm import Session

from app.models.user import User
from app.schemas.prediction import PredictionMonth, SpendingPredictionOut
from app.services.analytics_service import AnalyticsService
from app.services.insights_service import MONTH_LABELS

MIN_MONTHS_REQUIRED = 2
LOOKBACK_MONTHS = 3

NOT_ENOUGH_DATA_MESSAGE = "Not enough data for prediction."


class PredictionService:
    """Estimate the next month's spending using a simple historical average."""

    def __init__(self, db: Session) -> None:
        self.db = db

    def get_prediction(self, user: User, group_id: int | None = None) -> SpendingPredictionOut:
        months = self._monthly_totals(user, group_id=group_id)

        based_on_months = [
            PredictionMonth(
                month=f"{year:04d}-{month:02d}",
                label=f"{MONTH_LABELS[month - 1]} {year}",
                amount=amount,
            )
            for (year, month), amount in sorted(months.items())
        ]

        if len(based_on_months) < MIN_MONTHS_REQUIRED:
            return SpendingPredictionOut(
                has_prediction=False,
                based_on_months=based_on_months,
                message=NOT_ENOUGH_DATA_MESSAGE,
            )

        recent = sorted(months.items())[-LOOKBACK_MONTHS:]
        average = (
            sum((amount for _, amount in recent), Decimal("0.00"))
            / Decimal(len(recent))
        ).quantize(Decimal("0.01"))

        last_year, last_month = recent[-1][0]
        next_year, next_month = self._next_month(last_year, last_month)
        period_label = f"{MONTH_LABELS[next_month - 1]} {next_year}"
        method = f"simple average of the last {len(recent)} months"

        return SpendingPredictionOut(
            has_prediction=True,
            predicted_amount=average,
            period_label=period_label,
            method=method,
            based_on_months=based_on_months,
            message=(
                f"Based on your last {len(recent)} months, you might spend about "
                f"₹{average:,.2f} in {period_label}. "
                "This is a rough estimate, not a guarantee."
            ),
        )

    def _monthly_totals(self, user: User, group_id: int | None = None) -> dict[tuple[int, int], Decimal]:
        """Sum the user's share of expenses per month (months with data only)."""
        totals: dict[tuple[int, int], Decimal] = defaultdict(lambda: Decimal("0.00"))
        for row in AnalyticsService(self.db).expense_rows(user, group_id=group_id):
            totals[(row.date.year, row.date.month)] += row.share
        return totals

    @staticmethod
    def _next_month(year: int, month: int) -> tuple[int, int]:
        if month == 12:
            return year + 1, 1
        return year, month + 1
