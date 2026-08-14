"""add expense title and split method

Revision ID: 064811f00920
Revises: 9851a6ca5cbe
Create Date: 2026-08-14 15:06:41.951689

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '064811f00920'
down_revision: Union[str, None] = '9851a6ca5cbe'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "expenses",
        sa.Column("title", sa.String(length=255), server_default="", nullable=False),
    )
    op.add_column(
        "expenses",
        sa.Column("split_method", sa.String(length=20), nullable=True),
    )
    op.alter_column("expenses", "description", existing_type=sa.String(length=255), nullable=True)


def downgrade() -> None:
    op.alter_column("expenses", "description", existing_type=sa.String(length=255), nullable=False)
    op.drop_column("expenses", "split_method")
    op.drop_column("expenses", "title")
