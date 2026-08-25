"""Structured receipt parsing and the image-scan endpoint."""
from decimal import Decimal

import pytest
from fastapi.testclient import TestClient

from app.ai.receipt_processor import (
    ReceiptExtractionError,
    extract_receipt,
)
from app.core.database import get_db
from app.core.security import create_access_token
from app.main import app
from app.models.user import User
from tests.helpers import make_user

SPICE_GARDEN = """Spice Garden
25-08-2026

Veg Manchurian     1    180.00
Paneer Butter Masala 1  220.00
Fried Rice          2    300.00

Subtotal                 700.00
CGST                       28.00
SGST                       28.00
Grand Total              756.00
"""


@pytest.fixture()
def client(db_session):
    user = make_user(db_session, "Scanner")
    db_session.commit()
    app.dependency_overrides[get_db] = lambda: db_session
    token = create_access_token(user.id)
    yield TestClient(app), user, token
    app.dependency_overrides.pop(get_db, None)


def _auth(token):
    return {"Authorization": f"Bearer {token}"}


def test_structured_parse_spice_garden():
    info = extract_receipt(SPICE_GARDEN)

    assert info.merchant == "Spice Garden"
    assert info.date is not None and info.date.month == 8 and info.date.year == 2026
    assert info.subtotal == Decimal("700.00")
    assert info.tax == Decimal("56.00")
    assert info.total == Decimal("756.00")
    assert info.amount == Decimal("756.00")
    assert info.currency == "INR"

    names = [item.name for item in info.items]
    assert "Veg Manchurian" in names
    assert "Paneer Butter Masala" in names
    assert "Fried Rice" in names

    fried_rice = next(item for item in info.items if item.name == "Fried Rice")
    assert fried_rice.quantity == Decimal("2")
    assert fried_rice.total == Decimal("300.00")
    assert fried_rice.unit_price == Decimal("150.00")


def test_simple_item_lines_and_total_hint():
    text = "Cafe Coffee Day\n12 Aug 2026\nCoffee 120.00\nSandwich 180.00\nTOTAL 300.00"
    info = extract_receipt(text)
    assert info.merchant == "Cafe Coffee Day"
    assert {item.name for item in info.items} >= {"Coffee", "Sandwich"}
    assert info.total == Decimal("300.00")


def test_scan_endpoint_success(monkeypatch, client):
    test_client, user, token = client

    def _fake_extract(image_bytes, media_type):
        return extract_receipt(SPICE_GARDEN)

    monkeypatch.setattr(
        "app.routes.receipt.extract_receipt_from_image", _fake_extract
    )
    response = test_client.post(
        "/api/ai/receipt/scan",
        headers=_auth(token),
        files={"image": ("receipt.png", b"\x89PNG fake-bytes", "image/png")},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["extracted"] is True
    assert body["merchant"] == "Spice Garden"
    assert body["total"] == "756.00"
    assert len(body["items"]) == 3
    assert body["raw_text"].startswith("Spice Garden")


def test_scan_endpoint_rejects_unsupported_type(client):
    test_client, _, token = client
    response = test_client.post(
        "/api/ai/receipt/scan",
        headers=_auth(token),
        files={"image": ("notes.pdf", b"%PDF-1.4", "application/pdf")},
    )
    assert response.status_code == 415
    assert "JPG" in response.json()["detail"]


def test_scan_endpoint_rejects_empty_file(client):
    test_client, _, token = client
    response = test_client.post(
        "/api/ai/receipt/scan",
        headers=_auth(token),
        files={"image": ("blank.png", b"", "image/png")},
    )
    assert response.status_code == 400


def test_scan_endpoint_returns_friendly_error_on_failure(
    monkeypatch, client
):
    test_client, _, token = client

    def _boom(image_bytes, media_type):
        raise ReceiptExtractionError(
            "We couldn't read this receipt. Try uploading a clearer image."
        )

    monkeypatch.setattr("app.routes.receipt.extract_receipt_from_image", _boom)
    response = test_client.post(
        "/api/ai/receipt/scan",
        headers=_auth(token),
        files={"image": ("blur.jpg", b"jpgbytes", "image/jpeg")},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["extracted"] is False
    assert "clearer image" in body["error"]


def test_scan_requires_auth(client):
    test_client, _, _ = client
    response = test_client.post(
        "/api/ai/receipt/scan",
        files={"image": ("receipt.png", b"bytes", "image/png")},
    )
    assert response.status_code == 401


def test_text_endpoint_includes_structured_fields(client):
    test_client, _, token = client
    response = test_client.post(
        "/api/ai/receipt/extract",
        headers=_auth(token),
        json={"text": SPICE_GARDEN},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["extracted"] is True
    assert body["subtotal"] == "700.00"
    assert body["tax"] == "56.00"
    assert any(item["name"] == "Fried Rice" for item in body["items"])
