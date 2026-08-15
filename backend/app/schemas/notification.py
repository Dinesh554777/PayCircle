from datetime import datetime

from pydantic import BaseModel, ConfigDict


class NotificationRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    type: str
    title: str
    message: str | None = None
    group_id: int | None = None
    related_id: int | None = None
    is_read: bool
    read_at: datetime | None = None
    created_at: datetime


class NotificationListOut(BaseModel):
    notifications: list[NotificationRead]
    total: int
    unread_count: int


class UnreadCountOut(BaseModel):
    unread_count: int
