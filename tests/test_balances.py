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


def _setup_group(client, members=("alice", "bob")):
    users = {}
    tokens = {}
    for name in members:
        user, token = _register(client, name.capitalize(), f"{name}@example.com")
        users[name] = user
        tokens[name] = token
    group = client.post(
        "/api/groups",
        headers=_auth(tokens[members[0]]),
        json={"name": "Trip"},
    ).json()
    for name in members[1:]:
        response = client.post(
            f"/api/groups/{group['id']}/members",
            headers=_auth(tokens[members[0]]),
            json={"user_id": users[name]["id"]},
        )
        assert response.status_code == 201
    return users, tokens, group


def _expense(client, token, group_id, title, amount, paid_by, method="equal", **extra):
    payload = {"title": title, "amount": amount, "paid_by": paid_by, "split_method": method}
    payload.update(extra)
    return client.post(
        f"/api/groups/{group_id}/expenses",
        headers=_auth(token),
        json=payload,
    ).json()


def _get_balance(client, token, group_id):
    return client.get(
        f"/api/groups/{group_id}/balances", headers=_auth(token)
    ).json()


def _by_user(balances, user_id):
    return next(b for b in balances if b["user_id"] == user_id)


def test_balance_api_requires_auth(client):
    assert client.get("/api/groups/1/balances").status_code == 401


def test_non_member_cannot_view_balances(client):
    _, alice_token = _register(client, "Alice", "alice@example.com")
    group = client.post(
        "/api/groups", headers=_auth(alice_token), json={"name": "Trip"}
    ).json()
    _, outsider_token = _register(client, "Mallory", "mallory@example.com")
    assert client.get(
        f"/api/groups/{group['id']}/balances", headers=_auth(outsider_token)
    ).status_code == 403


def test_balances_with_multiple_users_and_expenses(client):
    users, tokens, group = _setup_group(client, ["alice", "bob", "carol"])

    # alice pays 30 dinner, split equally 10/10/10
    _expense(
        client, tokens["alice"], group["id"], "Dinner", "30.00", users["alice"]["id"]
    )
    # bob pays 9 coffee, split equally between alice and bob 4.50/4.50
    _expense(
        client,
        tokens["bob"],
        group["id"],
        "Coffee",
        "9.00",
        users["bob"]["id"],
        participants=[users["alice"]["id"], users["bob"]["id"]],
    )

    data = _get_balance(client, tokens["alice"], group["id"])
    alice = _by_user(data["balances"], users["alice"]["id"])
    bob = _by_user(data["balances"], users["bob"]["id"])
    carol = _by_user(data["balances"], users["carol"]["id"])

    assert alice["total_paid"] == "30.00"
    assert alice["total_owed"] == "14.50"
    assert alice["net_balance"] == "15.50"

    assert bob["total_paid"] == "9.00"
    assert bob["total_owed"] == "14.50"
    assert bob["net_balance"] == "-5.50"

    assert carol["total_paid"] == "0.00"
    assert carol["total_owed"] == "10.00"
    assert carol["net_balance"] == "-10.00"

    # who owes whom: carol owes alice 10, bob owes alice 5.50
    transfers = data["who_owes_whom"]
    assert len(transfers) == 2
    by_from = {t["from_user_id"]: t for t in transfers}
    assert by_from[users["bob"]["id"]]["to_user_id"] == users["alice"]["id"]
    assert by_from[users["bob"]["id"]]["amount"] == "5.50"
    assert by_from[users["carol"]["id"]]["to_user_id"] == users["alice"]["id"]
    assert by_from[users["carol"]["id"]]["amount"] == "10.00"


def test_pending_settlement_does_not_change_balances(client):
    users, tokens, group = _setup_group(client)
    _expense(
        client, tokens["alice"], group["id"], "Dinner", "20.00", users["alice"]["id"]
    )

    settlement = client.post(
        f"/api/groups/{group['id']}/settlements",
        headers=_auth(tokens["alice"]),
        json={"payer_id": users["bob"]["id"], "receiver_id": users["alice"]["id"], "amount": "10.00"},
    )
    assert settlement.status_code == 201
    assert settlement.json()["status"] == "pending"

    data = _get_balance(client, tokens["alice"], group["id"])
    alice = _by_user(data["balances"], users["alice"]["id"])
    assert alice["net_balance"] == "10.00"
    assert alice["settlements_paid"] == "0.00"
    assert alice["settlements_received"] == "0.00"


def test_completed_settlement_changes_balances(client):
    users, tokens, group = _setup_group(client)
    _expense(
        client, tokens["alice"], group["id"], "Dinner", "20.00", users["alice"]["id"]
    )

    settlement = client.post(
        f"/api/groups/{group['id']}/settlements",
        headers=_auth(tokens["alice"]),
        json={"payer_id": users["bob"]["id"], "receiver_id": users["alice"]["id"], "amount": "10.00"},
    ).json()

    updated = client.patch(
        f"/api/groups/{group['id']}/settlements/{settlement['id']}",
        headers=_auth(tokens["alice"]),
        json={"status": "completed"},
    )
    assert updated.status_code == 200
    assert updated.json()["status"] == "completed"

    data = _get_balance(client, tokens["alice"], group["id"])
    alice = _by_user(data["balances"], users["alice"]["id"])
    bob = _by_user(data["balances"], users["bob"]["id"])
    assert alice["net_balance"] == "0.00"
    assert bob["net_balance"] == "0.00"
    assert alice["settlements_received"] == "10.00"
    assert bob["settlements_paid"] == "10.00"

    transfers = data["who_owes_whom"]
    assert transfers == []


