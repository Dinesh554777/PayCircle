from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class AdminUserRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    email: EmailStr
    is_admin: bool
    is_active: bool
    created_at: datetime
    groups_count: int = 0
    expenses_count: int = 0


class AdminGroupRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    description: str | None = None
    created_by: int
    created_at: datetime
    member_count: int = 0
    expense_count: int = 0


class AdminUserStatusUpdate(BaseModel):
    is_active: bool


class SystemStatsOut(BaseModel):
    total_users: int
    active_users: int
    total_groups: int
    total_expenses: int
    total_settlements: int
    total_transactions: int
    total_amount_spent: Decimal | None = None
