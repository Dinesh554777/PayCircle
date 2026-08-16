"""Group Spending Health Score tests."""
from datetime import datetime

import pytest
from fastapi import HTTPException

from app.models.settlement import Settlement
from app.services.group_health import GroupHealthService
from tests.helpers import add_member, make_expense, make_group, make_user


def test_fresh_group_has_good_score(db_session):
    alice = make_user(db_session, "Alice")
    group = make_group(db_session, alice, "Solo")
    out = GroupHealthService(db_session).calculate(group.id, alice)
    assert 0 <= out.score <= 100
    assert out.label in {"Excellent", "Good", "Fair", "Needs attention"}
    assert len(out.factors) == 3
    assert out.explanation


def test_outstanding_balances_lower_the_score(db_session):
    alice = make_user(db_session, "Alice")
    bob = make_user(db_session, "Bob")
    group = make_group(db_session, alice, "Trip")
    add_member(db_session, group, bob)
    make_expense(
        db_session, group, alice, "Dinner", 200, "Food", [alice, bob],
        paid_at=datetime.now(),
    )
    out = GroupHealthService(db_session).calculate(group.id, alice)
    balance_factor = next(f for f in out.factors if f.key == "balance")
    assert balance_factor.score == 0.0
    assert "settle" in out.suggested_action.lower()


def test_pending_settlement_lowers_settlement_factor(db_session):
    alice = make_user(db_session, "Alice")
    bob = make_user(db_session, "Bob")
    group = make_group(db_session, alice, "Trip")
    add_member(db_session, group, bob)
    db_session.add(
        Settlement(
            group_id=group.id,
            payer_id=bob.id,
            receiver_id=alice.id,
            amount=100,
            status="pending",
        )
    )
    db_session.flush()
    out = GroupHealthService(db_session).calculate(group.id, alice)
    settlement_factor = next(f for f in out.factors if f.key == "settlement")
    assert settlement_factor.score == 80.0


def test_non_member_is_rejected(db_session):
    alice = make_user(db_session, "Alice")
    bob = make_user(db_session, "Bob")
    group = make_group(db_session, alice, "Trip")
    add_member(db_session, group, bob)
    outsider = make_user(db_session, "Eve")

    with pytest.raises(HTTPException) as exc:
        GroupHealthService(db_session).calculate(group.id, outsider)
    assert exc.value.status_code == 403
