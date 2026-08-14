from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.schemas.balance import BalanceOut
from app.services.balance_service import BalanceService

router = APIRouter()


@router.get("/groups/{group_id}/balances", response_model=BalanceOut)
def get_balances(
    group_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return BalanceService(db).get_balances(group_id, current_user)
