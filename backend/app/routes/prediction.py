from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.schemas.prediction import SpendingPredictionOut
from app.services.prediction_service import PredictionService

router = APIRouter()


@router.get("/prediction", response_model=SpendingPredictionOut)
def get_spending_prediction(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return PredictionService(db).get_prediction(current_user)
