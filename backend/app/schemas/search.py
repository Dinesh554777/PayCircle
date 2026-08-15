from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel


class SearchExpenseItem(BaseModel):
    id: int
    title: str
    description: str | None
    amount: Decimal
    category: str | None
    date: datetime | None
    group_id: int
    group_name: str


class SearchGroupItem(BaseModel):
    id: int
    name: str
    description: str | None
    member_count: int
    created_at: datetime


class SearchTransactionItem(BaseModel):
    id: int
    type: str
    amount: Decimal
    description: str | None
    date: datetime
    group_id: int
    group_name: str


class SearchResults(BaseModel):
    query: str
    expenses: list[SearchExpenseItem]
    groups: list[SearchGroupItem]
    transactions: list[SearchTransactionItem]
