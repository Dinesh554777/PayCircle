from decimal import Decimal

from pydantic import BaseModel

from app.schemas.group import UserBrief


class SettlementSuggestion(BaseModel):
    """One optimized transfer: `payer` pays `receiver` `amount`."""

    payer_id: int
    payer: UserBrief | None = None
    receiver_id: int
    receiver: UserBrief | None = None
    amount: Decimal


class SettlementSuggestionOut(BaseModel):
    group_id: int
    group_name: str
    suggestions: list[SettlementSuggestion]
    payment_count: int
    total_amount: Decimal
    settled_up: bool  # True when there is nothing to settle
