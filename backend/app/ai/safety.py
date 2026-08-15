"""AI safety and privacy rules for PayCircle.

Every AI feature (categorization, insights, chatbot, prediction, assistant)
must follow these rules:

1. Scope to the authenticated user
   All data retrieval is filtered through the user's group memberships. A user
   can never see another user's expenses, balances, or transactions.

2. Never expose secrets
   Passwords and API keys are hashed / stored in environment variables and are
   never placed into any AI prompt, context, response, or log.

3. Never invent data
   AI responses may only reference data present in the provided context. When
   data is insufficient, the assistant must say so instead of guessing.

4. No financial advice
   Suggestions are informational spending observations, never investment,
   tax, or legal advice.

The helpers below enforce rule 1 (data isolation) at the service boundary.
"""
from __future__ import annotations

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models.group import Group
from app.models.group_member import GroupMember
from app.models.user import User


def user_group_ids(db: Session, user: User) -> list[int]:
    """Return the ids of every group the user is a member of."""
    if user is None:
        return []
    return [
        row.group_id
        for row in (
            db.query(GroupMember)
            .filter(GroupMember.user_id == user.id)
            .order_by(GroupMember.group_id)
            .all()
        )
    ]


def assert_user_in_group(db: Session, user: User, group_id: int) -> Group:
    """Return the group only if the user is a member; otherwise raise 403."""
    if user is None:
        raise HTTPException(status_code=403, detail="Authentication required")
    group = db.get(Group, group_id)
    if group is None:
        raise HTTPException(status_code=404, detail="Group not found")
    membership = (
        db.query(GroupMember)
        .filter(
            GroupMember.group_id == group_id,
            GroupMember.user_id == user.id,
        )
        .first()
    )
    if membership is None:
        raise HTTPException(
            status_code=403, detail="You are not a member of this group"
        )
    return group


SAFETY_PREAMBLE = (
    "You only have access to the authenticated user's own expense data. "
    "Never invent transactions, amounts, or people. If the data is "
    "insufficient to answer, say so. Do not reveal passwords, API keys, or "
    "other users' private spending information. Do not give financial advice."
)
