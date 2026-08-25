import logging

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.schemas.anomaly import AnomaliesOut
from app.schemas.insights import SpendingInsightsOut
from app.services.insights_service import InsightsService
from app.services.spending_analyzer import SpendingAnalyzerService

router = APIRouter()
logger = logging.getLogger("paycircle.ai")

GENERIC_AI_ERROR = "Unable to generate AI insights right now. Please try again."


@router.get("/insights", response_model=SpendingInsightsOut)
def get_ai_insights(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        return InsightsService(db).get_insights(current_user)
    except HTTPException:
        raise
    except Exception:
        logger.exception("AI insights generation failed for user %s", current_user.id)
        raise HTTPException(status_code=503, detail=GENERIC_AI_ERROR) from None


@router.get("/anomalies", response_model=AnomaliesOut)
def get_spending_anomalies(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return SpendingAnalyzerService(db).detect_anomalies(current_user)
