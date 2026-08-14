import pytest

from ai.categorizer import CATEGORIES, CategorizationResult, GroqCategorizer
import app.services.expense_service as expense_service_module


def _register(client, name, email, password="secret123"):
    response = client.post(
        "/api/auth/register",
        json={"name": name, "email": email, "password": password},
    )
    assert response.status_code == 201
    data = response.json()
    return data["user"], data["access_token"]


def _auth(token):
    return {"Authorization": f"Bearer {token}"}


def _setup_group(client):
    alice, alice_token = _register(client, "Alice", "alice@example.com")
    bob, _ = _register(client, "Bob", "bob@example.com")
    group = client.post(
        "/api/groups", headers=_auth(alice_token), json={"name": "Trip"}
    ).json()
    client.post(
        f"/api/groups/{group['id']}/members",
        headers=_auth(alice_token),
        json={"user_id": bob["id"]},
    )
    return alice, alice_token, group


def _create(client, token, group_id, payload):
    return client.post(
        f"/api/groups/{group_id}/expenses",
        headers=_auth(token),
        json=payload,
    )


@pytest.mark.parametrize(
    "text,expected",
    [
        ("Pizza with friends", "Food"),
        ("Uber to college", "Transport"),
        ("Movie tickets", "Entertainment"),
        ("Electricity bill", "Utilities"),
        ("Rent for March", "Rent"),
        ("Medicine from pharmacy", "Healthcare"),
        ("Semester textbooks", "Education"),
        ("Flight to Goa", "Travel"),
        ("New shoes", "Shopping"),
        ("Miscellaneous", "Other"),
    ],
)
def test_keyword_fallback_samples(text, expected):
    categorizer = GroqCategorizer(api_key="")
    result = categorizer.categorize(text)
    assert result.category == expected
    assert result.ai_generated is False
    assert result.method == "fallback"


def test_categorizer_all_categories_present():
    assert len(CATEGORIES) == 10
    for expected in (
        "Food",
        "Transport",
        "Entertainment",
        "Shopping",
        "Utilities",
        "Healthcare",
        "Education",
        "Travel",
        "Rent",
        "Other",
    ):
        assert expected in CATEGORIES


def test_groq_parses_valid_response(monkeypatch):
    categorizer = GroqCategorizer(api_key="test-key")

    def fake_request(payload):
        assert payload["model"] == categorizer.model
        assert payload["response_format"] == {"type": "json_object"}
        return {
            "choices": [
                {"message": {"content": '{"category": "Transport", "confidence": 0.92}'}}
            ]
        }

    monkeypatch.setattr(categorizer, "_request", fake_request)
    result = categorizer.categorize("Uber to college")
    assert result.category == "Transport"
    assert result.confidence == pytest.approx(0.92)
    assert result.ai_generated is True
    assert result.method == "groq"


def test_groq_invalid_category_falls_back(monkeypatch):
    categorizer = GroqCategorizer(api_key="test-key")

    def fake_request(payload):
        return {"choices": [{"message": {"content": '{"category": "NotARealCat", "confidence": 0.9}'}}]}

    monkeypatch.setattr(categorizer, "_request", fake_request)
    result = categorizer.categorize("Uber to college")
    assert result.ai_generated is False
    assert result.method == "fallback"
    assert result.category == "Transport"


def test_groq_confidence_clamped(monkeypatch):
    categorizer = GroqCategorizer(api_key="test-key")

    def fake_request(payload):
        return {"choices": [{"message": {"content": '{"category": "Food", "confidence": 3.0}'}}]}

    monkeypatch.setattr(categorizer, "_request", fake_request)
    result = categorizer.categorize("Pizza")
    assert result.confidence == 1.0


def test_groq_request_failure_falls_back(monkeypatch):
    categorizer = GroqCategorizer(api_key="test-key")

    def boom(payload):
        raise TimeoutError("api down")

    monkeypatch.setattr(categorizer, "_request", boom)
    result = categorizer.categorize("Pizza with friends")
    assert result.category == "Food"
    assert result.ai_generated is False


def test_no_key_uses_fallback():
    categorizer = GroqCategorizer(api_key="")
    result = categorizer.categorize("Movie tickets")
    assert result.category == "Entertainment"
    assert result.ai_generated is False


def test_empty_text_is_other():
    categorizer = GroqCategorizer(api_key="")
    assert categorizer.categorize("   ").category == "Other"


