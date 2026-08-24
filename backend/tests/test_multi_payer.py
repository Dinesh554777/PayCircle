"""Multi-payer expense support: creation, validation, balances, settlements."""
from decimal import Decimal

import pytest
from fastapi import HTTPException
from pydantic import ValidationError

from app.models.expense_payment import ExpensePayment
from app.schemas.expense import ExpenseCreate, ExpenseUpdate
from app.services.balance_service import BalanceService
from app.services.expense_service import ExpenseService
from tests.helpers import add_member, make_group, make_user


def _four_member_group(db):
    a = make_user(db, "Alice")
    b = make_user(db, "Bob")
    c = make_user(db, "Carol")
    d = make_user(db, "Dave")
    group = make_group(db, a, "Foodies")
    add_member(db, group, b)
    add_member(db, group, c)
    add_member(db, group, d)
    return group, a, b, c, d


def _food_expense_data(a, b):
    return ExpenseCreate(
        title="Food",
        amount="800",
        category="Food",
        paid_by=a.id,
        split_method="equal",
        participants=[a.id, b.id],
        payments=[
            {"user_id": a.id, "amount": "500"},
            {"user_id": b.id, "amount": "300"},
        ],
    )


def test_multi_payer_expense_stores_payment_records(db_session):
    group, a, b, c, d = _four_member_group(db_session)
    data = ExpenseCreate(
        title="Food",
        amount="800",
        category="Food",
        paid_by=a.id,
        split_method="equal",
        participants=[a.id, b.id, c.id, d.id],
        payments=[
            {"user_id": a.id, "amount": "500"},
            {"user_id": b.id, "amount": "300"},
        ],
    )

    expense = ExpenseService(db_session).create_expense(group.id, data, a)

    stored = {
        row.user_id: row.amount
        for row in db_session.query(ExpensePayment)
        .filter(ExpensePayment.expense_id == expense.id)
        .all()
    }
    assert stored == {a.id: Decimal("500.00"), b.id: Decimal("300.00")}
    assert expense.payer_id == a.id

    splits = {s.user_id: s.amount for s in expense.splits}
    assert splits == {
        a.id: Decimal("200.00"),
        b.id: Decimal("200.00"),
        c.id: Decimal("200.00"),
        d.id: Decimal("200.00"),
    }


def test_balances_with_multiple_payers(db_session):
    group, a, b, c, d = _four_member_group(db_session)
    data = ExpenseCreate(
        title="Food",
        amount="800",
        paid_by=a.id,
        split_method="equal",
        participants=[a.id, b.id, c.id, d.id],
        payments=[
            {"user_id": a.id, "amount": "500"},
            {"user_id": b.id, "amount": "300"},
        ],
    )
    ExpenseService(db_session).create_expense(group.id, data, a)

    result = BalanceService(db_session).get_balances(group.id, a)
    nets = {item.user_id: item.net_balance for item in result.balances}
    paids = {item.user_id: item.total_paid for item in result.balances}
    oweds = {item.user_id: item.total_owed for item in result.balances}

    assert paids[a.id] == Decimal("500.00")
    assert paids[b.id] == Decimal("300.00")
    assert paids[c.id] == Decimal("0.00")
    assert paids[d.id] == Decimal("0.00")
    for user_id in (a.id, b.id, c.id, d.id):
        assert oweds[user_id] == Decimal("200.00")

    assert nets[a.id] == Decimal("300.00")
    assert nets[b.id] == Decimal("100.00")
    assert nets[c.id] == Decimal("-200.00")
    assert nets[d.id] == Decimal("-200.00")


def test_simplified_settlements_are_generated_algorithmically(db_session):
    group, a, b, c, d = _four_member_group(db_session)
    data = ExpenseCreate(
        title="Food",
        amount="800",
        paid_by=a.id,
        split_method="equal",
        participants=[a.id, b.id, c.id, d.id],
        payments=[
            {"user_id": a.id, "amount": "500"},
            {"user_id": b.id, "amount": "300"},
        ],
    )
    ExpenseService(db_session).create_expense(group.id, data, a)

    result = BalanceService(db_session).get_balances(group.id, a)
    transfers = [
        (t.from_user_id, t.to_user_id, t.amount) for t in result.who_owes_whom
    ]

    assert sum(amount for _, _, amount in transfers) == Decimal("400.00")
    net_after: dict[int, Decimal] = {}
    for from_id, to_id, amount in transfers:
        net_after[from_id] = net_after.get(from_id, Decimal("0")) - amount
        net_after[to_id] = net_after.get(to_id, Decimal("0")) + amount
    assert net_after[c.id] == Decimal("-200.00")
    assert net_after[d.id] == Decimal("-200.00")
    assert net_after[a.id] == Decimal("300.00")
    assert net_after[b.id] == Decimal("100.00")
    assert len(transfers) == 3


