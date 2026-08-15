"""Factories for seeding test data into the isolated test database."""
from datetime import datetime
from decimal import Decimal

from app.models.expense import Expense
from app.models.expense_split import ExpenseSplit
from app.models.group import Group
from app.models.group_member import GroupMember
from app.models.user import User


def make_user(db, name="Alice", email=None, admin=False) -> User:
    email = email or f"{name.lower().replace(' ', '.')}@example.com"
    user = User(
        name=name,
        email=email,
        password_hash="not-a-real-hash",
        is_admin=admin,
    )
    db.add(user)
    db.flush()
    return user


def make_group(db, creator: User, name="Trip", description=None) -> Group:
    group = Group(
        name=name,
        description=description,
        created_by=creator.id,
    )
    db.add(group)
    db.flush()
    member = GroupMember(group_id=group.id, user_id=creator.id, role="admin")
    db.add(member)
    db.flush()
    return group


def add_member(db, group: Group, user: User, role: str = "member") -> GroupMember:
    member = GroupMember(group_id=group.id, user_id=user.id, role=role)
    db.add(member)
    db.flush()
    return member


def make_expense(
    db,
    group: Group,
    payer: User,
    title: str,
    amount,
    category: str,
    users=None,
    paid_at: datetime | None = None,
    split_method: str = "equal",
    description: str | None = None,
) -> Expense:
    """Create an expense split equally among `users` (default: group members)."""
    users = users or [
        member.user for member in db.query(GroupMember).filter(GroupMember.group_id == group.id).all()
    ]
    expense = Expense(
        group_id=group.id,
        payer_id=payer.id,
        title=title,
        description=description,
        amount=Decimal(str(amount)),
        category=category,
        split_method=split_method,
        paid_at=paid_at,
    )
    db.add(expense)
    db.flush()
    share = (Decimal(str(amount)) / Decimal(len(users))).quantize(Decimal("0.01"))
    for user in users:
        db.add(ExpenseSplit(expense_id=expense.id, user_id=user.id, amount=share))
    db.flush()
    return expense
