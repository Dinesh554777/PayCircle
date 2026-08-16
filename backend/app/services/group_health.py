"""Group Spending Health Score.

A deterministic, data-driven 0-100 score showing how well-managed a group is.
It blends three factors computed from real expense/settlement data:

- Balance  (40%): share of members with a zero outstanding balance
- Settlement (35%): whether pending settlements are left open
- Activity (25%): how recently the group has recorded expenses

The score is an activity indicator only. It is never presented as a financial
or credit score and it never alters balances or settlements.
"""
from __future__ import annotations

from datetime import datetime, timedelta
from decimal import Decimal

from sqlalchemy.orm import Session

from app.models.expense import Expense
from app.models.settlement import Settlement
from app.models.user import User
from app.schemas.group_health import GroupHealthOut, HealthFactor
from app.services.balance_service import BalanceService
from app.services.group_service import GroupService

WEIGHTS = {"balance": 0.40, "settlement": 0.35, "activity": 0.25}
LABEL_THRESHOLDS = [
    (80, "Excellent"),
    (60, "Good"),
    (40, "Fair"),
    (0, "Needs attention"),
]


class GroupHealthService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.groups = GroupService(db)
        self.balances = BalanceService(db)

    def calculate(self, group_id: int, actor: User) -> GroupHealthOut:
        group = self.groups.get_group_for_user(group_id, actor)
        balance_out = self.balances.get_balances(group_id, actor)
        items = balance_out.balances

        total_expenses = (
            self.db.query(Expense)
            .filter(Expense.group_id == group_id)
            .count()
        )
        recent_cutoff = datetime.now() - timedelta(days=30)
        recent_expenses = (
            self.db.query(Expense)
            .filter(
                Expense.group_id == group_id,
                Expense.paid_at >= recent_cutoff,
            )
            .count()
        )
        open_settlements = (
            self.db.query(Settlement)
            .filter(
                Settlement.group_id == group_id,
                Settlement.status == "pending",
            )
            .count()
        )

        members = len(items)
        unsettled = sum(1 for item in items if item.net_balance != 0)

        balance_score = (
            (members - unsettled) / members * 100 if members else 100.0
        )
        settlement_score = max(0.0, 100.0 - open_settlements * 20)
        if open_settlements == 0 and unsettled == 0:
            settlement_score = 100.0

        if recent_expenses > 0:
            activity_score = min(100.0, 30.0 + recent_expenses * 15.0)
        elif total_expenses > 0:
            activity_score = 20.0
        else:
            activity_score = 0.0

        factors = [
            HealthFactor(
                key="balance",
                label="Balances are evenly settled",
                score=round(balance_score, 1),
                weight=WEIGHTS["balance"],
                description=(
                    f"{members - unsettled} of {members} member(s) "
                    f"have no outstanding balance."
                ),
            ),
            HealthFactor(
                key="settlement",
                label="No pending settlements",
                score=round(settlement_score, 1),
                weight=WEIGHTS["settlement"],
                description=(
                    f"{open_settlements} pending settlement(s) recorded."
                ),
            ),
            HealthFactor(
                key="activity",
                label="Expenses tracked recently",
                score=round(activity_score, 1),
                weight=WEIGHTS["activity"],
                description=(
                    f"{recent_expenses} expense(s) in the last 30 days, "
                    f"{total_expenses} total."
                ),
            ),
        ]

        score = round(
            sum(factor.score * factor.weight for factor in factors)
        )
        label = self._label(score)
        main_reason = min(factors, key=lambda f: f.score).description
        suggested_action = self._suggested_action(
            unsettled, open_settlements, recent_expenses, total_expenses
        )
        explanation = (
            f"Your group is {label.lower()} with a health score of {score}/100. "
            f"{main_reason} {suggested_action}"
        )

        return GroupHealthOut(
            group_id=group.id,
            group_name=group.name,
            score=score,
            label=label,
            explanation=explanation,
            main_reason=main_reason,
            suggested_action=suggested_action,
            factors=factors,
        )

    # ------------------------------------------------------------------ helpers

    @staticmethod
    def _label(score: float) -> str:
        for threshold, name in LABEL_THRESHOLDS:
            if score >= threshold:
                return name
        return "Needs attention"

    @staticmethod
    def _suggested_action(
        unsettled: int,
        open_settlements: int,
        recent_expenses: int,
        total_expenses: int,
    ) -> str:
        if unsettled > 0:
            return (
                "Open the Balances page to settle outstanding amounts with the "
                "optimized settlement suggestions."
            )
        if open_settlements > 0:
            return "Confirm the pending settlements to clear outstanding balances."
        if recent_expenses == 0 and total_expenses > 0:
            return "Add recent expenses so balances stay up to date."
        if total_expenses == 0:
            return "Add the first expense to start tracking the group's spending."
        return "Keep tracking expenses as usual to keep your group in great shape."
