"""add payments table

Revision ID: d2e3f4a5b6c7
Revises: b17a2ae5e314
Create Date: 2026-08-24 00:00:00.000000
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "d2e3f4a5b6c7"
down_revision: Union[str, None] = "b17a2ae5e314"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "payments",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("settlement_id", sa.Integer(), nullable=False),
        sa.Column("payer_id", sa.Integer(), nullable=False),
        sa.Column("receiver_id", sa.Integer(), nullable=False),
        sa.Column("amount", sa.Numeric(12, 2), nullable=False),
        sa.Column("currency", sa.String(length=3), nullable=False),
        sa.Column("gateway", sa.String(length=30), nullable=False),
        sa.Column("razorpay_order_id", sa.String(length=100), nullable=False),
        sa.Column("razorpay_payment_id", sa.String(length=100), nullable=True),
        sa.Column("razorpay_signature", sa.String(length=255), nullable=True),
        sa.Column("payment_status", sa.String(length=20), server_default="created", nullable=False),
        sa.Column("paid_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["payer_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["receiver_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["settlement_id"], ["settlements.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("razorpay_order_id", name="uq_payments_razorpay_order_id"),
        sa.UniqueConstraint("razorpay_payment_id", name="uq_payments_razorpay_payment_id"),
        sa.UniqueConstraint("settlement_id", name="uq_payments_settlement_id"),
    )


def downgrade() -> None:
    op.drop_table("payments")
