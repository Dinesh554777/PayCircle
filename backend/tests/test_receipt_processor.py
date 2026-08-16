"""Receipt-to-Expense assistant tests."""
from datetime import datetime, timezone
from decimal import Decimal

import pytest

from app.ai.receipt_processor import (
    ReceiptExtractionError,
    extract_receipt,
)


def test_extracts_full_receipt():
    info = extract_receipt(
        "Cafe Coffee Day\n"
        "12 Aug 2026\n"
        "Coffee 120.00\n"
        "Sandwich 180.00\n"
        "TOTAL 300.00\n"
    )
    assert info.merchant == "Cafe Coffee Day"
    assert info.amount == Decimal("300.00")
    assert info.date == datetime(2026, 8, 12, tzinfo=timezone.utc)
    assert info.category == "Food"
    assert info.confidence >= 0.7


def test_extracts_inr_amount_and_dd_mm_yyyy():
    info = extract_receipt(
        "Metro Store\n"
        "15/03/2026\n"
        "Grocery items ₹1,234.50\n"
        "GRAND TOTAL ₹1,234.50\n"
    )
    assert info.amount == Decimal("1234.50")
    assert info.date == datetime(2026, 3, 15, tzinfo=timezone.utc)
    assert info.category == "Food"  # grocery items are categorized as Food


def test_uses_largest_amount_when_no_total_line():
    info = extract_receipt(
        "Quick Mart\n"
        "Rice 40.00\n"
        "Milk 25.00\n"
        "Oil 105.00\n"
    )
    assert info.amount == Decimal("105.00")


def test_fails_gracefully_without_amount():
    with pytest.raises(ReceiptExtractionError):
        extract_receipt("Lunch with friends\nNo numbers here")


def test_failure_message_suggests_manual_entry():
    with pytest.raises(ReceiptExtractionError) as exc:
        extract_receipt("Some receipt\nwords only")
    assert "manually" in str(exc.value)
