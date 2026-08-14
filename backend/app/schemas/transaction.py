from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel

from app.schemas.group import GroupBrief, UserBrief


class FeedSplit(BaseModel):
    user_id: int
    amount: Decimal
    user: UserBrief | None = None


class FeedItem(BaseModel):
    type: str  # "expense" | "settlement"
    amount: Decimal
    date: datetime
    title: str | None = None
    payer: UserBrief | None = None
    receiver: UserBrief | None = None
    status: str | None = None
    group: GroupBrief | None = None
    splits: list[FeedSplit] = []
