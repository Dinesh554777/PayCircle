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


def _expense(client, token, group_id, title, amount, paid_by, date):
    return client.post(
        f"/api/groups/{group_id}/expenses",
        headers=_auth(token),
        json={
            "title": title,
            "amount": amount,
            "paid_by": paid_by,
            "expense_date": date,
        },
    ).json()


def _get_prediction(client, token):
    return client.get("/api/ai/prediction", headers=_auth(token))


def test_prediction_requires_auth(client):
    assert client.get("/api/ai/prediction").status_code == 401


def test_prediction_no_expenses(client):
    _, token = _register(client, "Alice", "alice@example.com")
    body = _get_prediction(client, token).json()
    assert body["has_prediction"] is False
    assert body["predicted_amount"] is None
    assert body["message"] == "Not enough data for prediction."
    assert body["based_on_months"] == []


def test_prediction_single_month_not_enough_data(client):
    alice, token, group = _setup_group(client)
    _expense(client, token, group["id"], "Dinner", "30.00", alice["id"], "2026-07-10T12:00:00")

    body = _get_prediction(client, token).json()
    assert body["has_prediction"] is False
    assert body["message"] == "Not enough data for prediction."
    assert len(body["based_on_months"]) == 1


def test_prediction_averages_last_months(client):
    alice, token, group = _setup_group(client)
    # Alice's share is half of each expense (split between two members)
    _expense(client, token, group["id"], "Dinner", "100.00", alice["id"], "2026-06-10T12:00:00")
    _expense(client, token, group["id"], "Groceries", "200.00", alice["id"], "2026-07-10T12:00:00")
    _expense(client, token, group["id"], "Trip", "300.00", alice["id"], "2026-08-10T12:00:00")

    body = _get_prediction(client, token).json()
    assert body["has_prediction"] is True
    assert Decimal(body["predicted_amount"]) == Decimal("100.00")
    assert body["period_label"] == "Sep 2026"
    assert body["message"].startswith("Based on your last 3 months")
    assert [m["month"] for m in body["based_on_months"]] == [
        "2026-06",
        "2026-07",
        "2026-08",
    ]


def test_prediction_lookback_limited_to_three_months(client):
    alice, token, group = _setup_group(client)
    for month, amount in (("2026-05", "80.00"), ("2026-06", "120.00"), ("2026-07", "160.00"), ("2026-08", "200.00")):
        _expense(client, token, group["id"], f"Expense {month}", amount, alice["id"], f"{month}-10T12:00:00")

    body = _get_prediction(client, token).json()
    assert body["has_prediction"] is True
    # last 3 months of the user's share: 60, 80, 100 -> average 80
    assert Decimal(body["predicted_amount"]) == Decimal("80.00")
    assert len(body["based_on_months"]) == 4
