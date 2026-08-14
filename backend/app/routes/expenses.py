from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.expense import ExpenseCreate, ExpenseRead
from app.services.expense_service import ExpenseService

router = APIRouter()


@router.post(
    "/groups/{group_id}/expenses",
    response_model=ExpenseRead,
    status_code=status.HTTP_201_CREATED,
)
def create_expense(group_id: int, data: ExpenseCreate, db: Session = Depends(get_db)):
    return ExpenseService(db).create_expense(group_id, data)


@router.get("/groups/{group_id}/expenses", response_model=list[ExpenseRead])
def list_expenses(group_id: int, db: Session = Depends(get_db)):
    return ExpenseService(db).list_group_expenses(group_id)
