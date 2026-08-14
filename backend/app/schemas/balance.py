from decimal import Decimal

from pydantic import BaseModel

from app.schemas.group import UserBrief


class BalanceItem(BaseModel):
    user_id: int
    user: UserBrief | None = None
    total_paid: Decimal
    total_owed: Decimal
    settlements_paid: Decimal
    settlements_received: Decimal
    net_balance: Decimal


class TransferItem(BaseModel):
    from_user_id: int
    from_user: UserBrief | None = None
    to_user_id: int
    to_user: UserBrief | None = None
    amount: Decimal


class BalanceOut(BaseModel):
    balances: list[BalanceItem]
    who_owes_whom: list[TransferItem]