def test_settlement_validation(client):
    users, tokens, group = _setup_group(client)
    base = {"payer_id": users["bob"]["id"], "receiver_id": users["alice"]["id"], "amount": "5.00"}

    same_user = client.post(
        f"/api/groups/{group['id']}/settlements",
        headers=_auth(tokens["alice"]),
        json={"payer_id": users["alice"]["id"], "receiver_id": users["alice"]["id"], "amount": "5.00"},
    )
    assert same_user.status_code == 400

    _, outsider_token = _register(client, "Mallory", "mallory@example.com")
    outsider = client.post(
        f"/api/groups/{group['id']}/settlements",
        headers=_auth(outsider_token),
        json=base,
    )
    assert outsider.status_code == 403

    zero = client.post(
        f"/api/groups/{group['id']}/settlements",
        headers=_auth(tokens["alice"]),
        json={"payer_id": users["bob"]["id"], "receiver_id": users["alice"]["id"], "amount": "0"},
    )
    assert zero.status_code == 422

    ok = client.post(
        f"/api/groups/{group['id']}/settlements",
        headers=_auth(tokens["alice"]),
        json=base,
    )
    assert ok.status_code == 201


def test_mark_completed_twice_rejected(client):
    users, tokens, group = _setup_group(client)
    settlement = client.post(
        f"/api/groups/{group['id']}/settlements",
        headers=_auth(tokens["alice"]),
        json={"payer_id": users["bob"]["id"], "receiver_id": users["alice"]["id"], "amount": "5.00"},
    ).json()

    client.patch(
        f"/api/groups/{group['id']}/settlements/{settlement['id']}",
        headers=_auth(tokens["alice"]),
        json={"status": "completed"},
    )
    again = client.patch(
        f"/api/groups/{group['id']}/settlements/{settlement['id']}",
        headers=_auth(tokens["alice"]),
        json={"status": "completed"},
    )
    assert again.status_code == 400

    missing = client.patch(
        f"/api/groups/{group['id']}/settlements/9999",
        headers=_auth(tokens["alice"]),
        json={"status": "completed"},
    )
    assert missing.status_code == 404


def test_settlement_list_includes_party_info(client):
    users, tokens, group = _setup_group(client)
    client.post(
        f"/api/groups/{group['id']}/settlements",
        headers=_auth(tokens["alice"]),
        json={"payer_id": users["bob"]["id"], "receiver_id": users["alice"]["id"], "amount": "5.00"},
    )
    settlements = client.get(
        f"/api/groups/{group['id']}/settlements", headers=_auth(tokens["alice"])
    ).json()
    assert len(settlements) == 1
    item = settlements[0]
    assert item["status"] == "pending"
    assert item["payer"]["name"] == "Bob"
    assert item["receiver"]["name"] == "Alice"
    assert "settlement_date" in item


def test_transaction_feed_contains_expenses_and_settlements(client):
    users, tokens, group = _setup_group(client)

    _expense(
        client, tokens["alice"], group["id"], "Dinner", "20.00", users["alice"]["id"]
    )
    settlement = client.post(
        f"/api/groups/{group['id']}/settlements",
        headers=_auth(tokens["alice"]),
        json={"payer_id": users["bob"]["id"], "receiver_id": users["alice"]["id"], "amount": "5.00"},
    ).json()
    client.patch(
        f"/api/groups/{group['id']}/settlements/{settlement['id']}",
        headers=_auth(tokens["alice"]),
        json={"status": "completed"},
    )

    feed = client.get(
        f"/api/groups/{group['id']}/transactions", headers=_auth(tokens["alice"])
    ).json()
    assert len(feed) == 2
    assert {item["type"] for item in feed} == {"expense", "settlement"}

    expense_item = next(i for i in feed if i["type"] == "expense")
    assert expense_item["title"] == "Dinner"
    assert expense_item["payer"]["name"] == "Alice"
    assert len(expense_item["splits"]) == 2
    assert sum(Decimal(s["amount"]) for s in expense_item["splits"]) == Decimal("20.00")

    settlement_item = next(i for i in feed if i["type"] == "settlement")
    assert settlement_item["payer"]["name"] == "Bob"
    assert settlement_item["receiver"]["name"] == "Alice"
    assert settlement_item["status"] == "completed"
    assert settlement_item["amount"] == "5.00"


def test_transaction_feed_requires_membership(client):
    _, alice_token = _register(client, "Alice", "alice@example.com")
    group = client.post(
        "/api/groups", headers=_auth(alice_token), json={"name": "Trip"}
    ).json()
    _, outsider_token = _register(client, "Mallory", "mallory@example.com")
    assert client.get(
        f"/api/groups/{group['id']}/transactions", headers=_auth(outsider_token)
    ).status_code == 403
