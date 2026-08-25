"""Expense analytics computed from real PostgreSQL data.

This service is the single source of truth for "the authenticated user's share
of expenses". Insights, prediction, chatbot, and the AI assistant all reuse
`expense_rows()` so the spending math stays consistent across the app.
"""
from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime, timedelta
from decimal import Decimal
from typing import Iterable

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.ai.safety import user_group_ids
from app.models.expense import Expense
from app.models.group import Group
from app.models.user import User
from app.schemas.analytics import (
    AnalyticsOut,
    BudgetSummary,
    CategorySpending,
    GroupSpending,
    MonthlySpendingItem,
    WeeklySpendingItem,
)
from app.schemas.insights import TopExpense

MONTH_LABELS = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
]


@dataclass
class ExpenseRow:
    """A single expense the user participated in, with the user's own share."""

    expense: Expense
    share: Decimal
    date: datetime
    category: str


class AnalyticsService:
    def __init__(self, db: Session) -> None:
        self.db = db

    # ------------------------------------------------------------------ data

    def expense_rows(self, user: User, group_id: int | None = None) -> list[ExpenseRow]:
        """Return rows for the user's own share of expenses.

        Only expenses in groups the user belongs to (with a positive split
        share) are included, so results never leak another user's data.
        """
        group_ids = user_group_ids(self.db, user)
        if group_id is not None:
            if group_id not in group_ids:
                raise HTTPException(
                    status_code=403, detail="You are not a member of this group"
                )
            group_ids = [group_id]
        if not group_ids:
            return []

        expenses = (
            self.db.query(Expense)
            .filter(Expense.group_id.in_(group_ids))
            .order_by(Expense.paid_at, Expense.created_at)
            .all()
        )

        rows: list[ExpenseRow] = []
        for expense in expenses:
            share = sum(
                (
                    split.amount
                    for split in expense.splits
                    if split.user_id == user.id
                ),
                Decimal("0.00"),
            )
            if share <= 0:
                continue
            paid_at = expense.paid_at or expense.created_at
            category = (expense.category or expense.ai_category or "Other").strip() or "Other"
            rows.append(
                ExpenseRow(expense=expense, share=share, date=paid_at, category=category)
            )
        return rows

    def _expenses(self, user: User, group_id: int | None = None) -> list[Expense]:
        """Return the raw expenses the user can access (for group totals, etc.)."""
        group_ids = user_group_ids(self.db, user)
        if group_id is not None:
            if group_id not in group_ids:
                raise HTTPException(
                    status_code=403, detail="You are not a member of this group"
                )
            group_ids = [group_id]
        if not group_ids:
            return []
        return (
            self.db.query(Expense)
            .filter(Expense.group_id.in_(group_ids))
            .all()
        )

    # ----------------------------------------------------------- calculations

    def total_spending(self, rows: Iterable[ExpenseRow]) -> Decimal:
        return sum((row.share for row in rows), Decimal("0.00"))

    def average_expense(self, rows: Iterable[ExpenseRow]) -> Decimal | None:
        rows = list(rows)
        if not rows:
            return None
        return (self.total_spending(rows) / Decimal(len(rows))).quantize(Decimal("0.01"))

    def highest_expense(self, rows: Iterable[ExpenseRow]) -> ExpenseRow | None:
        return max(rows, key=lambda row: row.share) if rows else None

    def lowest_expense(self, rows: Iterable[ExpenseRow]) -> ExpenseRow | None:
        return min(rows, key=lambda row: row.share) if rows else None

    def monthly_spending(
        self, rows: Iterable[ExpenseRow]
    ) -> dict[tuple[int, int], Decimal]:
        totals: dict[tuple[int, int], Decimal] = {}
        for row in rows:
            key = (row.date.year, row.date.month)
            totals[key] = totals.get(key, Decimal("0.00")) + row.share
        return totals

    def weekly_spending(
        self, rows: Iterable[ExpenseRow]
    ) -> dict[tuple[int, int], Decimal]:
        """Group spending by ISO (year, week)."""
        totals: dict[tuple[int, int], Decimal] = {}
        for row in rows:
            iso = row.date.isocalendar()
            key = (iso[0], iso[1])
            totals[key] = totals.get(key, Decimal("0.00")) + row.share
        return totals

    def category_totals(self, rows: Iterable[ExpenseRow]) -> dict[str, Decimal]:
        totals: dict[str, Decimal] = {}
        for row in rows:
            totals[row.category] = totals.get(row.category, Decimal("0.00")) + row.share
        return totals

    def group_totals(self, user: User) -> dict[int, Decimal]:
        """Total expense amount per group (full amounts, not the user's share)."""
        totals: dict[int, Decimal] = {}
        for expense in self._expenses(user):
            totals[expense.group_id] = totals.get(expense.group_id, Decimal("0.00")) + expense.amount
        return totals

    def spending_frequency(self, rows: Iterable[ExpenseRow]) -> float | None:
        """Average number of expenses per month (0.0 when there is no data)."""
        rows = list(rows)
        if not rows:
            return None
        months = {(row.date.year, row.date.month) for row in rows}
        return len(rows) / len(months)

    # ------------------------------------------------------------------ views

    @staticmethod
    def _month_key(year: int, month: int) -> str:
        return f"{year:04d}-{month:02d}"

    def budget_summary(self, rows: Iterable[ExpenseRow]) -> BudgetSummary:
        """Current vs previous month spending with a change indicator.

        Informational spending indicator only; never financial advice.
        """
        monthly = self.monthly_spending(rows)
        now = datetime.now()
        current_key = (now.year, now.month)

        current_count = sum(
            1
            for row in rows
            if (row.date.year, row.date.month) == current_key
        )
        current_amount = monthly.get(current_key, Decimal("0.00"))

        prev_key = (current_key[0] - 1, 12) if current_key[1] == 1 else (current_key[0], current_key[1] - 1)
        previous_amount = monthly.get(prev_key)

        change_percent = None
        direction = None
        if previous_amount is not None and previous_amount > 0:
            change_percent = float((current_amount - previous_amount) / previous_amount * 100)
            if current_amount > previous_amount:
                direction = "up"
            elif current_amount < previous_amount:
                direction = "down"
            else:
                direction = "flat"

        return BudgetSummary(
            current_month=self._month_key(*current_key),
            current_month_label=f"{MONTH_LABELS[current_key[1] - 1]} {current_key[0]}",
            current_amount=current_amount,
            current_count=current_count,
            previous_month=self._month_key(*prev_key),
            previous_amount=previous_amount if previous_amount is not None else Decimal("0.00"),
            change_percent=change_percent,
            direction=direction,
        )

    def summary(self, user: User, group_id: int | None = None) -> AnalyticsOut:
        rows = self.expense_rows(user, group_id=group_id)
        if not rows:
            return AnalyticsOut(
                has_data=False,
                total_spending=Decimal("0.00"),
                expense_count=0,
                average_expense=None,
                highest_expense=None,
                lowest_expense=None,
                monthly_spending=[],
                weekly_spending=[],
                category_totals=[],
                group_totals=[],
                budget=self.budget_summary([]),
                spending_frequency=None,
            )

        total = self.total_spending(rows)

        category_totals = self.category_totals(rows)
        category_spending = [
            CategorySpending(
                category=category,
                amount=amount,
                count=sum(1 for row in rows if row.category == category),
                share=float(amount / total * 100),
            )
            for category, amount in sorted(
                category_totals.items(), key=lambda item: item[1], reverse=True
            )
        ]

        monthly = self.monthly_spending(rows)
        monthly_spending = [
            MonthlySpendingItem(
                month=self._month_key(year, month_num),
                label=f"{MONTH_LABELS[month_num - 1]} {year}",
                amount=amount,
                count=sum(
                    1
                    for row in rows
                    if (row.date.year, row.date.month) == (year, month_num)
                ),
            )
            for (year, month_num), amount in sorted(monthly.items())
        ]

        weekly = self.weekly_spending(rows)
        weekly_spending = [
            WeeklySpendingItem(
                week=self._week_key(iso_year, iso_week),
                label=self._week_label(iso_year, iso_week),
                amount=amount,
                count=sum(
                    1
                    for row in rows
                    if row.date.isocalendar()[:2] == (iso_year, iso_week)
                ),
            )
            for (iso_year, iso_week), amount in sorted(weekly.items(), reverse=True)
        ]

        highest = self.highest_expense(rows)
        lowest = self.lowest_expense(rows)

        if group_id is not None:
            group_expenses = self._expenses(user, group_id=group_id)
            target_group = self.db.query(Group).filter(Group.id == group_id).first()
            group_by_id = {group_id: target_group} if target_group else {}
            all_group_totals = self.group_totals(user)
            group_totals_list = [(group_id, all_group_totals.get(group_id, Decimal("0.00")))] if group_id in all_group_totals else []
        else:
            group_expenses = self._expenses(user)
            group_by_id = {
                group.id: group
                for group in self.db.query(Group)
                .filter(Group.id.in_(user_group_ids(self.db, user)))
                .all()
            }
            group_totals_list = sorted(self.group_totals(user).items(), key=lambda item: item[1], reverse=True)
        group_spending = [
            GroupSpending(
                group_id=gid,
                name=group_by_id.get(gid).name if group_by_id.get(gid) else "Group",
                amount=amount,
                count=sum(
                    1 for expense in group_expenses if expense.group_id == gid
                ),
            )
            for gid, amount in group_totals_list
        ]

        highest_schema = None
        if highest is not None:
            highest_schema = self._top_expense_schema(highest)
        lowest_schema = None
        if lowest is not None:
            lowest_schema = self._top_expense_schema(lowest)

        return AnalyticsOut(
            has_data=True,
            total_spending=total,
            expense_count=len(rows),
            average_expense=self.average_expense(rows),
            highest_expense=highest_schema,
            lowest_expense=lowest_schema,
            monthly_spending=monthly_spending,
            weekly_spending=weekly_spending,
            category_totals=category_spending,
            group_totals=group_spending,
            budget=self.budget_summary(rows),
            spending_frequency=self.spending_frequency(rows),
        )

    # ---------------------------------------------------------------- helpers

    @staticmethod
    def _top_expense_schema(row: ExpenseRow) -> TopExpense:
        return TopExpense(
            title=row.expense.title or "Expense",
            amount=row.share,
            date=row.date,
        )

    @staticmethod
    def _week_key(iso_year: int, iso_week: int) -> str:
        return f"{iso_year}-W{iso_week:02d}"

    @staticmethod
    def _week_label(iso_year: int, iso_week: int) -> str:
        monday = date.fromisocalendar(iso_year, iso_week, 1)
        sunday = monday + timedelta(days=6)
        return f"{MONTH_LABELS[monday.month - 1]} {monday.day} – {MONTH_LABELS[sunday.month - 1]} {sunday.day}"
