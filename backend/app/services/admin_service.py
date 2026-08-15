from decimal import Decimal

from fastapi import HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.expense import Expense
from app.models.expense_split import ExpenseSplit
from app.models.group import Group
from app.models.group_member import GroupMember
from app.models.settlement import Settlement
from app.models.transaction import Transaction
from app.models.user import User
from app.schemas.admin import AdminGroupRead, AdminUserRead, SystemStatsOut


class AdminService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def _groups_count(self, user_id: int) -> int:
        return (
            self.db.query(func.count(GroupMember.id))
            .filter(GroupMember.user_id == user_id)
            .scalar()
            or 0
        )

    def _expenses_count(self, user_id: int) -> int:
        return (
            self.db.query(func.count(ExpenseSplit.id))
            .filter(ExpenseSplit.user_id == user_id)
            .scalar()
            or 0
        )

    def list_users(self) -> list[AdminUserRead]:
        users = self.db.query(User).order_by(User.created_at.desc()).all()
        groups_by_user = dict(
            self.db.query(GroupMember.user_id, func.count(GroupMember.id))
            .group_by(GroupMember.user_id)
            .all()
        )
        expenses_by_user = dict(
            self.db.query(ExpenseSplit.user_id, func.count(ExpenseSplit.id))
            .group_by(ExpenseSplit.user_id)
            .all()
        )
        return [
            AdminUserRead(
                id=user.id,
                name=user.name,
                email=user.email,
                is_admin=user.is_admin,
                is_active=user.is_active,
                created_at=user.created_at,
                groups_count=groups_by_user.get(user.id, 0),
                expenses_count=expenses_by_user.get(user.id, 0),
            )
            for user in users
        ]

    def list_groups(self) -> list[AdminGroupRead]:
        groups = self.db.query(Group).order_by(Group.created_at.desc()).all()
        members_by_group = dict(
            self.db.query(GroupMember.group_id, func.count(GroupMember.id))
            .group_by(GroupMember.group_id)
            .all()
        )
        expenses_by_group = dict(
            self.db.query(Expense.group_id, func.count(Expense.id))
            .group_by(Expense.group_id)
            .all()
        )
        result = []
        for group in groups:
            result.append(
                AdminGroupRead(
                    id=group.id,
                    name=group.name,
                    description=group.description,
                    created_by=group.created_by,
                    created_at=group.created_at,
                    member_count=members_by_group.get(group.id, 0),
                    expense_count=expenses_by_group.get(group.id, 0),
                )
            )
        return result

    def system_stats(self) -> SystemStatsOut:
        total_users = self.db.query(func.count(User.id)).scalar() or 0
        active_users = (
            self.db.query(func.count(User.id)).filter(User.is_active.is_(True)).scalar()
            or 0
        )
        total_groups = self.db.query(func.count(Group.id)).scalar() or 0
        total_expenses = self.db.query(func.count(Expense.id)).scalar() or 0
        total_settlements = self.db.query(func.count(Settlement.id)).scalar() or 0
        total_transactions = self.db.query(func.count(Transaction.id)).scalar() or 0
        total_amount_spent = (
            self.db.query(func.coalesce(func.sum(Expense.amount), Decimal("0")))
            .scalar()
            or Decimal("0")
        )
        return SystemStatsOut(
            total_users=total_users,
            active_users=active_users,
            total_groups=total_groups,
            total_expenses=total_expenses,
            total_settlements=total_settlements,
            total_transactions=total_transactions,
            total_amount_spent=total_amount_spent,
        )

    def set_user_active(self, user_id: int, is_active: bool, actor: User) -> AdminUserRead:
        if user_id == actor.id:
            raise HTTPException(
                status_code=400, detail="You cannot disable your own account"
            )
        user = self.db.get(User, user_id)
        if user is None:
            raise HTTPException(status_code=404, detail="User not found")
        user.is_active = is_active
        self.db.commit()
        self.db.refresh(user)
        return AdminUserRead(
            id=user.id,
            name=user.name,
            email=user.email,
            is_admin=user.is_admin,
            is_active=user.is_active,
            created_at=user.created_at,
            groups_count=self._groups_count(user.id),
            expenses_count=self._expenses_count(user.id),
        )
