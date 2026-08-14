from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.transaction import TransactionRead
from app.services.transaction_service import TransactionService

router = APIRouter()


@router.get("/groups/{group_id}/transactions", response_model=list[TransactionRead])
def list_transactions(group_id: int, db: Session = Depends(get_db)):
    return TransactionService(db).list_group_transactions(group_id)
