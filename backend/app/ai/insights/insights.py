"""Spending insights in an AI-consumable shape.

This is a thin adapter over the analytics + insights services so that future
AI models receive a stable, safe, user-scoped snapshot of the user's spending.
No business logic is duplicated here; all numbers come from real data.
"""
from __future__ import annotations

from decimal import Decimal

from app.schemas.insights import SpendingInsightsOut
from app.services.insights_service import InsightsService


class AISpendingInsights:
    """Provide insights and a plain-dict snapshot for AI prompts."""

    def __init__(self, db) -> None:
        self.db = db

    def get(self, user) -> SpendingInsightsOut:
        return InsightsService(self.db).get_insights(user)

    def snapshot(self, user) -> dict:
        """Return a JSON-serializable, privacy-safe snapshot of the user's data."""
        insights = self.get(user)
        return {
            "has_data": insights.expense_count > 0,
            "summary": insights.summary,
            "total_spending": _num(insights.total_spending),
            "expense_count": insights.expense_count,
            "average_expense": _num(insights.average_expense),
            "top_category": insights.top_category,
            "top_category_amount": _num(insights.top_category_amount),
            "top_category_share": insights.top_category_share,
            "category_breakdown": [
                {
                    "category": item.category,
                    "amount": _num(item.amount),
                    "count": item.count,
                    "share": item.share,
                }
                for item in insights.category_breakdown
            ],
            "monthly_summary": [
                {
                    "month": item.month,
                    "label": item.label,
                    "amount": _num(item.amount),
                    "count": item.count,
                }
                for item in insights.monthly_summary
            ],
            "largest_expense": (
                {
                    "title": insights.largest_expense.title,
                    "amount": _num(insights.largest_expense.amount),
                    "date": (
                        insights.largest_expense.date.isoformat()
                        if insights.largest_expense.date
                        else None
                    ),
                }
                if insights.largest_expense
                else None
            ),
            "spending_change": (
                {
                    "from_month": insights.spending_change.from_month,
                    "from_amount": _num(insights.spending_change.from_amount),
                    "to_month": insights.spending_change.to_month,
                    "to_amount": _num(insights.spending_change.to_amount),
                    "change_percent": insights.spending_change.change_percent,
                    "direction": insights.spending_change.direction,
                }
                if insights.spending_change
                else None
            ),
            "insights": insights.insights,
            "suggestions": insights.suggestions,
        }


def _num(value: Decimal | None):
    return float(value) if value is not None else None
