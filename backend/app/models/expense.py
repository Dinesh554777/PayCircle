from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import TimestampMixin

if TYPE_CHECKING:
    from app.models.expense_payment import ExpensePayment
    from app.models.expense_split import ExpenseSplit
    from app.models.group import Group
    from app.models.user import User


class Expense(TimestampMixin, Base):
    __tablename__ = "expenses"

    id: Mapped[int] = mapped_column(primary_key=True)
    group_id: Mapped[int] = mapped_column(ForeignKey("groups.id"), nullable=False)
    payer_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False, default="")
    description: Mapped[str | None] = mapped_column(String(255), nullable=True)
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    category: Mapped[str | None] = mapped_column(String(50), nullable=True)
    ai_category: Mapped[str | None] = mapped_column(String(50), nullable=True)
    ai_confidence: Mapped[float | None] = mapped_column(nullable=True)
    split_method: Mapped[str | None] = mapped_column(String(20), nullable=True)
    paid_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    group: Mapped[Group] = relationship(back_populates="expenses")
    payer: Mapped[User] = relationship(back_populates="expenses_paid")
    splits: Mapped[list[ExpenseSplit]] = relationship(back_populates="expense")
    payments: Mapped[list[ExpensePayment]] = relationship(
        back_populates="expense",
        cascade="all, delete-orphan",
        order_by="ExpensePayment.id",
    )
