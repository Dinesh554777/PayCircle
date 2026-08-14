from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field


class SettlementCreate(BaseModel):
    payer_id: int
    receiver_id: int
    amount: Decimal = Field(gt=0)


class SettlementRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    group_id: int
    payer_id: int
    receiver_id: int
    amount: Decimal
    settled_at: datetime
    created_at: datetime
