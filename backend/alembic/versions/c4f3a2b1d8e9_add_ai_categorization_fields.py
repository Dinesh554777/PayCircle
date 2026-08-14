"""add AI categorization fields to expenses

Revision ID: c4f3a2b1d8e9
Revises: bd6dfad814f7
Create Date: 2026-08-14 16:10:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c4f3a2b1d8e9'
down_revision: Union[str, None] = 'bd6dfad814f7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("expenses", sa.Column("ai_category", sa.String(length=50), nullable=True))
    op.add_column("expenses", sa.Column("ai_confidence", sa.Float(), nullable=True))


def downgrade() -> None:
    op.drop_column("expenses", "ai_confidence")
    op.drop_column("expenses", "ai_category")
