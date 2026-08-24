from decimal import Decimal

import pytest
from fastapi import HTTPException

from app.models.payment import Payment
from app.models.settlement import Settlement
from app.schemas.payment import PaymentVerify
from app.services.payment_service import PaymentService
from tests.helpers import add_member, make_group, make_user


class _FakeOrders:
    def create(self, payload):
        return {
            "id": "order_test_123",
            "amount": payload["amount"],
            "currency": payload["currency"],
            "status": "created",
        }


class _FakeUtility:
    def verify_payment_signature(self, payload):
        return True


class _FakeRazorpayClient:
    order = _FakeOrders()
    utility = _FakeUtility()


def _settlement(db):
    dinesh = make_user(db, "Dinesh", "dinesh@example.com")
    rahul = make_user(db, "Rahul", "rahul@example.com")
    group = make_group(db, dinesh, "Roommates")
    add_member(db, group, rahul)
    settlement = Settlement(
        group_id=group.id,
        payer_id=dinesh.id,
        receiver_id=rahul.id,
        amount=Decimal("500.00"),
        status="pending",
    )
    db.add(settlement)
    db.commit()
    db.refresh(settlement)
    return dinesh, rahul, group, settlement


def test_create_order_uses_settlement_payer_receiver_and_amount(db_session, monkeypatch):
    monkeypatch.setattr(PaymentService, "_client", lambda self: _FakeRazorpayClient())
    dinesh, rahul, _, settlement = _settlement(db_session)

    payment, order = PaymentService(db_session).create_order(settlement.id, dinesh)

    assert order["amount"] == 50000
    assert payment.settlement_id == settlement.id
    assert payment.payer_id == dinesh.id
    assert payment.receiver_id == rahul.id
    assert payment.amount == Decimal("500.00")
    assert payment.razorpay_order_id == "order_test_123"
    assert payment.payment_status == "created"


def test_non_payer_cannot_create_order_for_settlement(db_session, monkeypatch):
    monkeypatch.setattr(PaymentService, "_client", lambda self: _FakeRazorpayClient())
    _, rahul, _, settlement = _settlement(db_session)

    with pytest.raises(HTTPException) as exc:
        PaymentService(db_session).create_order(settlement.id, rahul)

    assert exc.value.status_code == 403
    assert "Only the payer" in exc.value.detail


def test_verify_completes_matching_payment_and_settlement(db_session, monkeypatch):
    monkeypatch.setattr(PaymentService, "_client", lambda self: _FakeRazorpayClient())
    dinesh, _, _, settlement = _settlement(db_session)
    payment, _ = PaymentService(db_session).create_order(settlement.id, dinesh)

    verified = PaymentService(db_session).verify(
        PaymentVerify(
            settlement_id=settlement.id,
            razorpay_order_id=payment.razorpay_order_id,
            razorpay_payment_id="pay_test_123",
            razorpay_signature="valid_signature",
        ),
        dinesh,
    )

    db_session.refresh(settlement)
    assert verified.payment_status == "completed"
    assert verified.razorpay_payment_id == "pay_test_123"
    assert settlement.status == "completed"
    assert settlement.completed_at is not None


def test_verify_rejects_payment_that_no_longer_matches_settlement(db_session, monkeypatch):
    monkeypatch.setattr(PaymentService, "_client", lambda self: _FakeRazorpayClient())
    dinesh, rahul, _, settlement = _settlement(db_session)
    payment = Payment(
        settlement_id=settlement.id,
        payer_id=dinesh.id,
        receiver_id=rahul.id,
        amount=Decimal("499.00"),
        currency="INR",
        gateway="razorpay",
        razorpay_order_id="order_tampered",
        payment_status="created",
    )
    db_session.add(payment)
    db_session.commit()

    with pytest.raises(HTTPException) as exc:
        PaymentService(db_session).verify(
            PaymentVerify(
                settlement_id=settlement.id,
                razorpay_order_id="order_tampered",
                razorpay_payment_id="pay_test_123",
                razorpay_signature="valid_signature",
            ),
            dinesh,
        )

    db_session.refresh(settlement)
    db_session.refresh(payment)
    assert exc.value.status_code == 400
    assert payment.payment_status == "failed"
    assert settlement.status == "failed"
