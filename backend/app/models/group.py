from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import TimestampMixin

if TYPE_CHECKING:
    from app.models.expense import Expense
    from app.models.group_member import GroupMember
    from app.models.settlement import Settlement
    from app.models.transaction import Transaction
    from app.models.user import User


class Group(TimestampMixin, Base):
    __tablename__ = "groups"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_by: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)

    created_by_user: Mapped[User] = relationship(back_populates="groups_created")
    members: Mapped[list[GroupMember]] = relationship(back_populates="group")
    expenses: Mapped[list[Expense]] = relationship(back_populates="group")
    settlements: Mapped[list[Settlement]] = relationship(back_populates="group")
    transactions: Mapped[list[Transaction]] = relationship(back_populates="group")
