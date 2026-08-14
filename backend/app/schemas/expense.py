from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field


class ExpenseSplitIn(BaseModel):
    user_id: int
    amount: Decimal = Field(gt=0)


class ExpenseCreate(BaseModel):
    description: str = Field(min_length=1, max_length=255)
    amount: Decimal = Field(gt=0)
    payer_id: int
    paid_at: datetime | None = None
    splits: list[ExpenseSplitIn] = Field(min_length=1)


class ExpenseSplitRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    expense_id: int
    user_id: int
    amount: Decimal


class ExpenseRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    group_id: int
    payer_id: int
    description: str
    amount: Decimal
    category: str | None
    paid_at: datetime | None
    created_at: datetime
    splits: list[ExpenseSplitRead] = []
