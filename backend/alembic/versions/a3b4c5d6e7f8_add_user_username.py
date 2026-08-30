"""add unique username to users

Revision ID: a3b4c5d6e7f8
Revises: f1a2b3c4d5e6
Create Date: 2026-08-30 00:00:00.000000

Adds a unique, searchable ``username`` column to ``users`` and backfills
existing rows from the local-part of their email address (deduped).
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "a3b4c5d6e7f8"
down_revision: Union[str, None] = "f1a2b3c4d5e6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    # 1. Add nullable column first so existing rows can be backfilled.
    op.add_column(
        "users",
        sa.Column("username", sa.String(length=50), nullable=True),
    )
    # 2. Backfill from the local part of the email address. On PostgreSQL use
    #    split_part; on SQLite fall back to instr/substr.
    if bind.dialect.name == "postgresql":
        op.execute(
            "UPDATE users SET username = lower(split_part(email, '@', 1)) "
            "WHERE username IS NULL"
        )
    else:
        op.execute(
            "UPDATE users SET username = lower(substr(email, 1, instr(email, '@') - 1)) "
            "WHERE username IS NULL"
        )
        op.execute("UPDATE users SET username = lower(email) WHERE username IS NULL")
        op.execute("UPDATE users SET username = 'user' WHERE username = ''")
        op.execute("UPDATE users SET username = 'user' WHERE username IS NULL")
    # 3. De-duplicate: append a numeric suffix to duplicates, deterministically.
    #    Handles both SQLite and PostgreSQL via a row-numbering update.
    rows = bind.execute(
        sa.text(
            "SELECT id, username FROM users "
            "WHERE username IN (SELECT username FROM users "
            "GROUP BY username HAVING COUNT(*) > 1) "
            "ORDER BY username, id"
        )
    ).fetchall()
    for idx, (uid, uname) in enumerate(rows):
        bind.execute(
            sa.text("UPDATE users SET username = :u WHERE id = :id"),
            {"u": f"{uname}{idx}", "id": uid},
        )
    # 4. Now enforce not-null and uniqueness.
    op.alter_column(
        "users",
        "username",
        existing_type=sa.String(length=50),
        nullable=False,
    )
    op.create_index("ix_users_username", "users", ["username"], unique=True)


def downgrade() -> None:
    op.drop_index("ix_users_username", table_name="users")
    op.drop_column("users", "username")
