from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.schemas.notification import (
    NotificationListOut,
    NotificationRead,
    UnreadCountOut,
)
from app.services.notification_service import NotificationService

router = APIRouter()


@router.get("", response_model=NotificationListOut)
def list_notifications(
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    notifications, total, unread_count = NotificationService(db).list_for_user(
        current_user.id, limit=limit, offset=offset
    )
    return {
        "notifications": notifications,
        "total": total,
        "unread_count": unread_count,
    }


@router.get("/unread-count", response_model=UnreadCountOut)
def unread_count(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return {
        "unread_count": NotificationService(db).unread_count(current_user.id)
    }


@router.post("/read-all", response_model=UnreadCountOut)
def mark_all_read(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    NotificationService(db).mark_all_read(current_user.id)
    return {"unread_count": 0}


@router.patch("/{notification_id}/read", response_model=NotificationRead)
def mark_read(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return NotificationService(db).mark_read(current_user.id, notification_id)
