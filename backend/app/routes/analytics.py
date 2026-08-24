from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.schemas.analytics import AnalyticsOut
from app.services.analytics_service import AnalyticsService

router = APIRouter()


@router.get("", response_model=AnalyticsOut)
def get_analytics(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Real spending analytics for the authenticated user (used by dashboards)."""
    return AnalyticsService(db).summary(current_user)
