from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models.group import Group
from app.models.group_member import GroupMember
from app.models.settlement import Settlement
from app.models.transaction import Transaction
from app.models.user import User
from app.schemas.settlement import SettlementCreate
from app.services.base import BaseService


class SettlementService(BaseService[Settlement]):
    def __init__(self, db: Session) -> None:
        super().__init__(db, Settlement)

    def create_settlement(self, group_id: int, data: SettlementCreate) -> Settlement:
        group = self.db.get(Group, group_id)
        if group is None:
            raise HTTPException(status_code=404, detail="Group not found")

        member_ids = {
            row.user_id
            for row in self.db.query(GroupMember).filter(GroupMember.group_id == group.id).all()
        }
        if data.payer_id not in member_ids or data.receiver_id not in member_ids:
            raise HTTPException(
                status_code=400, detail="Both users must be members of this group"
            )
        if data.payer_id == data.receiver_id:
            raise HTTPException(
                status_code=400, detail="Payer and receiver must be different users"
            )

        settlement = Settlement(
            group_id=group.id,
            payer_id=data.payer_id,
            receiver_id=data.receiver_id,
            amount=data.amount,
        )
        self.db.add(settlement)
        self.db.commit()
        self.db.refresh(settlement)

        payer = self.db.get(User, data.payer_id)
        self.db.add(
            Transaction(
                group_id=group.id,
                user_id=data.payer_id,
                type="settlement",
                amount=data.amount,
                description=f"Settlement from {payer.name}",
            )
        )
        self.db.commit()
        return settlement

    def list_group_settlements(self, group_id: int) -> list[Settlement]:
        group = self.db.get(Group, group_id)
        if group is None:
            raise HTTPException(status_code=404, detail="Group not found")
        return (
            self.db.query(Settlement)
            .filter(Settlement.group_id == group.id)
            .order_by(Settlement.settled_at.desc())
            .all()
        )
