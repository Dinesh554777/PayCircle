from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.schemas.settlement import SettlementCreate, SettlementRead, SettlementUpdate
from app.services.settlement_service import SettlementService

router = APIRouter()


@router.post(
    "/groups/{group_id}/settlements",
    response_model=SettlementRead,
    status_code=status.HTTP_201_CREATED,
)
def create_settlement(
    group_id: int,
    data: SettlementCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return SettlementService(db).create_settlement(group_id, data, current_user)


@router.get("/groups/{group_id}/settlements", response_model=list[SettlementRead])
def list_settlements(
    group_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return SettlementService(db).list_group_settlements(group_id, current_user)


@router.patch(
    "/groups/{group_id}/settlements/{settlement_id}",
    response_model=SettlementRead,
)
def update_settlement(
    group_id: int,
    settlement_id: int,
    data: SettlementUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return SettlementService(db).update_settlement(
        group_id, settlement_id, data, current_user
    )