def test_single_payer_payload_without_payments_still_works(db_session):
    group, a, b, _, _ = _four_member_group(db_session)
    data = ExpenseCreate(
        title="Groceries",
        amount="100",
        paid_by=a.id,
        split_method="equal",
        participants=[a.id, b.id],
    )

    expense = ExpenseService(db_session).create_expense(group.id, data, a)
    rows = (
        db_session.query(ExpensePayment)
        .filter(ExpensePayment.expense_id == expense.id)
        .all()
    )
    assert len(rows) == 1
    assert rows[0].user_id == a.id
    assert rows[0].amount == Decimal("100.00")


def test_payment_total_mismatch_is_rejected(db_session):
    group, a, b, c, d = _four_member_group(db_session)
    data = ExpenseCreate(
        title="Food",
        amount="800",
        paid_by=a.id,
        split_method="equal",
        participants=[a.id, b.id, c.id, d.id],
        payments=[
            {"user_id": a.id, "amount": "400"},
            {"user_id": b.id, "amount": "300"},
        ],
    )
    with pytest.raises(HTTPException) as exc:
        ExpenseService(db_session).create_expense(group.id, data, a)
    assert exc.value.status_code == 400
    assert "₹800.00" in exc.value.detail


def test_negative_or_zero_payment_amount_rejected(db_session):
    group, a, b, _, _ = _four_member_group(db_session)
    with pytest.raises(ValidationError):
        ExpenseCreate(
            title="Bad",
            amount="100",
            paid_by=a.id,
            split_method="equal",
            payments=[
                {"user_id": a.id, "amount": "-50"},
                {"user_id": b.id, "amount": "150"},
            ],
        )


def test_non_member_payer_rejected(db_session):
    group, a, b, _, _ = _four_member_group(db_session)
    outsider = make_user(db_session, "Zed")
    data = ExpenseCreate(
        title="Sneaky",
        amount="100",
        paid_by=a.id,
        split_method="equal",
        payments=[
            {"user_id": outsider.id, "amount": "60"},
            {"user_id": a.id, "amount": "40"},
        ],
    )
    with pytest.raises(HTTPException) as exc:
        ExpenseService(db_session).create_expense(group.id, data, a)
    assert exc.value.status_code == 400
    assert "not a member" in exc.value.detail


def test_duplicate_payer_rejected(db_session):
    group, a, b, _, _ = _four_member_group(db_session)
    data = ExpenseCreate(
        title="Dup",
        amount="100",
        paid_by=a.id,
        split_method="equal",
        payments=[
            {"user_id": a.id, "amount": "60"},
            {"user_id": a.id, "amount": "40"},
        ],
    )
    with pytest.raises(HTTPException) as exc:
        ExpenseService(db_session).create_expense(group.id, data, a)
    assert exc.value.status_code == 400
    assert "Duplicate" in exc.value.detail


def test_update_replaces_payment_records(db_session):
    group, a, b, _, _ = _four_member_group(db_session)
    service = ExpenseService(db_session)
    created = service.create_expense(group.id, _food_expense_data(a, b), a)

    update = ExpenseUpdate(
        title="Food",
        amount="800",
        paid_by=b.id,
        split_method="equal",
        participants=[a.id, b.id],
        payments=[{"user_id": b.id, "amount": "800"}],
    )
    updated = service.update_expense(group.id, created.id, update, a)

    rows = (
        db_session.query(ExpensePayment)
        .filter(ExpensePayment.expense_id == updated.id)
        .all()
    )
    assert len(rows) == 1
    assert rows[0].user_id == b.id
    assert rows[0].amount == Decimal("800.00")
    assert updated.payer_id == b.id


def test_delete_removes_payment_records(db_session):
    group, a, b, _, _ = _four_member_group(db_session)
    service = ExpenseService(db_session)
    created = service.create_expense(group.id, _food_expense_data(a, b), a)

    service.delete_expense(group.id, created.id, a)

    remaining = (
        db_session.query(ExpensePayment)
        .filter(ExpensePayment.expense_id == created.id)
        .all()
    )
    assert remaining == []


def test_three_members_two_payers_percentage_split(db_session):
    group, a, b, c, _ = _four_member_group(db_session)
    data = ExpenseCreate(
        title="Taxi",
        amount="90",
        paid_by=a.id,
        split_method="percentage",
        percentages=[
            {"user_id": a.id, "percentage": "50"},
            {"user_id": b.id, "percentage": "30"},
            {"user_id": c.id, "percentage": "20"},
        ],
        payments=[
            {"user_id": a.id, "amount": "40"},
            {"user_id": b.id, "amount": "50"},
        ],
    )
    expense = ExpenseService(db_session).create_expense(group.id, data, a)

    shares = {s.user_id: s.amount for s in expense.splits}
    assert shares[a.id] == Decimal("45.00")
    assert shares[b.id] == Decimal("27.00")
    assert shares[c.id] == Decimal("18.00")

    result = BalanceService(db_session).get_balances(group.id, a)
    nets = {item.user_id: item.net_balance for item in result.balances}
    assert nets[a.id] == Decimal("-5.00")
    assert nets[b.id] == Decimal("23.00")
    assert nets[c.id] == Decimal("-18.00")
