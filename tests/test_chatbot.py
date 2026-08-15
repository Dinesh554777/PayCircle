import app.services.chatbot_service as chatbot_service_module
from decimal import Decimal

from ai.chatbot import NO_DATA_MESSAGE, UNRELATED_MESSAGE


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


def _expense(client, token, group_id, title, amount, paid_by, date=None, **extra):
    payload = {"title": title, "amount": amount, "paid_by": paid_by}
    if date is not None:
        payload["expense_date"] = date
    payload.update(extra)
    return client.post(
        f"/api/groups/{group_id}/expenses",
        headers=_auth(token),
        json=payload,
    ).json()


def _chat(client, token, message):
    return client.post(
        "/api/ai/chat",
        headers=_auth(token),
        json={"message": message},
    )


class RecordingChatbot:
    def __init__(self):
        self.calls = []

    def answer(self, question, context):
        self.calls.append((question, context))
        return f"Answer for: {question}"


def _stub_chatbot(monkeypatch, stub):
    monkeypatch.setattr(chatbot_service_module, "Chatbot", lambda: stub)


def test_chat_requires_auth(client):
    assert client.post("/api/ai/chat", json={"message": "hi"}).status_code == 401


def test_chat_empty_message_rejected(client):
    _, token = _register(client, "Alice", "alice@example.com")
    assert _chat(client, token, "").status_code == 422


def test_chat_blank_message_rejected(client):
    _, token = _register(client, "Alice", "alice@example.com")
    response = _chat(client, token, "   ")
    assert response.status_code == 400
    assert response.json()["detail"] == "Message cannot be empty"


def test_chat_normal_question_uses_user_data(client, monkeypatch):
    stub = RecordingChatbot()
    _stub_chatbot(monkeypatch, stub)
    alice, token, group = _setup_group(client)
    _expense(client, token, group["id"], "Dinner", "30.00", alice["id"])

    response = _chat(client, token, "How much did I spend this month?")
    assert response.status_code == 200
    assert response.json()["answer"] == "Answer for: How much did I spend this month?"

    assert len(stub.calls) == 1
    question, context = stub.calls[0]
    assert question == "How much did I spend this month?"
    assert context["has_data"] is True
    assert context["summary"] != ""
    assert context["recent_expenses"][0]["title"] == "Dinner"


def test_chat_unrelated_question_not_sent_to_ai(client, monkeypatch):
    stub = RecordingChatbot()
    _stub_chatbot(monkeypatch, stub)
    alice, token, group = _setup_group(client)
    _expense(client, token, group["id"], "Dinner", "30.00", alice["id"])

    response = _chat(client, token, "What is the weather today?")
    assert response.status_code == 200
    assert response.json()["answer"] == UNRELATED_MESSAGE
    assert stub.calls == []


def test_chat_no_data_returns_helpful_message(client, monkeypatch):
    stub = RecordingChatbot()
    _stub_chatbot(monkeypatch, stub)
    _, token = _register(client, "Alice", "alice@example.com")

    response = _chat(client, token, "How much did I spend this month?")
    assert response.status_code == 200
    assert response.json()["answer"] == NO_DATA_MESSAGE
    assert stub.calls == []


def test_chat_does_not_leak_other_users_private_expenses(client, monkeypatch):
    stub = RecordingChatbot()
    _stub_chatbot(monkeypatch, stub)
    alice, alice_token, group = _setup_group(client)
    _, bob_token = _register(client, "Eve", "eve@example.com")
    _expense(
        client,
        alice_token,
        group["id"],
        "Secret splurge",
        "100.00",
        alice["id"],
        category="Shopping",
    )

    response = _chat(client, bob_token, "Show my recent expenses.")
    assert response.status_code == 200
    assert "Secret splurge" not in response.json()["answer"]
    assert stub.calls == []

    _chat(client, alice_token, "Show my recent expenses.")
    assert len(stub.calls) == 1
    question, context = stub.calls[0]
    assert any(
        expense["title"] == "Secret splurge" for expense in context["recent_expenses"]
    )


def test_chat_who_to_pay_uses_balances(client, monkeypatch):
    stub = RecordingChatbot()
    _stub_chatbot(monkeypatch, stub)
    alice, alice_token = _register(client, "Alice", "alice@example.com")
    bobby, _ = _register(client, "Bobby", "bobby@example.com")
    group = client.post(
        "/api/groups", headers=_auth(alice_token), json={"name": "Trip"}
    ).json()
    client.post(
        f"/api/groups/{group['id']}/members",
        headers=_auth(alice_token),
        json={"user_id": bobby["id"]},
    )
    # Bobby pays 40 split between Alice and Bobby -> Alice owes Bobby 20
    _expense(client, alice_token, group["id"], "Groceries", "40.00", bobby["id"])

    response = _chat(client, alice_token, "Who should I pay?")
    assert response.status_code == 200
    assert len(stub.calls) == 1
    question, context = stub.calls[0]
    assert len(context["balances"]["you_owe"]) == 1
    assert context["balances"]["you_owe"][0]["amount"] == Decimal("20.00")
    assert context["balances"]["you_owe"][0]["to"] == "Bobby"
    assert context["balances"]["you_are_owed"] == []
