"""Smart Settlement Optimizer.

Reduces a group's outstanding balances to the minimum practical number of
settlements: instead of many arbitrary payments, it pairs debtors with
creditors so every debt is cleared in at most ``members - 1`` payments.

The optimization is pure Python/Decimal arithmetic — no AI is used for the
deterministic balance math.
"""
from __future__ import annotations

from decimal import Decimal
from typing import Iterable

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models.user import User
from app.schemas.balance import BalanceItem
from app.schemas.settlement_optimizer import (
    SettlementSuggestion,
    SettlementSuggestionOut,
)
from app.services.balance_service import BalanceService
from app.services.group_service import GroupService


class SettlementOptimizerService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.groups = GroupService(db)
        self.balances = BalanceService(db)

    # ------------------------------------------------------------------ logic

    @staticmethod
    def optimize_transfers(
        balances: Iterable[BalanceItem],
    ) -> list[tuple[int, int, Decimal]]:
        """Greedy netting of balances into (debtor_id, creditor_id, amount).

        Members with a zero net balance are skipped entirely. Each returned
        tuple means "debtor pays amount to creditor". The pairing clears all
        debts with at most (members_with_nonzero_balance - 1) payments.
        """
        debtors = sorted(
            (
                (item.user_id, -item.net_balance)
                for item in balances
                if item.net_balance < 0
            ),
            key=lambda pair: -pair[1],
        )
        creditors = sorted(
            (
                (item.user_id, item.net_balance)
                for item in balances
                if item.net_balance > 0
            ),
            key=lambda pair: -pair[1],
        )

        transfers: list[tuple[int, int, Decimal]] = []
        while debtors and creditors:
            debtor, debt = debtors.pop(0)
            creditor, credit = creditors.pop(0)
            amount = min(debt, credit)
            transfers.append((debtor, creditor, amount))
            if debt > amount:
                debtors.insert(0, (debtor, debt - amount))
            if credit > amount:
                creditors.insert(0, (creditor, credit - amount))
        return transfers

    # ------------------------------------------------------------------ view

    def get_suggestions(self, group_id: int, actor: User) -> SettlementSuggestionOut:
        group = self.groups.get_group_for_user(group_id, actor)
        balances = self.balances.get_balances(group_id, actor)

        transfers = self.optimize_transfers(balances.balances)
        users = {item.user_id: item.user for item in balances.balances}

        suggestions = [
            SettlementSuggestion(
                payer_id=debtor,
                payer=users.get(debtor),
                receiver_id=creditor,
                receiver=users.get(creditor),
                amount=amount,
            )
            for debtor, creditor, amount in transfers
        ]

        total = sum((amount for _, _, amount in transfers), Decimal("0.00"))
        return SettlementSuggestionOut(
            group_id=group.id,
            group_name=group.name,
            suggestions=suggestions,
            payment_count=len(suggestions),
            total_amount=total,
            settled_up=not suggestions,
        )
