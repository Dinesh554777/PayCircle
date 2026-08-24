"""add expense_payments for multi-payer expenses

Revision ID: e5f6a7b8c9d0
Revises: d2e3f4a5b6c7
Create Date: 2026-08-24 00:00:00.000000
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "e5f6a7b8c9d0"
down_revision: Union[str, None] = "d2e3f4a5b6c7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "expense_payments",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("expense_id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("amount", sa.Numeric(12, 2), nullable=False),
        sa.ForeignKeyConstraint(["expense_id"], ["expenses.id"]),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("expense_id", "user_id", name="uq_expense_payment"),
    )
    op.create_index(
        "ix_expense_payments_expense_id", "expense_payments", ["expense_id"]
    )
    op.execute(
        """
        INSERT INTO expense_payments (expense_id, user_id, amount)
        SELECT id, payer_id, amount FROM expenses
        """
    )


def downgrade() -> None:
    op.drop_index("ix_expense_payments_expense_id", table_name="expense_payments")
    op.drop_table("expense_payments")
