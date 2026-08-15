from decimal import ROUND_DOWN, Decimal

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.ai.categorization import GroqCategorizer
from app.models.expense import Expense
from app.models.expense_split import ExpenseSplit
from app.models.group import Group
from app.models.group_member import GroupMember
from app.models.transaction import Transaction
from app.models.user import User
from app.services.activity_service import ActivityService, ActivityType
from app.services.base import BaseService
from app.services.balance_service import BalanceService
from app.services.group_service import GroupService
from app.services.notification_service import NotificationService, NotificationType


class ExpenseService(BaseService[Expense]):
    def __init__(self, db: Session, categorizer: GroqCategorizer | None = None) -> None:
        super().__init__(db, Expense)
        self.groups = GroupService(db)
        self.balances = BalanceService(db)
        self.notifications = NotificationService(db)
        self.activities = ActivityService(db)
        self.categorizer = categorizer or GroqCategorizer()

    def _resolve_category(self, data) -> tuple[str | None, str | None, float | None]:
        """Return (category, ai_category, ai_confidence) for a new expense."""
        if data.category:
            return data.category, None, None
        if not getattr(data, "auto_categorize", True):
            return None, None, None
        text = f"{data.title} {data.description or ''}".strip()
        try:
            result = self.categorizer.categorize(text)
        except Exception:
            return None, None, None
        if result.ai_generated:
            return result.category, result.category, result.confidence
        return result.category, None, None

    def _member_ids(self, group: Group) -> set[int]:
        rows = self.db.query(GroupMember).filter(GroupMember.group_id == group.id).all()
        return {row.user_id for row in rows}

    def _require_member(self, user_id: int, member_ids: set[int]) -> None:
        if user_id not in member_ids:
            raise HTTPException(
                status_code=400,
                detail=f"User {user_id} is not a member of this group",
            )

    @staticmethod
    def _allocate(amount: Decimal, weights: list[Decimal]) -> list[Decimal]:
        """Distribute an amount by weights, rounding to cents with total preserved."""
        total_weight = sum(weights, Decimal("0"))
        if total_weight <= 0:
            raise HTTPException(
                status_code=400, detail="Split weights must be positive"
            )
        shares = [
            (amount * weight / total_weight).quantize(
                Decimal("0.01"), rounding=ROUND_DOWN
            )
            for weight in weights
        ]
        remainder_cents = int(
            ((amount - sum(shares, Decimal("0"))) * 100).quantize(Decimal("1"))
        )
        index = 0
        while remainder_cents > 0 and index < len(shares):
            shares[index] += Decimal("0.01")
            remainder_cents -= 1
            index += 1
        return shares

    def compute_splits(self, data, member_ids: set[int]) -> list[tuple[int, Decimal]]:
        if data.paid_by not in member_ids:
            raise HTTPException(
                status_code=400, detail="Payer is not a member of this group"
            )

        if data.split_method == "equal":
            participants = list(dict.fromkeys(data.participants)) if data.participants else sorted(member_ids)
            if not participants:
                raise HTTPException(
                    status_code=400, detail="Group has no members to split with"
                )
            for pid in participants:
                self._require_member(pid, member_ids)
            amounts = self._allocate(data.amount, [Decimal("1")] * len(participants))
            return list(zip(participants, amounts))

        if data.split_method == "exact":
            if not data.exact_amounts:
                raise HTTPException(
                    status_code=400, detail="exact_amounts are required for an exact split"
                )
            seen: set[int] = set()
            for item in data.exact_amounts:
                self._require_member(item.user_id, member_ids)
                if item.user_id in seen:
                    raise HTTPException(
                        status_code=400, detail="Duplicate user in exact split"
                    )
                seen.add(item.user_id)
            total = sum((item.amount for item in data.exact_amounts), Decimal("0"))
            if total != data.amount:
                raise HTTPException(
                    status_code=400,
                    detail="Split amounts must equal the expense amount",
                )
            return [(item.user_id, item.amount) for item in data.exact_amounts]

        if data.split_method == "percentage":
            if not data.percentages:
                raise HTTPException(
                    status_code=400, detail="percentages are required for a percentage split"
                )
            seen = set()
            for item in data.percentages:
                self._require_member(item.user_id, member_ids)
                if item.user_id in seen:
                    raise HTTPException(
                        status_code=400, detail="Duplicate user in percentage split"
                    )
                seen.add(item.user_id)
            total_pct = sum((item.percentage for item in data.percentages), Decimal("0"))
            if total_pct != Decimal("100"):
                raise HTTPException(
                    status_code=400, detail="Percentages must sum to 100"
                )
            amounts = self._allocate(
                data.amount, [item.percentage for item in data.percentages]
            )
            return [
                (item.user_id, amount)
                for item, amount in zip(data.percentages, amounts)
            ]

        raise HTTPException(status_code=400, detail="Unsupported split method")

    def _build(self, group: Group, data, computed: list[tuple[int, Decimal]]) -> Expense:
        category, ai_category, ai_confidence = self._resolve_category(data)
        return Expense(
            group_id=group.id,
            payer_id=data.paid_by,
            title=data.title,
            description=data.description,
            amount=data.amount,
            category=category,
            ai_category=ai_category,
            ai_confidence=ai_confidence,
            split_method=data.split_method,
            paid_at=data.expense_date,
        )

    def create_expense(self, group_id: int, data, actor: User) -> Expense:
        group = self.groups.get_group_for_user(group_id, actor)
        member_ids = self._member_ids(group)
        computed = self.compute_splits(data, member_ids)

        expense = self._build(group, data, computed)
        for user_id, amount in computed:
            expense.splits.append(ExpenseSplit(user_id=user_id, amount=amount))

        self.db.add(expense)
        self.db.commit()
        self.db.refresh(expense)

        self.db.add(
            Transaction(
                group_id=group.id,
                user_id=data.paid_by,
                type="expense",
                amount=data.amount,
                description=f"Expense: {data.title}",
            )
        )
        self.activities.record(
            actor.id,
            ActivityType.EXPENSE_ADDED,
            f"You added expense '{data.title}' of ₹{data.amount:,.2f} in group '{group.name}'.",
            group_id=group.id,
            related_id=expense.id,
        )
        self._notify_expense_added(group, expense, actor)
        self._notify_payment_reminders(group, actor)
        self.db.commit()
        return expense

    def _notify_expense_added(self, group: Group, expense: Expense, actor: User) -> None:
        payer = self.db.get(User, expense.payer_id)
        payer_name = payer.name if payer else actor.name
        title = "New expense"
        message = (
            f"{payer_name} added expense '{expense.title}' of "
            f"₹{expense.amount:,.2f} in group '{group.name}'."
        )
        for member_id in self._member_ids(group):
            if member_id == expense.payer_id:
                continue
            self.notifications.create_notification(
                member_id,
                NotificationType.EXPENSE_ADDED,
                title,
                message,
                group_id=group.id,
                related_id=expense.id,
            )

    def _notify_payment_reminders(self, group: Group, actor: User) -> None:
        try:
            balances = self.balances.get_balances(group.id, actor)
        except HTTPException:
            return
        for item in balances.balances:
            if item.net_balance >= 0:
                continue
            if item.user_id == actor.id:
                continue
            if self.notifications.has_unread(
                item.user_id, NotificationType.REMINDER, group.id
            ):
                continue
            self.notifications.create_notification(
                item.user_id,
                NotificationType.REMINDER,
                "Payment reminder",
                f"You owe ₹{abs(item.net_balance):,.2f} in group '{group.name}'. "
                "Consider settling up.",
                group_id=group.id,
                related_id=group.id,
            )

    def list_group_expenses(self, group_id: int, actor: User) -> list[Expense]:
        self.groups.get_group_for_user(group_id, actor)
        return (
            self.db.query(Expense)
            .filter(Expense.group_id == group_id)
            .order_by(Expense.created_at.desc(), Expense.id.desc())
            .all()
        )

    def get_group_expense(self, group_id: int, expense_id: int, actor: User) -> Expense:
        self.groups.get_group_for_user(group_id, actor)
        expense = self.db.get(Expense, expense_id)
        if expense is None or expense.group_id != group_id:
            raise HTTPException(status_code=404, detail="Expense not found")
        return expense

    def update_expense(self, group_id: int, expense_id: int, data, actor: User) -> Expense:
        group = self.groups.get_group_for_user(group_id, actor)
        expense = self.get_group_expense(group_id, expense_id, actor)
        member_ids = self._member_ids(group)
        computed = self.compute_splits(data, member_ids)

        expense.payer_id = data.paid_by
        expense.title = data.title
        expense.description = data.description
        expense.amount = data.amount
        expense.category = data.category
        if data.category != expense.ai_category:
            expense.ai_category = None
            expense.ai_confidence = None
        expense.split_method = data.split_method
        expense.paid_at = data.expense_date

        self.db.query(ExpenseSplit).filter(ExpenseSplit.expense_id == expense.id).delete()
        for user_id, amount in computed:
            expense.splits.append(ExpenseSplit(user_id=user_id, amount=amount))

        self.activities.record(
            actor.id,
            ActivityType.EXPENSE_EDITED,
            f"You edited expense '{expense.title}' in group '{group.name}'.",
            group_id=group.id,
            related_id=expense.id,
        )
        self.db.commit()
        self.db.refresh(expense)
        return expense

    def delete_expense(self, group_id: int, expense_id: int, actor: User) -> None:
        group = self.groups.get_group_for_user(group_id, actor)
        expense = self.get_group_expense(group_id, expense_id, actor)
        self.activities.record(
            actor.id,
            ActivityType.EXPENSE_DELETED,
            f"You deleted expense '{expense.title}' from group '{group.name}'.",
            group_id=group_id,
            related_id=expense.id,
        )
        self.db.query(ExpenseSplit).filter(ExpenseSplit.expense_id == expense.id).delete()
        self.db.delete(expense)
        self.db.commit()

    def calculate_splits(self, group_id: int, data, actor: User) -> list[tuple[int, Decimal]]:
        group = self.groups.get_group_for_user(group_id, actor)
        member_ids = self._member_ids(group)
        return self.compute_splits(data, member_ids)
