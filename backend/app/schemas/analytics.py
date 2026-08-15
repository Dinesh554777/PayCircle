from decimal import Decimal

from pydantic import BaseModel

from app.schemas.insights import TopExpense


class MonthlySpendingItem(BaseModel):
    month: str  # "2026-08"
    label: str  # "Aug 2026"
    amount: Decimal
    count: int


class WeeklySpendingItem(BaseModel):
    week: str  # "2026-W33"
    label: str  # "Aug 10 – Aug 16"
    amount: Decimal
    count: int


class CategorySpending(BaseModel):
    category: str
    amount: Decimal
    count: int
    share: float  # percentage of total spending (0-100)


class GroupSpending(BaseModel):
    group_id: int
    name: str
    amount: Decimal
    count: int


class BudgetSummary(BaseModel):
    current_month: str
    current_month_label: str
    current_amount: Decimal
    current_count: int
    previous_month: str
    previous_amount: Decimal
    change_percent: float | None = None
    direction: str | None = None  # "up" | "down" | "flat"


class AnalyticsOut(BaseModel):
    has_data: bool
    total_spending: Decimal
    expense_count: int
    average_expense: Decimal | None = None
    highest_expense: TopExpense | None = None
    lowest_expense: TopExpense | None = None
    monthly_spending: list[MonthlySpendingItem]
    weekly_spending: list[WeeklySpendingItem]
    category_totals: list[CategorySpending]
    group_totals: list[GroupSpending]
    budget: BudgetSummary
    spending_frequency: float | None = None
