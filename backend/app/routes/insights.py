from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.schemas.insights import SpendingInsightsOut
from app.services.insights_service import InsightsService

router = APIRouter()


@router.get("/insights", response_model=SpendingInsightsOut)
def get_ai_insights(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return InsightsService(db).get_insights(current_user)
