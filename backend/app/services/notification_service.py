from datetime import datetime, timezone

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models.notification import Notification
from app.services.base import BaseService


class NotificationType:
    ADDED_TO_GROUP = "added_to_group"
    EXPENSE_ADDED = "expense_added"
    SETTLEMENT_RECORDED = "settlement_recorded"
    REMINDER = "reminder"
    GROUP_ACTIVITY = "group_activity"


class NotificationService(BaseService[Notification]):
    def __init__(self, db: Session) -> None:
        super().__init__(db, Notification)

    def create_notification(
        self,
        user_id: int,
        type: str,
        title: str,
        message: str | None = None,
        group_id: int | None = None,
        related_id: int | None = None,
    ) -> Notification:
        notification = Notification(
            user_id=user_id,
            type=type,
            title=title,
            message=message,
            group_id=group_id,
            related_id=related_id,
        )
        self.db.add(notification)
        return notification

    def list_for_user(
        self, user_id: int, limit: int = 50, offset: int = 0
    ) -> tuple[list[Notification], int, int]:
        query = self.db.query(Notification).filter(Notification.user_id == user_id)
        total = query.count()
        unread_count = query.filter(Notification.is_read.is_(False)).count()
        notifications = (
            query.order_by(Notification.created_at.desc(), Notification.id.desc())
            .offset(offset)
            .limit(limit)
            .all()
        )
        return notifications, total, unread_count

    def unread_count(self, user_id: int) -> int:
        return (
            self.db.query(Notification)
            .filter(Notification.user_id == user_id, Notification.is_read.is_(False))
            .count()
        )

    def has_unread(self, user_id: int, type: str, group_id: int) -> bool:
        return (
            self.db.query(Notification)
            .filter(
                Notification.user_id == user_id,
                Notification.type == type,
                Notification.group_id == group_id,
                Notification.is_read.is_(False),
            )
            .first()
            is not None
        )

    def mark_read(self, user_id: int, notification_id: int) -> Notification:
        notification = self.db.get(Notification, notification_id)
        if notification is None or notification.user_id != user_id:
            raise HTTPException(status_code=404, detail="Notification not found")
        if not notification.is_read:
            notification.is_read = True
            notification.read_at = datetime.now(timezone.utc)
            self.db.commit()
            self.db.refresh(notification)
        return notification

    def mark_all_read(self, user_id: int) -> int:
        updated = (
            self.db.query(Notification)
            .filter(Notification.user_id == user_id, Notification.is_read.is_(False))
            .update({Notification.is_read: True, Notification.read_at: datetime.now(timezone.utc)})
        )
        self.db.commit()
        return updated
