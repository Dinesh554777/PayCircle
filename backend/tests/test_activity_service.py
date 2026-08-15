from decimal import Decimal

from app.schemas.expense import ExpenseCreate
from app.schemas.group import GroupCreate, MemberAdd
from app.services.activity_service import ActivityService, ActivityType
from app.services.expense_service import ExpenseService
from app.services.group_service import GroupService
from tests.helpers import make_user


def test_group_create_records_activity(db_session):
    alice = make_user(db_session, "Alice")
    group = GroupService(db_session).create_group(
        GroupCreate(name="Trip", description=None), alice
    )

    activities = ActivityService(db_session).list_for_group(group.id, alice)
    assert len(activities) == 1
    assert activities[0].type == ActivityType.GROUP_CREATED
    assert "created group" in activities[0].message


def test_expense_add_records_activity(db_session):
    alice = make_user(db_session, "Alice")
    bob = make_user(db_session, "Bob")
    groups = GroupService(db_session)
    group = groups.create_group(GroupCreate(name="Trip", description=None), alice)
    groups.add_member(
        group.id, MemberAdd(user_id=bob.id, role="member"), alice
    )

    ExpenseService(db_session).create_expense(
        group.id,
        ExpenseCreate(
            title="Dinner",
            amount=Decimal("200.00"),
            paid_by=alice.id,
            split_method="equal",
            participants=[alice.id, bob.id],
        ),
        alice,
    )

    activities = ActivityService(db_session).list_for_group(group.id, alice)
    assert any(
        activity.type == ActivityType.EXPENSE_ADDED
        and "Dinner" in activity.message
        for activity in activities
    )


def test_activities_are_scoped_to_user_groups(db_session):
    alice = make_user(db_session, "Alice")
    bob = make_user(db_session, "Bob")
    groups = GroupService(db_session)

    group_a = groups.create_group(GroupCreate(name="Trip A", description=None), alice)
    group_b = groups.create_group(GroupCreate(name="Trip B", description=None), bob)
    groups.add_member(group_b.id, MemberAdd(user_id=alice.id, role="member"), bob)

    alice_activity = ActivityService(db_session).list_for_user(alice)
    assert len(alice_activity) == 3
    assert all(
        activity.group_id in (group_a.id, group_b.id)
        for activity in alice_activity
    )


def test_activities_empty_for_new_user(db_session):
    carol = make_user(db_session, "Carol")
    assert ActivityService(db_session).list_for_user(carol) == []