def _stub(monkeypatch, result):
    class StubCategorizer:
        def categorize(self, text):
            return result

    monkeypatch.setattr(expense_service_module, "GroqCategorizer", lambda: StubCategorizer())


def test_create_expense_auto_categorizes(client, monkeypatch):
    _stub(monkeypatch, CategorizationResult("Transport", 0.9, True, "groq"))
    alice, token, group = _setup_group(client)

    response = _create(
        client,
        token,
        group["id"],
        {"title": "Uber to college", "amount": "10.00", "paid_by": alice["id"]},
    )
    assert response.status_code == 201
    data = response.json()
    assert data["category"] == "Transport"
    assert data["ai_category"] == "Transport"
    assert data["ai_confidence"] == pytest.approx(0.9)


def test_user_provided_category_not_overridden(client, monkeypatch):
    _stub(monkeypatch, CategorizationResult("Food", 0.99, True, "groq"))
    alice, token, group = _setup_group(client)

    response = _create(
        client,
        token,
        group["id"],
        {
            "title": "Uber to college",
            "amount": "10.00",
            "paid_by": alice["id"],
            "category": "Travel",
        },
    )
    assert response.status_code == 201
    data = response.json()
    assert data["category"] == "Travel"
    assert data["ai_category"] is None
    assert data["ai_confidence"] is None


def test_auto_categorize_disabled(client, monkeypatch):
    _stub(monkeypatch, CategorizationResult("Food", 0.99, True, "groq"))
    alice, token, group = _setup_group(client)

    response = _create(
        client,
        token,
        group["id"],
        {
            "title": "Pizza",
            "amount": "10.00",
            "paid_by": alice["id"],
            "auto_categorize": False,
        },
    )
    assert response.status_code == 201
    data = response.json()
    assert data["category"] is None
    assert data["ai_category"] is None


def test_ai_failure_still_saves_expense(client, monkeypatch):
    class Boom:
        def categorize(self, text):
            raise RuntimeError("AI service down")

    monkeypatch.setattr(expense_service_module, "GroqCategorizer", lambda: Boom())
    alice, token, group = _setup_group(client)

    response = _create(
        client,
        token,
        group["id"],
        {"title": "Pizza with friends", "amount": "20.00", "paid_by": alice["id"]},
    )
    assert response.status_code == 201
    data = response.json()
    assert data["title"] == "Pizza with friends"
    assert data["amount"] == "20.00"
    assert data["category"] is None
    assert data["ai_category"] is None


def test_fallback_category_saved_without_ai_flag(client, monkeypatch):
    _stub(monkeypatch, CategorizationResult("Utilities", None, False, "fallback"))
    alice, token, group = _setup_group(client)

    response = _create(
        client,
        token,
        group["id"],
        {"title": "Electricity bill", "amount": "50.00", "paid_by": alice["id"]},
    )
    assert response.status_code == 201
    data = response.json()
    assert data["category"] == "Utilities"
    assert data["ai_category"] is None


def test_manual_update_clears_ai_fields(client, monkeypatch):
    _stub(monkeypatch, CategorizationResult("Food", 0.95, True, "groq"))
    alice, token, group = _setup_group(client)

    created = _create(
        client,
        token,
        group["id"],
        {"title": "Pizza", "amount": "10.00", "paid_by": alice["id"]},
    ).json()
    assert created["ai_category"] == "Food"

    updated = client.put(
        f"/api/groups/{group['id']}/expenses/{created['id']}",
        headers=_auth(token),
        json={
            "title": "Pizza",
            "amount": "10.00",
            "paid_by": alice["id"],
            "category": "Shopping",
        },
    )
    assert updated.status_code == 200
    data = updated.json()
    assert data["category"] == "Shopping"
    assert data["ai_category"] is None
    assert data["ai_confidence"] is None


def test_feed_and_dashboard_expose_category(client, monkeypatch):
    _stub(monkeypatch, CategorizationResult("Entertainment", 0.88, True, "groq"))
    alice, token, group = _setup_group(client)
    _create(
        client,
        token,
        group["id"],
        {"title": "Movie tickets", "amount": "15.00", "paid_by": alice["id"]},
    )

    feed = client.get(
        f"/api/groups/{group['id']}/transactions", headers=_auth(token)
    ).json()
    assert feed[0]["category"] == "Entertainment"
    assert feed[0]["ai_category"] == "Entertainment"

    dashboard = client.get("/api/dashboard", headers=_auth(token)).json()
    item = dashboard["recent_transactions"][0]
    assert item["category"] == "Entertainment"
    assert item["ai_category"] == "Entertainment"
