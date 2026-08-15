from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import TimestampMixin

if TYPE_CHECKING:
    from app.models.group import Group
    from app.models.user import User


class Activity(TimestampMixin, Base):
    """A lightweight event record shown in group and dashboard timelines.

    Tracks: group created, member added/removed/left, expense added/edited/
    deleted, and settlements created/completed. Not a full audit system.
    """

    __tablename__ = "activities"

    id: Mapped[int] = mapped_column(primary_key=True)
    group_id: Mapped[int | None] = mapped_column(
        ForeignKey("groups.id"), nullable=True, index=True
    )
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    type: Mapped[str] = mapped_column(String(30), nullable=False)
    message: Mapped[str] = mapped_column(String(255), nullable=False)
    related_id: Mapped[int | None] = mapped_column(nullable=True)

    group: Mapped[Group | None] = relationship(back_populates="activities")
    user: Mapped[User] = relationship(back_populates="activities")
