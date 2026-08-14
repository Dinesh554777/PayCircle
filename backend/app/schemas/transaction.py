from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict


class TransactionRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    group_id: int
    user_id: int
    type: str
    amount: Decimal
    description: str | None
    created_at: datetime
