from datetime import datetime
from decimal import Decimal

from app.services.analytics_service import AnalyticsService
from tests.helpers import add_member, make_expense, make_group, make_user


def _two_user_group(db):
    alice = make_user(db, "Alice")
    bob = make_user(db, "Bob")
    group = make_group(db, alice, "Trip")
    add_member(db, group, bob)
    return alice, bob, group


def test_empty_history(db_session):
    user = make_user(db_session)
    analytics = AnalyticsService(db_session).summary(user)

    assert analytics.has_data is False
    assert analytics.total_spending == Decimal("0.00")
    assert analytics.expense_count == 0
    assert analytics.average_expense is None
    assert analytics.highest_expense is None
    assert analytics.lowest_expense is None
    assert analytics.monthly_spending == []
    assert analytics.weekly_spending == []
    assert analytics.category_totals == []
    assert analytics.group_totals == []
    assert analytics.spending_frequency is None
    assert analytics.budget.current_amount == Decimal("0.00")
    assert analytics.budget.change_percent is None


def test_monthly_and_total_spending(db_session):
    alice, bob, group = _two_user_group(db_session)
    make_expense(
        db_session, group, alice, "Dinner", 200, "Food", [alice, bob],
        paid_at=datetime(2026, 1, 15),
    )
    make_expense(
        db_session, group, bob, "Cab", 100, "Transport", [alice, bob],
        paid_at=datetime(2026, 2, 10),
    )

    service = AnalyticsService(db_session)
    rows = service.expense_rows(alice)

    assert service.total_spending(rows) == Decimal("150.00")
    assert service.average_expense(rows) == Decimal("75.00")

    monthly = service.monthly_spending(rows)
    assert monthly[(2026, 1)] == Decimal("100.00")
    assert monthly[(2026, 2)] == Decimal("50.00")

    summary = service.summary(alice)
    assert summary.monthly_spending[0].month == "2026-01"
    assert summary.monthly_spending[0].amount == Decimal("100.00")
    assert summary.monthly_spending[1].month == "2026-02"
    assert summary.monthly_spending[1].amount == Decimal("50.00")


def test_category_totals(db_session):
    alice, bob, group = _two_user_group(db_session)
    make_expense(db_session, group, alice, "Dinner", 200, "Food", [alice, bob])
    make_expense(db_session, group, bob, "Cab", 100, "Transport", [alice, bob])

    service = AnalyticsService(db_session)
    rows = service.expense_rows(alice)
    categories = service.category_totals(rows)

    assert categories["Food"] == Decimal("100.00")
    assert categories["Transport"] == Decimal("50.00")

    summary = service.summary(alice)
    assert [c.category for c in summary.category_totals] == ["Food", "Transport"]
    assert summary.category_totals[0].amount == Decimal("100.00")
    assert round(summary.category_totals[0].share, 1) == 66.7


def test_highest_and_lowest_expense(db_session):
    alice, bob, group = _two_user_group(db_session)
    make_expense(
        db_session, group, alice, "Dinner", 200, "Food", [alice, bob],
        paid_at=datetime(2026, 1, 15),
    )
    make_expense(
        db_session, group, bob, "Cab", 100, "Transport", [alice, bob],
        paid_at=datetime(2026, 1, 20),
    )

    summary = AnalyticsService(db_session).summary(alice)

    assert summary.highest_expense is not None
    assert summary.highest_expense.title == "Dinner"
    assert summary.highest_expense.amount == Decimal("100.00")

    assert summary.lowest_expense is not None
    assert summary.lowest_expense.title == "Cab"
    assert summary.lowest_expense.amount == Decimal("50.00")


def test_weekly_spending(db_session):
    alice, bob, group = _two_user_group(db_session)
    make_expense(
        db_session, group, alice, "Dinner", 200, "Food", [alice, bob],
        paid_at=datetime(2026, 8, 3),
    )
    make_expense(
        db_session, group, bob, "Cab", 100, "Transport", [alice, bob],
        paid_at=datetime(2026, 8, 13),
    )

    service = AnalyticsService(db_session)
    weekly = service.weekly_spending(service.expense_rows(alice))
    # 2026-08-03 is in ISO week 32; 2026-08-13 is in ISO week 33.
    assert (2026, 32) in weekly
    assert (2026, 33) in weekly
    assert weekly[(2026, 32)] == Decimal("100.00")
    assert weekly[(2026, 33)] == Decimal("50.00")


def test_multiple_groups(db_session):
    alice = make_user(db_session, "Alice")
    bob = make_user(db_session, "Bob")
    carol = make_user(db_session, "Carol")

    trip = make_group(db_session, alice, "Trip")
    add_member(db_session, trip, bob)
    work = make_group(db_session, alice, "Work")
    add_member(db_session, work, carol)

    make_expense(db_session, trip, alice, "Hotel", 200, "Travel", [alice, bob])
    make_expense(db_session, work, alice, "Lunch", 100, "Food", [alice, carol])

    summary = AnalyticsService(db_session).summary(alice)

    assert summary.expense_count == 2
    assert summary.total_spending == Decimal("150.00")  # 100 + 50
    assert len(summary.group_totals) == 2


def test_group_totals_are_full_amounts(db_session):
    alice, bob, group = _two_user_group(db_session)
    make_expense(db_session, group, alice, "Dinner", 200, "Food", [alice, bob])
    make_expense(db_session, group, bob, "Cab", 100, "Transport", [alice, bob])

    summary = AnalyticsService(db_session).summary(alice)
    trip_total = next(
        (g for g in summary.group_totals if g.name == "Trip"), None
    )
    assert trip_total is not None
    assert trip_total.amount == Decimal("300.00")
    assert trip_total.count == 2


def test_multiple_users_are_isolated(db_session):
    alice, bob, group = _two_user_group(db_session)
    carol = make_user(db_session, "Carol")

    make_expense(db_session, group, alice, "Dinner", 200, "Food", [alice, bob])

    service = AnalyticsService(db_session)

    alice_summary = service.summary(alice)
    bob_summary = service.summary(bob)
    carol_summary = service.summary(carol)

    assert alice_summary.expense_count == 1
    assert alice_summary.total_spending == Decimal("100.00")
    assert bob_summary.expense_count == 1
    assert bob_summary.total_spending == Decimal("100.00")

    # Carol is not a member: she must see nothing.
    assert carol_summary.has_data is False
    assert carol_summary.total_spending == Decimal("0.00")
    assert carol_summary.expense_count == 0
    assert carol_summary.category_totals == []
    assert service.expense_rows(carol) == []


def test_budget_summary_reflects_current_month(db_session):
    alice, bob, group = _two_user_group(db_session)
    now = datetime.now()
    make_expense(
        db_session, group, alice, "Dinner", 200, "Food", [alice, bob],
        paid_at=now,
    )

    budget = AnalyticsService(db_session).summary(alice).budget

    assert budget.current_amount == Decimal("100.00")
    assert budget.current_count == 1
    assert budget.previous_amount == Decimal("0.00")
    assert budget.direction is None  # nothing to compare against
