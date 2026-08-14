from decimal import Decimal

from app.models import (
    Expense,
    ExpenseSplit,
    Group,
    GroupMember,
    Settlement,
    Transaction,
    User,
)


def _make_user(db_session, name, email):
    user = User(name=name, email=email, password_hash="not-hashed-yet")
    db_session.add(user)
    db_session.flush()
    return user


def test_user_creation(db_session):
    user = _make_user(db_session, "Alice", "alice@example.com")

    assert user.id is not None
    assert user.created_at is not None
    assert user.email == "alice@example.com"


def test_group_and_membership(db_session):
    owner = _make_user(db_session, "Alice", "alice@example.com")
    member = _make_user(db_session, "Bob", "bob@example.com")

    group = Group(name="Trip", created_by=owner.id)
    db_session.add(group)
    db_session.flush()

    db_session.add(GroupMember(group_id=group.id, user_id=owner.id, role="admin"))
    db_session.add(GroupMember(group_id=group.id, user_id=member.id, role="member"))
    db_session.commit()

    assert len(group.members) == 2
    assert owner.memberships[0].group.name == "Trip"


def test_expense_with_splits(db_session):
    alice = _make_user(db_session, "Alice", "alice@example.com")
    bob = _make_user(db_session, "Bob", "bob@example.com")

    group = Group(name="Dinner", created_by=alice.id)
    db_session.add(group)
    db_session.flush()

    expense = Expense(
        group_id=group.id,
        payer_id=alice.id,
        description="Pizza",
        amount=Decimal("30.00"),
    )
    expense.splits.append(ExpenseSplit(user_id=alice.id, amount=Decimal("15.00")))
    expense.splits.append(ExpenseSplit(user_id=bob.id, amount=Decimal("15.00")))
    db_session.add(expense)
    db_session.commit()

    assert expense.amount == Decimal("30.00")
    assert len(expense.splits) == 2
    assert group.expenses[0].description == "Pizza"


def test_settlement_and_transaction(db_session):
    alice = _make_user(db_session, "Alice", "alice@example.com")
    bob = _make_user(db_session, "Bob", "bob@example.com")

    group = Group(name="Trip", created_by=alice.id)
    db_session.add(group)
    db_session.flush()

    settlement = Settlement(
        group_id=group.id,
        payer_id=bob.id,
        receiver_id=alice.id,
        amount=Decimal("15.00"),
    )
    transaction = Transaction(
        group_id=group.id,
        user_id=bob.id,
        type="settlement",
        amount=Decimal("15.00"),
        description="Settlement from Bob",
    )
    db_session.add_all([settlement, transaction])
    db_session.commit()

    assert settlement.id is not None
    assert settlement.settled_at is not None
    assert transaction.type == "settlement"
    assert group.settlements[0].amount == Decimal("15.00")
    assert bob.settlements_paid[0].receiver_id == alice.id
