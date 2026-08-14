from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models.group_member import GroupMember
from app.models.settlement import Settlement
from app.models.transaction import Transaction
from app.models.user import User
from app.schemas.settlement import SettlementCreate, SettlementUpdate
from app.services.base import BaseService
from app.services.group_service import GroupService


class SettlementService(BaseService[Settlement]):
    def __init__(self, db: Session) -> None:
        super().__init__(db, Settlement)
        self.groups = GroupService(db)

    def _member_ids(self, group_id: int) -> set[int]:
        rows = (
            self.db.query(GroupMember).filter(GroupMember.group_id == group_id).all()
        )
        return {row.user_id for row in rows}

    def create_settlement(
        self, group_id: int, data: SettlementCreate, actor: User
    ) -> Settlement:
        self.groups.get_group_for_user(group_id, actor)
        member_ids = self._member_ids(group_id)

        if data.payer_id not in member_ids or data.receiver_id not in member_ids:
            raise HTTPException(
                status_code=400, detail="Both users must be members of this group"
            )
        if data.payer_id == data.receiver_id:
            raise HTTPException(
                status_code=400, detail="Payer and receiver must be different users"
            )

        settlement = Settlement(
            group_id=group_id,
            payer_id=data.payer_id,
            receiver_id=data.receiver_id,
            amount=data.amount,
            status="pending",
        )
        if data.settlement_date is not None:
            settlement.settled_at = data.settlement_date
        self.db.add(settlement)
        self.db.commit()
        self.db.refresh(settlement)
        return settlement

    def list_group_settlements(self, group_id: int, actor: User) -> list[Settlement]:
        self.groups.get_group_for_user(group_id, actor)
        return (
            self.db.query(Settlement)
            .filter(Settlement.group_id == group_id)
            .order_by(Settlement.settled_at.desc())
            .all()
        )

    def update_settlement(
        self, group_id: int, settlement_id: int, data: SettlementUpdate, actor: User
    ) -> Settlement:
        self.groups.get_group_for_user(group_id, actor)
        settlement = self.db.get(Settlement, settlement_id)
        if settlement is None or settlement.group_id != group_id:
            raise HTTPException(status_code=404, detail="Settlement not found")

        if settlement.status == "completed" and data.status == "completed":
            raise HTTPException(
                status_code=400, detail="Settlement is already completed"
            )

        settlement.status = data.status
        self.db.commit()
        self.db.refresh(settlement)

        if data.status == "completed":
            payer = self.db.get(User, settlement.payer_id)
            self.db.add(
                Transaction(
                    group_id=group_id,
                    user_id=settlement.payer_id,
                    type="settlement",
                    amount=settlement.amount,
                    description=f"Settlement from {payer.name if payer else 'member'}",
                )
            )
            self.db.commit()
        return settlement
