from datetime import datetime
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.group import UserBrief


class ExactSplitItem(BaseModel):
    user_id: int
    amount: Decimal = Field(gt=0, max_digits=12, decimal_places=2)


class PercentageSplitItem(BaseModel):
    user_id: int
    percentage: Decimal = Field(gt=0, max_digits=5, decimal_places=2)


class ExpenseBase(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    description: str | None = Field(default=None, max_length=255)
    amount: Decimal = Field(gt=0, max_digits=12, decimal_places=2)
    category: str | None = Field(default=None, max_length=50)
    paid_by: int
    expense_date: datetime | None = None
    split_method: Literal["equal", "exact", "percentage"] = "equal"
    participants: list[int] | None = None
    exact_amounts: list[ExactSplitItem] | None = None
    percentages: list[PercentageSplitItem] | None = None


class ExpenseCreate(ExpenseBase):
    auto_categorize: bool = True


class ExpenseUpdate(ExpenseBase):
    pass


class SplitCalculationIn(ExpenseBase):
    pass


class SplitResultItem(BaseModel):
    user_id: int
    amount: Decimal
    user: UserBrief | None = None


class SplitCalculationOut(BaseModel):
    method: str
    amount: Decimal
    total: Decimal
    splits: list[SplitResultItem]


class ExpenseSplitRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    expense_id: int
    user_id: int
    amount: Decimal
    user: UserBrief | None = None


class ExpenseRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    group_id: int
    title: str
    description: str | None
    amount: Decimal
    category: str | None
    ai_category: str | None = None
    ai_confidence: float | None = None
    paid_by: int = Field(validation_alias="payer_id")
    expense_date: datetime | None = Field(validation_alias="paid_at")
    split_method: str | None
    created_at: datetime
    paid_by_user: UserBrief | None = Field(default=None, validation_alias="payer")
    splits: list[ExpenseSplitRead] = []
