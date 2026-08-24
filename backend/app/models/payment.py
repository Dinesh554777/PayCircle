from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Numeric, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import TimestampMixin

if TYPE_CHECKING:
    from app.models.settlement import Settlement
    from app.models.user import User


class Payment(TimestampMixin, Base):
    __tablename__ = "payments"
    __table_args__ = (
        UniqueConstraint("settlement_id", name="uq_payments_settlement_id"),
        UniqueConstraint("razorpay_order_id", name="uq_payments_razorpay_order_id"),
        UniqueConstraint("razorpay_payment_id", name="uq_payments_razorpay_payment_id"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    settlement_id: Mapped[int] = mapped_column(ForeignKey("settlements.id"), nullable=False)
    payer_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    receiver_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    currency: Mapped[str] = mapped_column(String(3), nullable=False, default="INR")
    gateway: Mapped[str] = mapped_column(String(30), nullable=False, default="razorpay")
    razorpay_order_id: Mapped[str] = mapped_column(String(100), nullable=False)
    razorpay_payment_id: Mapped[str | None] = mapped_column(String(100), nullable=True)
    razorpay_signature: Mapped[str | None] = mapped_column(String(255), nullable=True)
    payment_status: Mapped[str] = mapped_column(
        String(20), nullable=False, default="created", server_default="created"
    )
    paid_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    settlement: Mapped[Settlement] = relationship(back_populates="payment")
    payer: Mapped[User] = relationship(foreign_keys=[payer_id], back_populates="payments_made")
    receiver: Mapped[User] = relationship(
        foreign_keys=[receiver_id], back_populates="payments_received"
    )

    @property
    def group_id(self) -> int:
        return self.settlement.group_id
