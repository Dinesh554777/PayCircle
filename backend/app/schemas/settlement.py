from datetime import datetime
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.group import UserBrief


class SettlementCreate(BaseModel):
    payer_id: int
    receiver_id: int
    amount: Decimal = Field(gt=0, max_digits=12, decimal_places=2)
    settlement_date: datetime | None = None


class SettlementRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    group_id: int
    payer_id: int
    receiver_id: int
    amount: Decimal
    status: str
    settlement_date: datetime = Field(validation_alias="settled_at")
    created_at: datetime
    payer: UserBrief | None = None
    receiver: UserBrief | None = None


class SettlementUpdate(BaseModel):
    status: Literal["pending", "processing", "completed", "failed"] = "completed"
