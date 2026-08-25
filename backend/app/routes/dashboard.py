from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.schemas.dashboard import DashboardOut
from app.services.dashboard_service import DashboardService

router = APIRouter()


@router.get("", response_model=DashboardOut)
def get_dashboard(
    group_id: int | None = Query(None, description="Filter dashboard to a specific group"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return DashboardService(db).get_dashboard(current_user, group_id=group_id)
