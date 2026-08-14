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


def _create_expense(client, token, group_id, payload):
    return client.post(
        f"/api/groups/{group_id}/expenses",
        headers=_auth(token),
        json=payload,
    )


def test_expense_apis_require_auth(client):
    assert client.post("/api/groups/1/expenses", json={}).status_code == 401
    assert client.get("/api/groups/1/expenses").status_code == 401
    assert client.get("/api/groups/1/expenses/1").status_code == 401
    assert client.put("/api/groups/1/expenses/1", json={}).status_code == 401
    assert client.delete("/api/groups/1/expenses/1").status_code == 401
    assert client.post("/api/groups/1/expenses/calculate", json={}).status_code == 401


def test_equal_split_defaults_to_all_members(client):
    users, tokens, group = _setup_group(client, ["alice", "bob", "carol"])
    response = _create_expense(
        client,
        tokens["alice"],
        group["id"],
        {"title": "Dinner", "amount": "30.00", "paid_by": users["alice"]["id"]},
    )
    assert response.status_code == 201
    data = response.json()
    assert data["split_method"] == "equal"
    assert len(data["splits"]) == 3
    assert sorted(s["amount"] for s in data["splits"]) == ["10.00", "10.00", "10.00"]
    assert data["amount"] == "30.00"


def test_equal_split_with_selected_participants(client):
    users, tokens, group = _setup_group(client, ["alice", "bob", "carol"])
    response = _create_expense(
        client,
        tokens["alice"],
        group["id"],
        {
            "title": "Coffee",
            "amount": "9.00",
            "paid_by": users["alice"]["id"],
            "participants": [users["alice"]["id"], users["bob"]["id"]],
        },
    )
    assert response.status_code == 201
    splits = response.json()["splits"]
    assert len(splits) == 2
    assert sorted(s["amount"] for s in splits) == ["4.50", "4.50"]


def test_equal_split_rounding_preserves_total(client):
    users, tokens, group = _setup_group(client, ["alice", "bob", "carol"])
    response = _create_expense(
        client,
        tokens["alice"],
        group["id"],
        {"title": "Ride", "amount": "10.00", "paid_by": users["alice"]["id"]},
    )
    assert response.status_code == 201
    amounts = [float(s["amount"]) for s in response.json()["splits"]]
    assert sum(amounts) == 10.0
    assert set(amounts) == {3.33, 3.34}


def test_exact_split(client):
    users, tokens, group = _setup_group(client)
    response = _create_expense(
        client,
        tokens["alice"],
        group["id"],
        {
            "title": "Groceries",
            "amount": "30.00",
            "paid_by": users["alice"]["id"],
            "split_method": "exact",
            "exact_amounts": [
                {"user_id": users["alice"]["id"], "amount": "12.50"},
                {"user_id": users["bob"]["id"], "amount": "17.50"},
            ],
        },
    )
    assert response.status_code == 201
    amounts = sorted(s["amount"] for s in response.json()["splits"])
    assert amounts == ["12.50", "17.50"]


def test_exact_split_mismatch_rejected(client):
    users, tokens, group = _setup_group(client)
    payload = {
        "title": "Groceries",
        "amount": "30.00",
        "paid_by": users["alice"]["id"],
        "split_method": "exact",
        "exact_amounts": [{"user_id": users["alice"]["id"], "amount": "10.00"}],
    }
    response = _create_expense(client, tokens["alice"], group["id"], payload)
    assert response.status_code == 400
    assert "must equal" in response.json()["detail"]


def test_exact_split_duplicate_user_rejected(client):
    users, tokens, group = _setup_group(client)
    response = _create_expense(
        client,
        tokens["alice"],
        group["id"],
        {
            "title": "X",
            "amount": "20.00",
            "paid_by": users["alice"]["id"],
            "split_method": "exact",
            "exact_amounts": [
                {"user_id": users["alice"]["id"], "amount": "10.00"},
                {"user_id": users["alice"]["id"], "amount": "10.00"},
            ],
        },
    )
    assert response.status_code == 400
    assert "Duplicate" in response.json()["detail"]


