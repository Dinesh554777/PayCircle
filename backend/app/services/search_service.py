"""Reusable search across the authenticated user's expenses, groups, and transactions."""
from decimal import Decimal

from fastapi import HTTPException
from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from app.models.expense import Expense
from app.models.group import Group
from app.models.group_member import GroupMember
from app.models.transaction import Transaction
from app.models.user import User
from app.schemas.search import (
    SearchExpenseItem,
    SearchGroupItem,
    SearchResults,
    SearchTransactionItem,
)

EXPENSES_LIMIT = 20
GROUPS_LIMIT = 10
TRANSACTIONS_LIMIT = 20

MIN_QUERY_LENGTH = 1
MAX_QUERY_LENGTH = 100


class SearchService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def search(self, query: str, user: User) -> SearchResults:
        query = (query or "").strip()
        if len(query) < MIN_QUERY_LENGTH or len(query) > MAX_QUERY_LENGTH:
            raise HTTPException(
                status_code=422,
                detail=f"Search query must be between {MIN_QUERY_LENGTH} and {MAX_QUERY_LENGTH} characters",
            )

        group_ids = [
            row.group_id
            for row in (
                self.db.query(GroupMember)
                .filter(GroupMember.user_id == user.id)
                .all()
            )
        ]

        return SearchResults(
            query=query,
            groups=self._search_groups(query, group_ids),
            expenses=self._search_expenses(query, group_ids),
            transactions=self._search_transactions(query, group_ids),
        )

    def _search_groups(self, query: str, group_ids: list[int]) -> list[SearchGroupItem]:
        if not group_ids:
            return []
        pattern = f"%{query}%"
        groups = (
            self.db.query(Group)
            .filter(
                Group.id.in_(group_ids),
                or_(
                    Group.name.ilike(pattern),
                    Group.description.ilike(pattern),
                ),
            )
            .order_by(Group.created_at.desc())
            .limit(GROUPS_LIMIT)
            .all()
        )
        if not groups:
            return []

        counts = dict(
            self.db.query(GroupMember.group_id, func.count(GroupMember.id))
            .filter(GroupMember.group_id.in_([group.id for group in groups]))
            .group_by(GroupMember.group_id)
            .all()
        )
        return [
            SearchGroupItem(
                id=group.id,
                name=group.name,
                description=group.description,
                member_count=counts.get(group.id, 0),
                created_at=group.created_at,
            )
            for group in groups
        ]

    def _search_expenses(
        self, query: str, group_ids: list[int]
    ) -> list[SearchExpenseItem]:
        if not group_ids:
            return []
        pattern = f"%{query}%"
        expenses = (
            self.db.query(Expense)
            .filter(
                Expense.group_id.in_(group_ids),
                or_(
                    Expense.title.ilike(pattern),
                    Expense.description.ilike(pattern),
                    Expense.category.ilike(pattern),
                ),
            )
            .order_by(Expense.created_at.desc())
            .limit(EXPENSES_LIMIT)
            .all()
        )
        return [
            SearchExpenseItem(
                id=expense.id,
                title=expense.title or "Expense",
                description=expense.description,
                amount=expense.amount,
                category=expense.category or expense.ai_category,
                date=expense.paid_at or expense.created_at,
                group_id=expense.group_id,
                group_name=expense.group.name if expense.group else "Group",
            )
            for expense in expenses
        ]

    def _search_transactions(
        self, query: str, group_ids: list[int]
    ) -> list[SearchTransactionItem]:
        if not group_ids:
            return []
        pattern = f"%{query}%"
        transactions = (
            self.db.query(Transaction)
            .filter(
                Transaction.group_id.in_(group_ids),
                or_(
                    Transaction.description.ilike(pattern),
                    Transaction.type.ilike(pattern),
                ),
            )
            .order_by(Transaction.created_at.desc())
            .limit(TRANSACTIONS_LIMIT)
            .all()
        )
        return [
            SearchTransactionItem(
                id=transaction.id,
                type=transaction.type,
                amount=Decimal(str(transaction.amount)) if transaction.amount else Decimal("0.00"),
                description=transaction.description,
                date=transaction.created_at,
                group_id=transaction.group_id,
                group_name=transaction.group.name if transaction.group else "Group",
            )
            for transaction in transactions
        ]
