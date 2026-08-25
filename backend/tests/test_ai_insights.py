"""Regression tests for the /ai/insights endpoint data path.

The original production bug: InsightsService indexed ExpenseRow objects as
tuples (`row[1]`), which raised TypeError for any user with expenses while
empty accounts (early return) kept working.
"""
from decimal import Decimal

from app.models.expense_payment import ExpensePayment
from app.services.insights_service import InsightsService
from tests.helpers import add_member, make_expense, make_group, make_user


def test_insights_with_expenses_do_not_crash(db_session):
    user = make_user(db_session, "Dinesh")
    group = make_group(db_session, user)
    other = make_user(db_session, "Bhavana")
    add_member(db_session, group, other)

    make_expense(
        db_session,
        group,
        payer=user,
        title="Dinner",
        amount=1000,
        category="Food",
        users=[user, other],
    )
    make_expense(
        db_session,
        group,
        payer=other,
        title="Cab",
        amount=500,
        category="Travel",
        users=[user, other],
    )
    db_session.commit()

    result = InsightsService(db_session).get_insights(user)

    assert result.expense_count == 2
    assert result.total_spending == Decimal("750.00")
    assert result.average_expense == Decimal("375.00")
    assert result.top_category is not None
    assert len(result.category_breakdown) >= 2
    assert len(result.insights) > 0
    assert result.largest_expense is not None
    assert result.largest_expense.title in {"Dinner", "Cab"}


def test_insights_single_expense(db_session):
    user = make_user(db_session, "Solo")
    group = make_group(db_session, user)
    make_expense(db_session, group, payer=user, title="Hotel", amount=1200, category="Hotel")
    db_session.commit()

    result = InsightsService(db_session).get_insights(user)

    assert result.expense_count == 1
    assert result.total_spending == Decimal("1200.00")
    assert result.spending_change is None


def test_insights_empty_account(db_session):
    user = make_user(db_session, "Empty")

    result = InsightsService(db_session).get_insights(user)

    assert result.expense_count == 0
    assert result.total_spending == Decimal("0.00")
    assert "don't have any expenses" in result.summary


def test_insights_multiple_payers_and_settlements(db_session):
    alice = make_user(db_session, "Alice")
    bob = make_user(db_session, "Bob")
    group = make_group(db_session, alice)
    add_member(db_session, group, bob)

    # A paid 500, B paid 300 - both split equally between the two members.
    expense_a = make_expense(
        db_session, group, payer=alice, title="Groceries", amount=500, category="Food",
        users=[alice, bob],
    )
    expense_b = make_expense(
        db_session, group, payer=bob, title="Tickets", amount=300, category="Travel",
        users=[alice, bob],
    )

    # Settlement: Bob pays Alice back 100 (must not affect share computation).
    db_session.add(
        ExpensePayment(
            expense_id=expense_a.id, user_id=bob.id, amount=Decimal("50.00")
        )
    )
    db_session.commit()

    for payer, expected_share in ((alice, Decimal("400.00")), (bob, Decimal("400.00"))):
        result = InsightsService(db_session).get_insights(payer)
        assert result.expense_count == 2
        assert result.total_spending == expected_share

    assert expense_b.payer_id == bob.id


def test_api_returns_friendly_503_on_unexpected_failure(monkeypatch, db_session):
    from fastapi.testclient import TestClient

    from app.core.database import get_db
    from app.main import app
    from app.services.analytics_service import AnalyticsService

    user = make_user(db_session, "Crashy")
    db_session.commit()

    def _boom(self, user, group_id=None):
        raise RuntimeError("simulated data-prep explosion")

    monkeypatch.setattr(AnalyticsService, "expense_rows", _boom)
    app.dependency_overrides[get_db] = lambda: db_session
    try:
        from app.core.security import create_access_token

        client = TestClient(app)
        response = client.get(
            "/api/ai/insights",
            headers={"Authorization": f"Bearer {create_access_token(user.id)}"},
        )
        assert response.status_code == 503
        detail = response.json()["detail"]
        assert "Unable to generate AI insights" in detail
        assert "RuntimeError" not in detail and "explosion" not in detail
    finally:
        app.dependency_overrides.pop(get_db, None)
