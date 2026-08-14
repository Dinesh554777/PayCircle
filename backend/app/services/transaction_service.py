from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models.group import Group
from app.models.transaction import Transaction
from app.services.base import BaseService


class TransactionService(BaseService[Transaction]):
    def __init__(self, db: Session) -> None:
        super().__init__(db, Transaction)

    def list_group_transactions(self, group_id: int) -> list[Transaction]:
        group = self.db.get(Group, group_id)
        if group is None:
            raise HTTPException(status_code=404, detail="Group not found")
        return (
            self.db.query(Transaction)
            .filter(Transaction.group_id == group.id)
            .order_by(Transaction.created_at.desc())
            .all()
        )
