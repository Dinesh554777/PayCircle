import logging

from fastapi import APIRouter, Depends, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.ai.receipt_processor import (
    ReceiptExtractionError,
    extract_receipt,
    extract_receipt_from_image,
)
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.schemas.receipt import ReceiptExtractIn, ReceiptExtractOut, ReceiptItem

router = APIRouter()
logger = logging.getLogger("paycircle.receipt")

ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp"}
MAX_IMAGE_BYTES = 8 * 1024 * 1024


def _receipt_out(info) -> ReceiptExtractOut:
    return ReceiptExtractOut(
        extracted=True,
        merchant=info.merchant,
        amount=info.amount,
        date=info.date,
        category=info.category,
        confidence=round(info.confidence, 2),
        notes=list(info.notes),
        raw_text=info.raw_text,
        items=[
            ReceiptItem(
                name=item.name,
                quantity=item.quantity,
                unit_price=item.unit_price,
                total=item.total,
            )
            for item in info.items
        ],
        subtotal=info.subtotal,
        tax=info.tax,
        discount=info.discount,
        total=info.total,
        currency=info.currency,
    )


@router.post("/receipt/extract", response_model=ReceiptExtractOut)
def extract_receipt_info(
    data: ReceiptExtractIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        info = extract_receipt(data.text)
    except ReceiptExtractionError as exc:
        return ReceiptExtractOut(extracted=False, error=str(exc))
    return _receipt_out(info)


@router.post("/receipt/scan", response_model=ReceiptExtractOut)
async def scan_receipt_image(
    image: UploadFile,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    content_type = (image.content_type or "").lower()
    if content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(
            status_code=415,
            detail="Unsupported file type. Please upload a JPG, PNG or WEBP image.",
        )
    image_bytes = await image.read()
    if not image_bytes:
        raise HTTPException(status_code=400, detail="The uploaded image is empty.")
    if len(image_bytes) > MAX_IMAGE_BYTES:
        raise HTTPException(
            status_code=413,
            detail="Image is too large. Maximum size is 8 MB.",
        )

    try:
        info = extract_receipt_from_image(image_bytes, content_type)
    except ReceiptExtractionError as exc:
        cause = repr(exc.__cause__) if exc.__cause__ else "no underlying cause"
        logger.warning(
            "Receipt scan failed for user %s: %s (%s)",
            current_user.id,
            str(exc)[:200],
            cause[:300],
        )
        return ReceiptExtractOut(extracted=False, error=str(exc))
    except Exception:
        logger.exception("Receipt scan crashed for user %s", current_user.id)
        raise HTTPException(
            status_code=503,
            detail="We couldn't read this receipt right now. Please try again.",
        ) from None
    return _receipt_out(info)
