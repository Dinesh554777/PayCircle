from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict

from app.schemas.group import UserBrief


class PaymentCreateOrder(BaseModel):
    settlement_id: int


class PaymentOrderRead(BaseModel):
    payment_id: int
    settlement_id: int
    razorpay_key_id: str
    razorpay_order_id: str
    amount: Decimal
    amount_paise: int
    currency: str
    status: str


class PaymentVerify(BaseModel):
    settlement_id: int
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str


class PaymentRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    group_id: int
    settlement_id: int
    payer_id: int
    receiver_id: int
    amount: Decimal
    currency: str
    gateway: str
    razorpay_order_id: str
    razorpay_payment_id: str | None = None
    razorpay_signature: str | None = None
    payment_status: str
    paid_at: datetime | None = None
    created_at: datetime
    payer: UserBrief | None = None
    receiver: UserBrief | None = None


class PaymentVerifyRead(BaseModel):
    payment: PaymentRead
    settlement_status: str
