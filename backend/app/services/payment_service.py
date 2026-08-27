from datetime import datetime, timezone
from decimal import Decimal, ROUND_HALF_UP

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models.payment import Payment
from app.models.settlement import Settlement
from app.models.transaction import Transaction
from app.models.user import User
from app.schemas.payment import PaymentVerify
from app.services.base import BaseService
from app.services.group_service import GroupService
from app.services.notification_service import NotificationService, NotificationType


class PaymentService(BaseService[Payment]):
    def __init__(self, db: Session) -> None:
        super().__init__(db, Payment)
        self.settings = get_settings()
        self.groups = GroupService(db)
        self.notifications = NotificationService(db)

    def _client(self):
        if not self.settings.RAZORPAY_KEY_ID or not self.settings.RAZORPAY_KEY_SECRET:
            raise HTTPException(status_code=503, detail="Razorpay is not configured")
        try:
            import razorpay
        except ImportError as exc:
            raise HTTPException(
                status_code=503, detail="Razorpay dependency is not installed"
            ) from exc
        return razorpay.Client(
            auth=(self.settings.RAZORPAY_KEY_ID, self.settings.RAZORPAY_KEY_SECRET)
        )

    def _amount_paise(self, amount: Decimal) -> int:
        return int((amount * Decimal("100")).quantize(Decimal("1"), rounding=ROUND_HALF_UP))

    def _get_settlement_for_payment(self, settlement_id: int, actor: User) -> Settlement:
        settlement = self.db.get(Settlement, settlement_id)
        if settlement is None:
            raise HTTPException(status_code=404, detail="Settlement not found")
        self.groups.get_group_for_user(settlement.group_id, actor)
        if settlement.payer_id != actor.id:
            raise HTTPException(status_code=403, detail="Only the payer can pay this settlement")
        if settlement.status == "completed":
            raise HTTPException(status_code=400, detail="Settlement is already completed")
        return settlement

    def create_order(self, settlement_id: int, actor: User) -> tuple[Payment, dict]:
        settlement = self._get_settlement_for_payment(settlement_id, actor)
        existing = (
            self.db.query(Payment).filter(Payment.settlement_id == settlement.id).one_or_none()
        )
        if existing and existing.payment_status == "completed":
            raise HTTPException(status_code=400, detail="Settlement is already paid")
        if existing and existing.payment_status in {"created", "processing"}:
            existing.payer_id = settlement.payer_id
            existing.receiver_id = settlement.receiver_id
            existing.amount = settlement.amount
            self.db.commit()
            self.db.refresh(existing)
            return existing, {
                "id": existing.razorpay_order_id,
                "amount": self._amount_paise(existing.amount),
                "currency": existing.currency,
                "status": existing.payment_status,
            }

        order = self._client().order.create(
            {
                "amount": self._amount_paise(settlement.amount),
                "currency": "INR",
                "receipt": f"settlement_{settlement.id}",
                "notes": {
                    "settlement_id": str(settlement.id),
                    "payer_id": str(settlement.payer_id),
                    "receiver_id": str(settlement.receiver_id),
                },
            }
        )
        if existing:
            payment = existing
            payment.razorpay_order_id = order["id"]
            payment.razorpay_payment_id = None
            payment.razorpay_signature = None
            payment.amount = settlement.amount
            payment.currency = order.get("currency", "INR")
            payment.payment_status = "created"
            payment.paid_at = None
            payment.payer_id = settlement.payer_id
            payment.receiver_id = settlement.receiver_id
        else:
            payment = Payment(
                settlement_id=settlement.id,
                payer_id=settlement.payer_id,
                receiver_id=settlement.receiver_id,
                amount=settlement.amount,
                currency=order.get("currency", "INR"),
                gateway="razorpay",
                razorpay_order_id=order["id"],
                payment_status="created",
            )
            self.db.add(payment)
        self.db.commit()
        self.db.refresh(payment)
        return payment, order

    def verify(self, data: PaymentVerify, actor: User) -> Payment:
        settlement = self._get_settlement_for_payment(data.settlement_id, actor)
        payment = (
            self.db.query(Payment)
            .filter(
                Payment.settlement_id == settlement.id,
                Payment.razorpay_order_id == data.razorpay_order_id,
            )
            .one_or_none()
        )
        if payment is None:
            raise HTTPException(status_code=404, detail="Payment order not found")
        if payment.payment_status == "completed" or settlement.status == "completed":
            raise HTTPException(status_code=400, detail="Settlement is already paid")
        if (
            payment.payer_id != settlement.payer_id
            or payment.receiver_id != settlement.receiver_id
            or payment.amount != settlement.amount
        ):
            payment.payment_status = "failed"
            settlement.status = "failed"
            self.db.commit()
            raise HTTPException(status_code=400, detail="Payment does not match settlement")

        try:
            self._client().utility.verify_payment_signature(
                {
                    "razorpay_order_id": data.razorpay_order_id,
                    "razorpay_payment_id": data.razorpay_payment_id,
                    "razorpay_signature": data.razorpay_signature,
                }
            )
        except Exception as exc:
            payment.payment_status = "failed"
            settlement.status = "failed"
            self._notify_failure(payment)
            self.db.commit()
            raise HTTPException(status_code=400, detail="Payment verification failed") from exc

        payment.razorpay_payment_id = data.razorpay_payment_id
        payment.razorpay_signature = data.razorpay_signature
        payment.payment_status = "completed"
        payment.paid_at = datetime.now(timezone.utc)
        settlement.status = "completed"
        settlement.settled_at = payment.paid_at
        self.db.add(
            Transaction(
                group_id=settlement.group_id,
                user_id=settlement.payer_id,
                type="settlement",
                amount=settlement.amount,
                description=f"Razorpay payment {payment.razorpay_payment_id}",
            )
        )
        self._notify_success(payment)
        self.db.commit()
        self.db.refresh(payment)
        return payment

    def get_payment(self, payment_id: int, actor: User) -> Payment:
        payment = self.db.get(Payment, payment_id)
        if payment is None:
            raise HTTPException(status_code=404, detail="Payment not found")
        self.groups.get_group_for_user(payment.settlement.group_id, actor)
        return payment

    def get_by_settlement(self, settlement_id: int, actor: User) -> Payment:
        settlement = self.db.get(Settlement, settlement_id)
        if settlement is None:
            raise HTTPException(status_code=404, detail="Settlement not found")
        self.groups.get_group_for_user(settlement.group_id, actor)
        payment = (
            self.db.query(Payment).filter(Payment.settlement_id == settlement_id).one_or_none()
        )
        if payment is None:
            raise HTTPException(status_code=404, detail="Payment not found")
        return payment

    def list_for_user(self, actor: User, group_id: int | None = None) -> list[Payment]:
        query = (
            self.db.query(Payment)
            .filter((Payment.payer_id == actor.id) | (Payment.receiver_id == actor.id))
        )
        if group_id is not None:
            self.groups.get_group_for_user(group_id, actor)
            query = query.join(Settlement, Settlement.id == Payment.settlement_id).filter(
                Settlement.group_id == group_id
            )
        return (
            query.order_by(Payment.created_at.desc(), Payment.id.desc())
            .all()
        )

    def _notify_success(self, payment: Payment) -> None:
        self.notifications.create_notification(
            payment.receiver_id,
            NotificationType.PAYMENT_SUCCESSFUL,
            "Payment successful",
            f"Payment of Rs {payment.amount:,.2f} was completed.",
            related_id=payment.id,
        )

    def _notify_failure(self, payment: Payment) -> None:
        self.notifications.create_notification(
            payment.payer_id,
            NotificationType.PAYMENT_FAILED,
            "Payment failed",
            f"Payment of Rs {payment.amount:,.2f} could not be verified.",
            related_id=payment.id,
        )
