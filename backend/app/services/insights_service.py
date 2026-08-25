"""AI spending insights and personalized suggestions based on the user's expenses."""
from collections import defaultdict
from decimal import Decimal

from sqlalchemy.orm import Session

from app.models.user import User
from app.schemas.insights import (
    CategorySummary,
    MonthlySummary,
    SpendingChange,
    SpendingInsightsOut,
    TopExpense,
)
from app.services.analytics_service import AnalyticsService, ExpenseRow

MONTH_LABELS = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
]

CHANGE_UP_THRESHOLD_PERCENT = 20
TOP_CATEGORY_SHARE_THRESHOLD = 50


def _fmt(amount: Decimal) -> str:
    return f"₹{amount:,.2f}"


class InsightsService:
    """Compute spending insights and suggestions from real expense data."""

    def __init__(self, db: Session) -> None:
        self.db = db

    def get_insights(self, user: User, group_id: int | None = None) -> SpendingInsightsOut:
        rows = AnalyticsService(self.db).expense_rows(user, group_id=group_id)

        if not rows:
            return SpendingInsightsOut(
                summary="You don't have any expenses yet. Add an expense to unlock AI insights.",
                total_spending=Decimal("0.00"),
                expense_count=0,
                average_expense=Decimal("0.00"),
                category_breakdown=[],
                monthly_summary=[],
                insights=["No expenses recorded yet."],
                suggestions=["Record your first expense to get personalized suggestions."],
            )

        total = sum((row.share for row in rows), Decimal("0.00"))
        count = len(rows)
        average = total / Decimal(count)

        category_totals: dict[str, Decimal] = defaultdict(lambda: Decimal("0.00"))
        category_counts: dict[str, int] = defaultdict(int)
        monthly_totals: dict[tuple[int, int], Decimal] = defaultdict(lambda: Decimal("0.00"))
        monthly_counts: dict[tuple[int, int], int] = defaultdict(int)

        largest = rows[0]
        for row in rows:
            category_totals[row.category] += row.share
            category_counts[row.category] += 1
            key = (row.date.year, row.date.month)
            monthly_totals[key] += row.share
            monthly_counts[key] += 1
            if row.share > largest.share:
                largest = row

        top_category = (
            max(category_totals, key=lambda cat: category_totals[cat])
            if category_totals
            else None
        )
        top_amount = category_totals.get(top_category) if top_category else None
        top_share = float(top_amount / total * 100) if top_amount else None
        frequent_category = (
            max(category_counts, key=lambda cat: category_counts[cat])
            if category_counts
            else None
        )
        frequent_count = category_counts.get(frequent_category) if frequent_category else None

        category_breakdown = [
            CategorySummary(
                category=category,
                amount=amount,
                count=category_counts[category],
                share=float(amount / total * 100),
            )
            for category, amount in sorted(
                category_totals.items(), key=lambda item: item[1], reverse=True
            )
        ]

        monthly_summary = [
            MonthlySummary(
                month=self._month_key(year, month_num),
                label=f"{MONTH_LABELS[month_num - 1]} {year}",
                amount=amount,
                count=monthly_counts[(year, month_num)],
            )
            for (year, month_num), amount in sorted(monthly_totals.items())
        ]

        spending_change = self._spending_change(sorted(monthly_totals.items()))

        largest_expense = TopExpense(
            title=largest.expense.title or "Expense",
            amount=largest.share,
            date=largest.date,
        )

        insights = self._build_insights(
            total,
            count,
            average,
            top_category,
            top_amount,
            frequent_category,
            frequent_count,
            largest_expense,
            spending_change,
            monthly_summary,
        )
        suggestions = self._build_suggestions(
            rows,
            category_totals,
            total,
            top_category,
            top_share,
            spending_change,
        )

        return SpendingInsightsOut(
            summary=(
                f"Across your groups you have spent {_fmt(total)} "
                f"on {count} expense{'' if count == 1 else 's'}."
            ),
            total_spending=total,
            expense_count=count,
            average_expense=average,
            top_category=top_category,
            top_category_amount=top_amount,
            top_category_share=top_share,
            frequent_category=frequent_category,
            frequent_category_count=frequent_count,
            largest_expense=largest_expense,
            spending_change=spending_change,
            category_breakdown=category_breakdown,
            monthly_summary=monthly_summary,
            insights=insights,
            suggestions=suggestions,
        )

    @staticmethod
    def _month_key(year: int, month: int) -> str:
        return f"{year:04d}-{month:02d}"

    def _spending_change(
        self, sorted_months: list[tuple[tuple[int, int], Decimal]]
    ) -> SpendingChange | None:
        if len(sorted_months) < 2:
            return None
        (prev_year, prev_month), prev_amount = sorted_months[-2]
        (last_year, last_month), last_amount = sorted_months[-1]
        if prev_amount <= 0:
            return None
        change_percent = float((last_amount - prev_amount) / prev_amount * 100)
        if last_amount > prev_amount:
            direction = "up"
        elif last_amount < prev_amount:
            direction = "down"
        else:
            direction = "flat"
        return SpendingChange(
            from_month=self._month_key(prev_year, prev_month),
            from_amount=prev_amount,
            to_month=self._month_key(last_year, last_month),
            to_amount=last_amount,
            change_percent=change_percent,
            direction=direction,
        )

    def _category_increases(
        self,
        rows: list[ExpenseRow],
        last_key: tuple[int, int] | None,
        prev_key: tuple[int, int] | None,
    ) -> dict[str, tuple[Decimal, Decimal]]:
        if last_key is None or prev_key is None:
            return {}

        def totals_for(key: tuple[int, int]) -> dict[str, Decimal]:
            totals: dict[str, Decimal] = defaultdict(lambda: Decimal("0.00"))
            for row in rows:
                if (row.date.year, row.date.month) == key:
                    totals[row.category] += row.share
            return totals

        last_totals = totals_for(last_key)
        prev_totals = totals_for(prev_key)
        increases: dict[str, tuple[Decimal, Decimal]] = {}
        for category, amount in last_totals.items():
            if category in prev_totals and amount > prev_totals[category]:
                increases[category] = (prev_totals[category], amount)
        return increases

    def _build_insights(
        self,
        total: Decimal,
        count: int,
        average: Decimal,
        top_category: str | None,
        top_amount: Decimal | None,
        frequent_category: str | None,
        frequent_count: int | None,
        largest_expense: TopExpense,
        spending_change: SpendingChange | None,
        monthly_summary: list[MonthlySummary],
    ) -> list[str]:
        insights: list[str] = []
        if top_category and top_amount is not None:
            insights.append(
                f"Your highest spending category is {top_category} ({_fmt(top_amount)})."
            )
        insights.append(
            f"Your total spending comes to {_fmt(total)} across {count} expense"
            f"{'' if count == 1 else 's'}."
        )
        insights.append(f"Your average expense is {_fmt(average)}.")
        if spending_change:
            percent = abs(spending_change.change_percent)
            if spending_change.direction == "up":
                insights.append(
                    f"Spending rose {percent:.0f}% compared with the previous month."
                )
            elif spending_change.direction == "down":
                insights.append(
                    f"Spending fell {percent:.0f}% compared with the previous month."
                )
            else:
                insights.append("Spending stayed level compared with the previous month.")
        if frequent_category and frequent_count is not None:
            insights.append(
                f"Your most frequent category is {frequent_category} "
                f"({frequent_count} expense{'' if frequent_count == 1 else 's'})."
            )
        if largest_expense.title:
            insights.append(
                f"Your largest single expense was {largest_expense.title} "
                f"({_fmt(largest_expense.amount)})."
            )
        if monthly_summary:
            last = monthly_summary[-1]
            insights.append(
                f"In {last.label}, you spent {_fmt(last.amount)} "
                f"across {last.count} expense{'' if last.count == 1 else 's'}."
            )
        return insights

    def _build_suggestions(
        self,
        rows: list[ExpenseRow],
        category_totals: dict[str, Decimal],
        total: Decimal,
        top_category: str | None,
        top_share: float | None,
        spending_change: SpendingChange | None,
    ) -> list[str]:
        suggestions: list[str] = []

        if spending_change:
            percent = abs(spending_change.change_percent)
            if (
                spending_change.direction == "up"
                and percent >= CHANGE_UP_THRESHOLD_PERCENT
            ):
                suggestions.append(
                    f"Your overall spending increased by {percent:.0f}% compared with "
                    "the previous month. Review recent expenses to check whether the "
                    "increase is expected."
                )

            month_keys = sorted({(row.date.year, row.date.month) for row in rows})
            if len(month_keys) >= 2:
                increases = self._category_increases(
                    rows, month_keys[-1], month_keys[-2]
                )
                for category, (prev_amount, last_amount) in sorted(
                    increases.items()
                ):
                    suggestions.append(
                        f"Your {category} expenses increased compared with last month "
                        f"({_fmt(prev_amount)} → {_fmt(last_amount)}). "
                        f"Consider setting a {category.lower()} budget."
                    )

        if top_category and top_share is not None and top_share >= TOP_CATEGORY_SHARE_THRESHOLD:
            suggestions.append(
                f"{top_category} accounts for {top_share:.0f}% of your spending. "
                "Check whether that matches your plans and adjust if needed."
            )

        if not suggestions:
            suggestions.append(
                "Your spending looks stable. Keep tracking expenses to get more "
                "tailored suggestions over time."
            )
        return suggestions
