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


def test_full_user_group_expense_settlement_flow(client):
    alice, alice_token = _register(client, "Alice", "alice@example.com")
    bob, _ = _register(client, "Bob", "bob@example.com")

    group = client.post(
        "/api/groups",
        headers=_auth(alice_token),
        json={"name": "Trip", "description": "Goa trip"},
    )
    assert group.status_code == 201
    group_id = group.json()["id"]

    member = client.post(
        f"/api/groups/{group_id}/members",
        headers=_auth(alice_token),
        json={"user_id": bob["id"], "role": "member"},
    )
    assert member.status_code == 201
    assert member.json()["user_id"] == bob["id"]

    expense = client.post(
        f"/api/groups/{group_id}/expenses",
        headers=_auth(alice_token),
        json={
            "title": "Pizza dinner",
            "amount": "30.00",
            "paid_by": alice["id"],
            "split_method": "exact",
            "exact_amounts": [
                {"user_id": alice["id"], "amount": "15.00"},
                {"user_id": bob["id"], "amount": "15.00"},
            ],
        },
    )
    assert expense.status_code == 201
    assert len(expense.json()["splits"]) == 2

    settlement = client.post(
        f"/api/groups/{group_id}/settlements",
        headers=_auth(alice_token),
        json={"payer_id": bob["id"], "receiver_id": alice["id"], "amount": "15.00"},
    )
    assert settlement.status_code == 201
    assert settlement.json()["receiver_id"] == alice["id"]
    assert settlement.json()["status"] == "pending"

    transactions = client.get(
        f"/api/groups/{group_id}/transactions", headers=_auth(alice_token)
    )
    assert transactions.status_code == 200
    assert len(transactions.json()) == 2


def test_duplicate_email_rejected(client):
    assert _register(client, "Alice", "alice@example.com")[0]["id"] > 0
    response = client.post(
        "/api/auth/register",
        json={"name": "Alice Again", "email": "alice@example.com", "password": "secret123"},
    )
    assert response.status_code == 409


def test_split_amounts_must_match_expense(client):
    alice, alice_token = _register(client, "Alice", "alice@example.com")
    group = client.post(
        "/api/groups",
        headers=_auth(alice_token),
        json={"name": "Trip"},
    )
    assert group.status_code == 201
    group_id = group.json()["id"]

    response = client.post(
        f"/api/groups/{group_id}/expenses",
        headers=_auth(alice_token),
        json={
            "title": "Taxi",
            "amount": "50.00",
            "paid_by": alice["id"],
            "split_method": "exact",
            "exact_amounts": [{"user_id": alice["id"], "amount": "10.00"}],
        },
    )
    assert response.status_code == 400
    assert "must equal" in response.json()["detail"]


def test_duplicate_member_rejected(client):
    alice, alice_token = _register(client, "Alice", "alice@example.com")
    group = client.post(
        "/api/groups",
        headers=_auth(alice_token),
        json={"name": "Trip"},
    )
    assert group.status_code == 201
    group_id = group.json()["id"]

    duplicate = client.post(
        f"/api/groups/{group_id}/members",
        headers=_auth(alice_token),
        json={"user_id": alice["id"]},
    )
    assert duplicate.status_code == 409
