from decimal import Decimal

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.schemas.expense import (
    ExpenseCreate,
    ExpenseRead,
    ExpenseUpdate,
    SplitCalculationIn,
    SplitCalculationOut,
    SplitResultItem,
)
from app.services.expense_service import ExpenseService

router = APIRouter()


@router.post(
    "/groups/{group_id}/expenses",
    response_model=ExpenseRead,
    status_code=status.HTTP_201_CREATED,
)
def create_expense(
    group_id: int,
    data: ExpenseCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return ExpenseService(db).create_expense(group_id, data, current_user)


@router.get("/groups/{group_id}/expenses", response_model=list[ExpenseRead])
def list_expenses(
    group_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return ExpenseService(db).list_group_expenses(group_id, current_user)


@router.post(
    "/groups/{group_id}/expenses/calculate",
    response_model=SplitCalculationOut,
)
def calculate_splits(
    group_id: int,
    data: SplitCalculationIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    computed = ExpenseService(db).calculate_splits(group_id, data, current_user)
    user_ids = [user_id for user_id, _ in computed]
    users = db.query(User).filter(User.id.in_(user_ids)).all()
    users_by_id = {user.id: user for user in users}
    splits = [
        SplitResultItem(
            user_id=user_id,
            amount=amount,
            user=users_by_id.get(user_id),
        )
        for user_id, amount in computed
    ]
    return SplitCalculationOut(
        method=data.split_method,
        amount=data.amount,
        total=sum((s.amount for s in splits), Decimal("0")),
        splits=splits,
    )


@router.get("/groups/{group_id}/expenses/{expense_id}", response_model=ExpenseRead)
def get_expense(
    group_id: int,
    expense_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return ExpenseService(db).get_group_expense(group_id, expense_id, current_user)


@router.put(
    "/groups/{group_id}/expenses/{expense_id}", response_model=ExpenseRead
)
def update_expense(
    group_id: int,
    expense_id: int,
    data: ExpenseUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return ExpenseService(db).update_expense(group_id, expense_id, data, current_user)


@router.delete(
    "/groups/{group_id}/expenses/{expense_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_expense(
    group_id: int,
    expense_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ExpenseService(db).delete_expense(group_id, expense_id, current_user)
