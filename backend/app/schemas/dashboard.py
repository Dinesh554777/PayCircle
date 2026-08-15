from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel

from app.schemas.activity import ActivityRead
from app.schemas.analytics import AnalyticsOut
from app.schemas.transaction import FeedItem


class GroupSummary(BaseModel):
    id: int
    name: str
    description: str | None = None
    created_at: datetime
    member_count: int
    total_expenses: Decimal
    my_balance: Decimal


class DashboardOut(BaseModel):
    group_count: int
    total_expenses: Decimal
    amount_paid: Decimal
    amount_owed: Decimal
    amount_to_receive: Decimal
    recent_groups: list[GroupSummary]
    recent_transactions: list[FeedItem]
    analytics: AnalyticsOut
    recent_activity: list[ActivityRead]
