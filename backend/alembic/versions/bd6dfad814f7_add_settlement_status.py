"""add settlement status

Revision ID: bd6dfad814f7
Revises: 064811f00920
Create Date: 2026-08-14 15:23:43.781069

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'bd6dfad814f7'
down_revision: Union[str, None] = '064811f00920'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "settlements",
        sa.Column("status", sa.String(length=20), server_default="pending", nullable=False),
    )


def downgrade() -> None:
    op.drop_column("settlements", "status")
