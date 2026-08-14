from decimal import Decimal


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


def _get_dashboard(client, token):
    return client.get("/api/dashboard", headers=_auth(token))


def _expense(client, token, group_id, title, amount, paid_by, method="equal", **extra):
    payload = {"title": title, "amount": amount, "paid_by": paid_by, "split_method": method}
    payload.update(extra)
    return client.post(
        f"/api/groups/{group_id}/expenses",
        headers=_auth(token),
        json=payload,
    ).json()


def test_dashboard_requires_auth(client):
    assert _get_dashboard(client, "not-a-token").status_code == 401


def test_dashboard_empty_state(client):
    _, token = _register(client, "Alice", "alice@example.com")
    data = _get_dashboard(client, token)
    assert data.status_code == 200
    body = data.json()
    assert body["group_count"] == 0
    assert body["total_expenses"] == "0.00"
    assert body["amount_paid"] == "0.00"
    assert body["amount_owed"] == "0.00"
    assert body["amount_to_receive"] == "0.00"
    assert body["recent_groups"] == []
    assert body["recent_transactions"] == []


def test_dashboard_aggregates_across_groups(client):
    alice, alice_token = _register(client, "Alice", "alice@example.com")
    bob, bob_token = _register(client, "Bob", "bob@example.com")
    carol, carol_token = _register(client, "Carol", "carol@example.com")

    trip = client.post(
        "/api/groups", headers=_auth(alice_token), json={"name": "Trip"}
    ).json()
    flat = client.post(
        "/api/groups", headers=_auth(alice_token), json={"name": "Flat"}
    ).json()

    for group in (trip, flat):
        client.post(
            f"/api/groups/{group['id']}/members",
            headers=_auth(alice_token),
            json={"user_id": bob["id"]},
        )
    client.post(
        f"/api/groups/{trip['id']}/members",
        headers=_auth(alice_token),
        json={"user_id": carol["id"]},
    )

    # Trip: alice pays 30 dinner split 3 ways (10 each)
    _expense(
        client, alice_token, trip["id"], "Dinner", "30.00", alice["id"]
    )
    # Flat: bob pays 9 coffee split between alice and bob (4.50 each)
    _expense(
        client,
        bob_token,
        flat["id"],
        "Coffee",
        "9.00",
        bob["id"],
        participants=[alice["id"], bob["id"]],
    )

    body = _get_dashboard(client, alice_token).json()
    assert body["group_count"] == 2
    assert body["total_expenses"] == "39.00"
    assert body["amount_paid"] == "30.00"
    # owed: Flat net -4.50 -> 4.50
    assert body["amount_owed"] == "4.50"
    # to receive: Trip net +20.00
    assert body["amount_to_receive"] == "20.00"

    groups_by_id = {g["id"]: g for g in body["recent_groups"]}
    trip_summary = groups_by_id[trip["id"]]
    assert trip_summary["member_count"] == 3
    assert trip_summary["total_expenses"] == "30.00"
    assert trip_summary["my_balance"] == "20.00"
    flat_summary = groups_by_id[flat["id"]]
    assert flat_summary["member_count"] == 2
    assert flat_summary["total_expenses"] == "9.00"
    assert flat_summary["my_balance"] == "-4.50"


def test_dashboard_owed_and_receive_with_settlement(client):
    alice, alice_token = _register(client, "Alice", "alice@example.com")
    bob, bob_token = _register(client, "Bob", "bob@example.com")

    group = client.post(
        "/api/groups", headers=_auth(alice_token), json={"name": "Trip"}
    ).json()
    client.post(
        f"/api/groups/{group['id']}/members",
        headers=_auth(alice_token),
        json={"user_id": bob["id"]},
    )
    _expense(client, alice_token, group["id"], "Dinner", "20.00", alice["id"])

    # alice receives 5, still owed 5
    settlement = client.post(
        f"/api/groups/{group['id']}/settlements",
        headers=_auth(alice_token),
        json={"payer_id": bob["id"], "receiver_id": alice["id"], "amount": "5.00"},
    ).json()
    client.patch(
        f"/api/groups/{group['id']}/settlements/{settlement['id']}",
        headers=_auth(alice_token),
        json={"status": "completed"},
    )

    body = _get_dashboard(client, alice_token).json()
    assert body["amount_to_receive"] == "5.00"
    assert body["amount_owed"] == "0.00"

    bob_body = _get_dashboard(client, bob_token).json()
    assert bob_body["amount_owed"] == "5.00"
    assert bob_body["amount_to_receive"] == "0.00"


def test_dashboard_recent_transactions(client):
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
    _expense(client, alice_token, group["id"], "Dinner", "20.00", alice["id"])
    settlement = client.post(
        f"/api/groups/{group['id']}/settlements",
        headers=_auth(alice_token),
        json={"payer_id": bob["id"], "receiver_id": alice["id"], "amount": "5.00"},
    ).json()
    client.patch(
        f"/api/groups/{group['id']}/settlements/{settlement['id']}",
        headers=_auth(alice_token),
        json={"status": "completed"},
    )

    body = _get_dashboard(client, alice_token).json()
    feed = body["recent_transactions"]
    assert len(feed) == 2
    assert {item["type"] for item in feed} == {"expense", "settlement"}

    expense_item = next(i for i in feed if i["type"] == "expense")
    assert expense_item["group"]["id"] == group["id"]
    assert expense_item["group"]["name"] == "Trip"
    assert expense_item["title"] == "Dinner"
    assert sum(Decimal(s["amount"]) for s in expense_item["splits"]) == Decimal("20.00")

    settlement_item = next(i for i in feed if i["type"] == "settlement")
    assert settlement_item["status"] == "completed"
    assert settlement_item["receiver"]["name"] == "Alice"