def test_percentage_split(client):
    users, tokens, group = _setup_group(client)
    response = _create_expense(
        client,
        tokens["alice"],
        group["id"],
        {
            "title": "Hotel",
            "amount": "100.00",
            "paid_by": users["alice"]["id"],
            "split_method": "percentage",
            "percentages": [
                {"user_id": users["alice"]["id"], "percentage": "30"},
                {"user_id": users["bob"]["id"], "percentage": "70"},
            ],
        },
    )
    assert response.status_code == 201
    amounts = sorted(s["amount"] for s in response.json()["splits"])
    assert amounts == ["30.00", "70.00"]


def test_percentage_split_rounding_preserves_total(client):
    users, tokens, group = _setup_group(client)
    response = _create_expense(
        client,
        tokens["alice"],
        group["id"],
        {
            "title": "Bill",
            "amount": "33.33",
            "paid_by": users["alice"]["id"],
            "split_method": "percentage",
            "percentages": [
                {"user_id": users["alice"]["id"], "percentage": "50"},
                {"user_id": users["bob"]["id"], "percentage": "50"},
            ],
        },
    )
    assert response.status_code == 201
    amounts = [float(s["amount"]) for s in response.json()["splits"]]
    assert sum(amounts) == 33.33


def test_percentage_must_sum_to_100(client):
    users, tokens, group = _setup_group(client)
    response = _create_expense(
        client,
        tokens["alice"],
        group["id"],
        {
            "title": "X",
            "amount": "100.00",
            "paid_by": users["alice"]["id"],
            "split_method": "percentage",
            "percentages": [
                {"user_id": users["alice"]["id"], "percentage": "50"},
                {"user_id": users["bob"]["id"], "percentage": "30"},
            ],
        },
    )
    assert response.status_code == 400
    assert "must sum to 100" in response.json()["detail"]


def test_zero_or_negative_amount_rejected(client):
    users, tokens, group = _setup_group(client)
    for amount in ("0", "-5.00"):
        response = _create_expense(
            client,
            tokens["alice"],
            group["id"],
            {"title": "X", "amount": amount, "paid_by": users["alice"]["id"]},
        )
        assert response.status_code == 422


def test_non_member_rejected(client):
    users, tokens, group = _setup_group(client)
    dave, dave_token = _register(client, "Dave", "dave@example.com")

    bad_payer = _create_expense(
        client,
        tokens["alice"],
        group["id"],
        {"title": "X", "amount": "10.00", "paid_by": dave["id"]},
    )
    assert bad_payer.status_code == 400
    assert "Payer" in bad_payer.json()["detail"]

    bad_split = _create_expense(
        client,
        tokens["alice"],
        group["id"],
        {
            "title": "X",
            "amount": "10.00",
            "paid_by": users["alice"]["id"],
            "split_method": "exact",
            "exact_amounts": [{"user_id": dave["id"], "amount": "10.00"}],
        },
    )
    assert bad_split.status_code == 400
    assert "not a member" in bad_split.json()["detail"]
    assert dave_token  # avoid unused warning


def test_non_member_cannot_access_expenses(client):
    _, alice_token = _register(client, "Alice", "alice@example.com")
    group = client.post(
        "/api/groups", headers=_auth(alice_token), json={"name": "Trip"}
    ).json()
    _, outsider_token = _register(client, "Mallory", "mallory@example.com")

    assert client.get(
        f"/api/groups/{group['id']}/expenses", headers=_auth(outsider_token)
    ).status_code == 403
    assert client.post(
        f"/api/groups/{group['id']}/expenses",
        headers=_auth(outsider_token),
        json={"title": "X", "amount": "10.00", "paid_by": 1},
    ).status_code == 403


