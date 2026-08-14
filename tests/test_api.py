def _create_user(client, name, email):
    return client.post(
        "/api/users",
        json={"name": name, "email": email, "password": "secret123"},
    )


def test_full_user_group_expense_settlement_flow(client):
    alice = _create_user(client, "Alice", "alice@example.com").json()
    bob = _create_user(client, "Bob", "bob@example.com").json()

    group = client.post(
        "/api/groups",
        json={"name": "Trip", "description": "Goa trip", "created_by": alice["id"]},
    )
    assert group.status_code == 201
    group_id = group.json()["id"]

    member = client.post(
        f"/api/groups/{group_id}/members", json={"user_id": bob["id"], "role": "member"}
    )
    assert member.status_code == 201
    assert member.json()["user_id"] == bob["id"]

    expense = client.post(
        f"/api/groups/{group_id}/expenses",
        json={
            "description": "Pizza dinner",
            "amount": "30.00",
            "payer_id": alice["id"],
            "splits": [
                {"user_id": alice["id"], "amount": "15.00"},
                {"user_id": bob["id"], "amount": "15.00"},
            ],
        },
    )
    assert expense.status_code == 201
    assert len(expense.json()["splits"]) == 2

    settlement = client.post(
        f"/api/groups/{group_id}/settlements",
        json={"payer_id": bob["id"], "receiver_id": alice["id"], "amount": "15.00"},
    )
    assert settlement.status_code == 201
    assert settlement.json()["receiver_id"] == alice["id"]

    transactions = client.get(f"/api/groups/{group_id}/transactions")
    assert transactions.status_code == 200
    assert len(transactions.json()) == 2


def test_duplicate_email_rejected(client):
    assert _create_user(client, "Alice", "alice@example.com").status_code == 201
    response = _create_user(client, "Alice Again", "alice@example.com")
    assert response.status_code == 409


def test_split_amounts_must_match_expense(client):
    alice = _create_user(client, "Alice", "alice@example.com").json()
    group = client.post(
        "/api/groups", json={"name": "Trip", "created_by": alice["id"]}
    ).json()

    response = client.post(
        f"/api/groups/{group['id']}/expenses",
        json={
            "description": "Taxi",
            "amount": "50.00",
            "payer_id": alice["id"],
            "splits": [{"user_id": alice["id"], "amount": "10.00"}],
        },
    )
    assert response.status_code == 400
    assert "must equal" in response.json()["detail"]


def test_duplicate_member_rejected(client):
    alice = _create_user(client, "Alice", "alice@example.com").json()
    group = client.post(
        "/api/groups", json={"name": "Trip", "created_by": alice["id"]}
    ).json()

    duplicate = client.post(
        f"/api/groups/{group['id']}/members", json={"user_id": alice["id"]}
    )
    assert duplicate.status_code == 409
