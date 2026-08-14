from decimal import Decimal

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models.expense import Expense
from app.models.expense_split import ExpenseSplit
from app.models.group import Group
from app.models.group_member import GroupMember
from app.models.transaction import Transaction
from app.models.user import User
from app.schemas.expense import ExpenseCreate
from app.services.base import BaseService


class ExpenseService(BaseService[Expense]):
    def __init__(self, db: Session) -> None:
        super().__init__(db, Expense)

    def _member_ids(self, group: Group) -> set[int]:
        rows = self.db.query(GroupMember).filter(GroupMember.group_id == group.id).all()
        return {row.user_id for row in rows}

    def create_expense(self, group_id: int, data: ExpenseCreate) -> Expense:
        group = self.db.get(Group, group_id)
        if group is None:
            raise HTTPException(status_code=404, detail="Group not found")

        member_ids = self._member_ids(group)
        if data.payer_id not in member_ids:
            raise HTTPException(
                status_code=400, detail="Payer is not a member of this group"
            )
        for split in data.splits:
            if split.user_id not in member_ids:
                raise HTTPException(
                    status_code=400,
                    detail=f"User {split.user_id} is not a member of this group",
                )

        total = sum((split.amount for split in data.splits), Decimal("0"))
        if total != data.amount:
            raise HTTPException(
                status_code=400, detail="Split amounts must equal the expense amount"
            )

        expense = Expense(
            group_id=group.id,
            payer_id=data.payer_id,
            description=data.description,
            amount=data.amount,
            paid_at=data.paid_at,
        )
        for split in data.splits:
            expense.splits.append(ExpenseSplit(user_id=split.user_id, amount=split.amount))

        self.db.add(expense)
        self.db.commit()
        self.db.refresh(expense)

        self.db.add(
            Transaction(
                group_id=group.id,
                user_id=data.payer_id,
                type="expense",
                amount=data.amount,
                description=f"Expense: {data.description}",
            )
        )
        self.db.commit()
        return expense

    def list_group_expenses(self, group_id: int) -> list[Expense]:
        group = self.db.get(Group, group_id)
        if group is None:
            raise HTTPException(status_code=404, detail="Group not found")
        return (
            self.db.query(Expense)
            .filter(Expense.group_id == group.id)
            .order_by(Expense.created_at.desc())
            .all()
        )