def test_get_expense_detail(client):
    users, tokens, group = _setup_group(client)
    created = _create_expense(
        client,
        tokens["alice"],
        group["id"],
        {
            "title": "Dinner",
            "amount": "20.00",
            "paid_by": users["alice"]["id"],
            "category": "food",
        },
    ).json()

    detail = client.get(
        f"/api/groups/{group['id']}/expenses/{created['id']}",
        headers=_auth(tokens["alice"]),
    )
    assert detail.status_code == 200
    data = detail.json()
    assert data["title"] == "Dinner"
    assert data["paid_by"] == users["alice"]["id"]
    assert data["paid_by_user"]["name"] == "Alice"
    assert data["category"] == "food"
    assert len(data["splits"]) == 2


def test_list_expenses_most_recent_first(client):
    users, tokens, group = _setup_group(client)
    for title in ("First", "Second"):
        _create_expense(
            client,
            tokens["alice"],
            group["id"],
            {"title": title, "amount": "10.00", "paid_by": users["alice"]["id"]},
        )
    expenses = client.get(
        f"/api/groups/{group['id']}/expenses", headers=_auth(tokens["alice"])
    ).json()
    assert [e["title"] for e in expenses] == ["Second", "First"]


def test_update_expense(client):
    users, tokens, group = _setup_group(client)
    created = _create_expense(
        client,
        tokens["alice"],
        group["id"],
        {
            "title": "Old",
            "amount": "10.00",
            "paid_by": users["alice"]["id"],
            "split_method": "exact",
            "exact_amounts": [{"user_id": users["alice"]["id"], "amount": "10.00"}],
        },
    ).json()

    updated = client.put(
        f"/api/groups/{group['id']}/expenses/{created['id']}",
        headers=_auth(tokens["alice"]),
        json={
            "title": "New",
            "amount": "100.00",
            "paid_by": users["bob"]["id"],
            "split_method": "equal",
        },
    )
    assert updated.status_code == 200
    data = updated.json()
    assert data["title"] == "New"
    assert data["amount"] == "100.00"
    assert data["paid_by"] == users["bob"]["id"]
    assert sorted(s["amount"] for s in data["splits"]) == ["50.00", "50.00"]


def test_delete_expense(client):
    users, tokens, group = _setup_group(client)
    created = _create_expense(
        client,
        tokens["alice"],
        group["id"],
        {"title": "Temp", "amount": "5.00", "paid_by": users["alice"]["id"]},
    ).json()

    deleted = client.delete(
        f"/api/groups/{group['id']}/expenses/{created['id']}",
        headers=_auth(tokens["alice"]),
    )
    assert deleted.status_code == 204

    assert client.get(
        f"/api/groups/{group['id']}/expenses/{created['id']}",
        headers=_auth(tokens["alice"]),
    ).status_code == 404
    expenses = client.get(
        f"/api/groups/{group['id']}/expenses", headers=_auth(tokens["alice"])
    ).json()
    assert expenses == []


def test_calculate_splits_endpoint(client):
    users, tokens, group = _setup_group(client, ["alice", "bob", "carol"])
    response = client.post(
        f"/api/groups/{group['id']}/expenses/calculate",
        headers=_auth(tokens["alice"]),
        json={
            "title": "Preview",
            "amount": "100.00",
            "paid_by": users["alice"]["id"],
            "split_method": "percentage",
            "percentages": [
                {"user_id": users["alice"]["id"], "percentage": "50"},
                {"user_id": users["bob"]["id"], "percentage": "25"},
                {"user_id": users["carol"]["id"], "percentage": "25"},
            ],
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert data["method"] == "percentage"
    assert data["total"] == "100.00"
    assert len(data["splits"]) == 3
    assert data["splits"][0]["user"]["name"]

    expenses = client.get(
        f"/api/groups/{group['id']}/expenses", headers=_auth(tokens["alice"])
    ).json()
    assert expenses == []
