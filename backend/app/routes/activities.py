from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.schemas.activity import ActivityRead
from app.services.activity_service import ActivityService

router = APIRouter()


@router.get("/groups/{group_id}/activities", response_model=list[ActivityRead])
def list_group_activities(
    group_id: int,
    limit: int = Query(default=50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return ActivityService(db).list_for_group(group_id, current_user, limit=limit)


@router.get("/activities", response_model=list[ActivityRead])
def list_my_activities(
    limit: int = Query(default=50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return ActivityService(db).list_for_user(current_user, limit=limit)
