from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models.group import Group
from app.models.group_member import GroupMember
from app.models.settlement import Settlement
from app.models.transaction import Transaction
from app.models.user import User
from app.schemas.settlement import SettlementCreate, SettlementUpdate
from app.services.activity_service import ActivityService, ActivityType
from app.services.base import BaseService
from app.services.balance_service import BalanceService
from app.services.group_service import GroupService
from app.services.notification_service import NotificationService, NotificationType


class SettlementService(BaseService[Settlement]):
    def __init__(self, db: Session) -> None:
        super().__init__(db, Settlement)
        self.groups = GroupService(db)
        self.balances = BalanceService(db)
        self.notifications = NotificationService(db)
        self.activities = ActivityService(db)

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
        self._notify_settlement_recorded(settlement, actor)
        self.activities.record(
            actor.id,
            ActivityType.SETTLEMENT_CREATED,
            f"You recorded a ₹{settlement.amount:,.2f} settlement.",
            group_id=group_id,
            related_id=settlement.id,
        )
        self.db.commit()
        self.db.refresh(settlement)
        return settlement

    def _notify_settlement_recorded(self, settlement: Settlement, actor: User) -> None:
        payer = self.db.get(User, settlement.payer_id)
        receiver = self.db.get(User, settlement.receiver_id)
        payer_name = payer.name if payer else actor.name
        group_name = self._group_name(settlement.group_id)
        if receiver is not None:
            self.notifications.create_notification(
                receiver.id,
                NotificationType.SETTLEMENT_RECORDED,
                "Settlement recorded",
                f"{payer_name} recorded a pending settlement of "
                f"₹{settlement.amount:,.2f} with you in group '{group_name}'.",
                group_id=settlement.group_id,
                related_id=settlement.id,
            )

    def _group_name(self, group_id: int) -> str:
        group = self.db.get(Group, group_id)
        return group.name if group else "Group"

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
            receiver = self.db.get(User, settlement.receiver_id)
            self.db.add(
                Transaction(
                    group_id=group_id,
                    user_id=settlement.payer_id,
                    type="settlement",
                    amount=settlement.amount,
                    description=f"Settlement from {payer.name if payer else 'member'}",
                )
            )
            if receiver is not None:
                group_name = self._group_name(group_id)
                self.notifications.create_notification(
                    receiver.id,
                    NotificationType.SETTLEMENT_RECORDED,
                    "Settlement completed",
                    f"{payer.name if payer else 'A member'} completed a settlement of "
                    f"₹{settlement.amount:,.2f} with you in group '{group_name}'.",
                    group_id=group_id,
                    related_id=settlement.id,
                )
            self._notify_remaining_debt(settlement, actor)
            self.activities.record(
                actor.id,
                ActivityType.SETTLEMENT_COMPLETED,
                f"You completed a ₹{settlement.amount:,.2f} settlement.",
                group_id=group_id,
                related_id=settlement.id,
            )
            self.db.commit()
        return settlement

    def _notify_remaining_debt(self, settlement: Settlement, actor: User) -> None:
        try:
            balances = self.balances.get_balances(settlement.group_id, actor)
        except HTTPException:
            return
        for item in balances.balances:
            if item.user_id != settlement.payer_id:
                continue
            if item.net_balance >= 0:
                continue
            if self.notifications.has_unread(
                settlement.payer_id, NotificationType.REMINDER, settlement.group_id
            ):
                continue
            group_name = self._group_name(settlement.group_id)
            self.notifications.create_notification(
                settlement.payer_id,
                NotificationType.REMINDER,
                "Payment reminder",
                f"You still owe ₹{abs(item.net_balance):,.2f} in group '{group_name}'. "
                "Consider settling up.",
                group_id=settlement.group_id,
                related_id=settlement.id,
            )
