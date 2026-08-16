"""AI Expense Anomaly Detector.

A deterministic, statistics-only detector that finds "unusual spending" —
an expense that is far above the user's own typical amount in that category,
or a category whose monthly spending jumped compared with the user's history.

No machine-learning model or external API is required. Findings are framed as
"unusual spending" observations, never as fraud or financial advice.
"""
from __future__ import annotations

from collections import defaultdict
from datetime import datetime
from decimal import Decimal

from sqlalchemy.orm import Session

from app.models.group import Group
from app.models.user import User
from app.schemas.anomaly import AnomaliesOut, AnomalyItem
from app.services.analytics_service import AnalyticsService

ABSOLUTE_FLOOR = Decimal("500.00")  # ignore expenses below this
RELATIVE_MULTIPLIER = Decimal("1.6")  # amount must exceed avg by this factor
CATEGORY_TREND_MULTIPLIER = Decimal("1.5")
MIN_EXPENSES_PER_CATEGORY = 2


class SpendingAnalyzerService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.analytics = AnalyticsService(db)

    def detect_anomalies(
        self,
        user: User,
        group_id: int | None = None,
        limit: int = 8,
    ) -> AnomaliesOut:
        rows = self.analytics.expense_rows(user, group_id=group_id)
        if not rows:
            return AnomaliesOut(anomalies=[], count=0)

        group_names = {
            group_id: name
            for group_id, name in (
                self.db.query(Group.id, Group.name)
                .filter(Group.id.in_({row.expense.group_id for row in rows}))
                .all()
            )
        }

        by_category: dict[str, list] = defaultdict(list)
        for row in rows:
            by_category[row.category].append(row)

        anomalies: list[AnomalyItem] = []

        # 1. Expense-level: amount well above the user's typical for that category.
        for category, category_rows in by_category.items():
            if len(category_rows) < MIN_EXPENSES_PER_CATEGORY:
                continue
            average = (
                sum((row.share for row in category_rows), Decimal("0.00"))
                / len(category_rows)
            )
            for row in sorted(
                category_rows, key=lambda r: r.share, reverse=True
            ):
                if row.share < ABSOLUTE_FLOOR:
                    continue
                if row.share > average * RELATIVE_MULTIPLIER:
                    anomalies.append(
                        AnomalyItem(
                            kind="expense",
                            expense_id=row.expense.id,
                            title=row.expense.title,
                            amount=row.share,
                            category=category,
                            date=row.date,
                            group_id=row.expense.group_id,
                            group_name=group_names.get(row.expense.group_id),
                            reason=(
                                f"This is higher than your typical "
                                f"{category} expense of "
                                f"₹{average:,.2f}."
                            ),
                            severity="high"
                            if row.share >= average * Decimal("2.5")
                            else "medium",
                        )
                    )

        # 2. Category-trend: this month's total jumped vs the user's history.
        anomalies.extend(self._category_trends(user, group_id=group_id))

        anomalies.sort(key=lambda item: item.date or datetime.min, reverse=True)
        return AnomaliesOut(anomalies=anomalies[:limit], count=len(anomalies[:limit]))

    # ------------------------------------------------------------------ internals

    def _category_trends(self, user: User, group_id: int | None) -> list[AnomalyItem]:
        rows = self.analytics.expense_rows(user, group_id=group_id)
        if not rows:
            return []

        this_month_key = datetime.now().strftime("%Y-%m")
        month_totals: dict[str, dict[str, Decimal]] = defaultdict(lambda: defaultdict(Decimal))
        for row in rows:
            if row.date is None:
                continue
            month = row.date.strftime("%Y-%m")
            month_totals[month][row.category] += row.share

        trends: list[AnomalyItem] = []
        if this_month_key not in month_totals:
            return trends

        prior_averages: dict[str, Decimal] = defaultdict(Decimal)
        prior_counts: dict[str, int] = defaultdict(int)
        for month, categories in month_totals.items():
            if month >= this_month_key:
                continue
            for category, amount in categories.items():
                prior_averages[category] += amount
                prior_counts[category] += 1

        for category, amount in month_totals[this_month_key].items():
            if prior_counts[category] == 0:
                continue
            prior_avg = prior_averages[category] / prior_counts[category]
            if prior_avg <= Decimal("0"):
                continue
            if amount > prior_avg * CATEGORY_TREND_MULTIPLIER:
                trends.append(
                    AnomalyItem(
                        kind="category_trend",
                        category=category,
                        amount=amount,
                        reason=(
                            f"Your {category} spending this month (₹{amount:,.2f}) "
                            f"is much higher than your usual "
                            f"₹{prior_avg:,.2f} per month."
                        ),
                        severity="medium",
                    )
                )
        return trends
