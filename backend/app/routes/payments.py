from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.schemas.payment import (
    PaymentCreateOrder,
    PaymentOrderRead,
    PaymentRead,
    PaymentVerify,
    PaymentVerifyRead,
)
from app.services.payment_service import PaymentService

router = APIRouter()


@router.post("/create-order", response_model=PaymentOrderRead, status_code=status.HTTP_201_CREATED)
def create_order(
    data: PaymentCreateOrder,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    payment, order = PaymentService(db).create_order(data.settlement_id, current_user)
    return {
        "payment_id": payment.id,
        "settlement_id": payment.settlement_id,
        "razorpay_key_id": PaymentService(db).settings.RAZORPAY_KEY_ID,
        "razorpay_order_id": payment.razorpay_order_id,
        "amount": payment.amount,
        "amount_paise": order["amount"],
        "currency": payment.currency,
        "status": payment.payment_status,
    }


@router.post("/verify", response_model=PaymentVerifyRead)
def verify_payment(
    data: PaymentVerify,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    payment = PaymentService(db).verify(data, current_user)
    return {"payment": payment, "settlement_status": payment.settlement.status}


@router.get("", response_model=list[PaymentRead])
def list_payments(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return PaymentService(db).list_for_user(current_user)


@router.get("/settlement/{settlement_id}", response_model=PaymentRead)
def get_payment_by_settlement(
    settlement_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return PaymentService(db).get_by_settlement(settlement_id, current_user)


@router.get("/{payment_id}", response_model=PaymentRead)
def get_payment(
    payment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return PaymentService(db).get_payment(payment_id, current_user)
