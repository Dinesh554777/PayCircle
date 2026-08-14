from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.settlement import SettlementCreate, SettlementRead
from app.services.settlement_service import SettlementService

router = APIRouter()


@router.post(
    "/groups/{group_id}/settlements",
    response_model=SettlementRead,
    status_code=status.HTTP_201_CREATED,
)
def create_settlement(group_id: int, data: SettlementCreate, db: Session = Depends(get_db)):
    return SettlementService(db).create_settlement(group_id, data)


@router.get("/groups/{group_id}/settlements", response_model=list[SettlementRead])
def list_settlements(group_id: int, db: Session = Depends(get_db)):
    return SettlementService(db).list_group_settlements(group_id)
