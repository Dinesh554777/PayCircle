from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import Boolean, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import TimestampMixin

if TYPE_CHECKING:
    from app.models.activity import Activity
    from app.models.expense import Expense
    from app.models.expense_split import ExpenseSplit
    from app.models.group import Group
    from app.models.group_member import GroupMember
    from app.models.notification import Notification
    from app.models.settlement import Settlement
    from app.models.transaction import Transaction


class User(TimestampMixin, Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    is_admin: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False, server_default="false"
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=True, server_default="true"
    )

    groups_created: Mapped[list[Group]] = relationship(back_populates="created_by_user")
    memberships: Mapped[list[GroupMember]] = relationship(back_populates="user")
    expenses_paid: Mapped[list[Expense]] = relationship(back_populates="payer")
    splits: Mapped[list[ExpenseSplit]] = relationship(back_populates="user")
    settlements_paid: Mapped[list[Settlement]] = relationship(
        foreign_keys="Settlement.payer_id", back_populates="payer"
    )
    settlements_received: Mapped[list[Settlement]] = relationship(
        foreign_keys="Settlement.receiver_id", back_populates="receiver"
    )
    transactions: Mapped[list[Transaction]] = relationship(back_populates="user")
    notifications: Mapped[list[Notification]] = relationship(back_populates="user")
    activities: Mapped[list[Activity]] = relationship(back_populates="user")
