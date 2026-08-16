"""Spending Anomaly Detector tests (statistics only, no AI calls)."""
from datetime import datetime

from app.services.spending_analyzer import SpendingAnalyzerService
from tests.helpers import add_member, make_expense, make_group, make_user


def _setup(db, amounts):
    alice = make_user(db, "Alice")
    bob = make_user(db, "Bob")
    group = make_group(db, alice, "Trip")
    add_member(db, group, bob)
    for index, amount in enumerate(amounts):
        make_expense(
            db, group, alice, f"Meal {index}", amount, "Food", [alice, bob],
            paid_at=datetime(2026, 6, index + 1),
        )
    return alice, bob, group


def test_flags_expense_well_above_typical(db_session):
    alice, _, _ = _setup(db_session, [100, 100, 1000])
    out = SpendingAnalyzerService(db_session).detect_anomalies(alice)
    assert out.count >= 1
    anomaly = next(item for item in out.anomalies if item.kind == "expense")
    assert anomaly.category == "Food"
    assert anomaly.amount == 500  # Alice's share of the 1000 expense
    assert anomaly.title == "Meal 2"
    assert "typical" in anomaly.reason
    assert anomaly.expense_id is not None


def test_does_not_flag_normal_spending(db_session):
    alice, _, _ = _setup(db_session, [100, 150, 120, 90, 130])
    out = SpendingAnalyzerService(db_session).detect_anomalies(alice)
    expense_anomalies = [item for item in out.anomalies if item.kind == "expense"]
    assert expense_anomalies == []


def test_no_data_returns_empty(db_session):
    carol = make_user(db_session, "Carol")
    out = SpendingAnalyzerService(db_session).detect_anomalies(carol)
    assert out.count == 0
    assert out.anomalies == []


def test_isolation_from_other_users_data(db_session):
    alice, _, _ = _setup(db_session, [100, 100, 1000])
    outsider = make_user(db_session, "Eve")
    out = SpendingAnalyzerService(db_session).detect_anomalies(outsider)
    assert out.count == 0
