"""Smart Settlement Optimizer tests.

Balances are seeded via the test factories: Alice pays, everyone's share is
equally split, so net balances are strictly determined by who paid.
"""
import pytest
from fastapi import HTTPException

from app.services.settlement_optimizer import SettlementOptimizerService
from tests.helpers import add_member, make_expense, make_group, make_user


def _service(db):
    return SettlementOptimizerService(db)


def _trip(db):
    alice = make_user(db, "Alice")
    bob = make_user(db, "Bob")
    carol = make_user(db, "Carol")
    group = make_group(db, alice, "Trip")
    add_member(db, group, bob)
    add_member(db, group, carol)
    return alice, bob, carol, group


def test_optimize_transfers_positive_negative_zero():
    from decimal import Decimal

    from app.schemas.balance import BalanceItem

    balances = [
        BalanceItem(
            user_id=1, user=None, total_paid=Decimal("200"),
            total_owed=Decimal("0"), settlements_paid=Decimal("0"),
            settlements_received=Decimal("0"), net_balance=Decimal("100"),
        ),
        BalanceItem(
            user_id=2, user=None, total_paid=Decimal("0"),
            total_owed=Decimal("100"), settlements_paid=Decimal("0"),
            settlements_received=Decimal("0"), net_balance=Decimal("-100"),
        ),
        BalanceItem(
            user_id=3, user=None, total_paid=Decimal("0"),
            total_owed=Decimal("0"), settlements_paid=Decimal("0"),
            settlements_received=Decimal("0"), net_balance=Decimal("0"),
        ),
    ]
    transfers = SettlementOptimizerService.optimize_transfers(balances)
    assert transfers == [(2, 1, Decimal("100"))]


def test_single_debtor_multiple_creditors(db_session):
    alice, bob, carol, group = _trip(db_session)
    # Alice paid 600 split 3 ways → each owes 200, Alice net +400.
    make_expense(db_session, group, alice, "Trip cost", 600, "Travel",
                 [alice, bob, carol])

    out = _service(db_session).get_suggestions(group.id, alice)
    assert not out.settled_up
    assert out.payment_count == 2
    assert out.total_amount == 400
    assert {(s.payer.name, s.receiver.name) for s in out.suggestions} == {
        ("Bob", "Alice"),
        ("Carol", "Alice"),
    }
    assert all(s.amount == 200 for s in out.suggestions)


def test_multiple_debtors_multiple_creditors(db_session):
    alice, bob, carol, group = _trip(db_session)
    dave = make_user(db_session, "Dave")
    add_member(db_session, group, dave)
    # Alice + Bob pairs: Alice paid 300 to 2 → Bob owes 150.
    make_expense(db_session, group, alice, "Dinner", 300, "Food", [alice, bob])
    # Carol + Dave pairs: Carol paid 300 to 2 → Dave owes 150.
    make_expense(db_session, group, carol, "Lunch", 300, "Food", [carol, dave])

    out = _service(db_session).get_suggestions(group.id, alice)
    assert out.payment_count == 2
    assert out.total_amount == 300
    pairs = {(s.payer.name, s.receiver.name) for s in out.suggestions}
    assert ("Bob", "Alice") in pairs
    assert ("Dave", "Carol") in pairs


def test_empty_balances_are_settled_up(db_session):
    alice, bob, carol, group = _trip(db_session)
    out = _service(db_session).get_suggestions(group.id, alice)
    assert out.settled_up is True
    assert out.suggestions == []
    assert out.payment_count == 0


def test_settled_group_has_no_suggestions(db_session):
    alice, bob, carol, group = _trip(db_session)
    # Everyone pays their own share of a 600 bill: no one owes anyone.
    make_expense(db_session, group, alice, "Tea", 200, "Food", [alice, bob, carol])
    make_expense(db_session, group, bob, "Tea", 200, "Food", [alice, bob, carol])
    make_expense(db_session, group, carol, "Tea", 200, "Food", [alice, bob, carol])

    out = _service(db_session).get_suggestions(group.id, alice)
    assert out.settled_up is True
    assert out.suggestions == []


def test_non_member_is_rejected(db_session):
    alice, bob, carol, group = _trip(db_session)
    make_expense(db_session, group, alice, "Dinner", 200, "Food", [alice, bob])
    outsider = make_user(db_session, "Eve")

    with pytest.raises(HTTPException) as exc:
        _service(db_session).get_suggestions(group.id, outsider)
    assert exc.value.status_code == 403
