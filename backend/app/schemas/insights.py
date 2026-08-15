from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel


class CategorySummary(BaseModel):
    category: str
    amount: Decimal
    count: int
    share: float  # percentage of total spending (0-100)


class MonthlySummary(BaseModel):
    month: str  # "2026-08"
    label: str  # "Aug 2026"
    amount: Decimal
    count: int


class TopExpense(BaseModel):
    title: str
    amount: Decimal
    date: datetime | None


class SpendingChange(BaseModel):
    from_month: str
    from_amount: Decimal
    to_month: str
    to_amount: Decimal
    change_percent: float
    direction: str  # "up" | "down" | "flat"


class SpendingInsightsOut(BaseModel):
    summary: str
    total_spending: Decimal
    expense_count: int
    average_expense: Decimal
    top_category: str | None = None
    top_category_amount: Decimal | None = None
    top_category_share: float | None = None
    frequent_category: str | None = None
    frequent_category_count: int | None = None
    largest_expense: TopExpense | None = None
    spending_change: SpendingChange | None = None
    category_breakdown: list[CategorySummary]
    monthly_summary: list[MonthlySummary]
    insights: list[str]
    suggestions: list[str]
