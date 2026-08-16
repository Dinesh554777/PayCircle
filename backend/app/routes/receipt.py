from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.ai.receipt_processor import (
    ReceiptExtractionError,
    extract_receipt,
)
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.schemas.receipt import ReceiptExtractIn, ReceiptExtractOut

router = APIRouter()


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
    return ReceiptExtractOut(
        extracted=True,
        merchant=info.merchant,
        amount=info.amount,
        date=info.date,
        category=info.category,
        confidence=round(info.confidence, 2),
        notes=info.notes,
    )
