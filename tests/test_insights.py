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


def _get_insights(client, token):
    return client.get("/api/ai/insights", headers=_auth(token))


def test_insights_requires_auth(client):
    assert client.get("/api/ai/insights").status_code == 401


def test_insights_empty_state(client):
    _, token = _register(client, "Alice", "alice@example.com")
    response = _get_insights(client, token)
    assert response.status_code == 200
    body = response.json()
    assert body["total_spending"] == "0.00"
    assert body["expense_count"] == 0
    assert body["average_expense"] == "0.00"
    assert body["category_breakdown"] == []
    assert body["monthly_summary"] == []
    assert body["top_category"] is None
    assert body["spending_change"] is None
    assert body["insights"] == ["No expenses recorded yet."]


def test_insights_aggregates_by_user_share(client):
    alice, alice_token, group = _setup_group(client)
    _expense(client, alice_token, group["id"], "Dinner", "30.00", alice["id"])
    _expense(client, alice_token, group["id"], "Movie", "10.00", alice["id"], category="Entertainment")

    body = _get_insights(client, alice_token).json()
    # Alice's share of 30 is 15 (split 2 ways) + 5 for the movie
    assert body["total_spending"] == "20.00"
    assert body["expense_count"] == 2
    assert body["average_expense"] == "10.00"
    assert body["top_category"] == "Food"
    assert body["top_category_amount"] == "15.00"
    assert body["frequent_category"] == "Food"
    assert body["frequent_category_count"] == 1
    assert body["largest_expense"]["title"] == "Dinner"
    assert body["largest_expense"]["amount"] == "15.00"
    assert body["summary"].startswith("Across your groups you have spent ₹20.00")
    assert any("highest spending category is Food" in i for i in body["insights"])
    assert any("total spending comes to ₹20.00" in i for i in body["insights"])
    assert any("average expense is ₹10.00" in i for i in body["insights"])

    breakdown = {b["category"]: b for b in body["category_breakdown"]}
    assert breakdown["Food"]["amount"] == "15.00"
    assert breakdown["Food"]["share"] == 75.0
    assert breakdown["Entertainment"]["amount"] == "5.00"
    assert breakdown["Entertainment"]["share"] == 25.0


def test_insights_share_is_user_share_not_full_amount(client):
    alice, alice_token, group = _setup_group(client)
    _expense(client, alice_token, group["id"], "Dinner", "60.00", alice["id"])

    body = _get_insights(client, alice_token).json()
    # 60 split between Alice and Bob -> Alice's share is 30
    assert body["total_spending"] == "30.00"
    assert body["expense_count"] == 1
    assert body["average_expense"] == "30.00"


def test_insights_only_include_groups_user_belongs_to(client):
    alice, alice_token, group = _setup_group(client)
    carol, carol_token = _register(client, "Carol", "carol@example.com")
    other_group = client.post(
        "/api/groups", headers=_auth(carol_token), json={"name": "CarolOnly"}
    ).json()
    _expense(client, carol_token, other_group["id"], "Private", "50.00", carol["id"])
    _expense(client, alice_token, group["id"], "Dinner", "30.00", alice["id"])

    alice_body = _get_insights(client, alice_token).json()
    assert alice_body["total_spending"] == "15.00"
    assert alice_body["expense_count"] == 1

    carol_body = _get_insights(client, carol_token).json()
    assert carol_body["total_spending"] == "50.00"
    assert carol_body["expense_count"] == 1


def test_insights_spending_change_across_months(client):
    alice, alice_token, group = _setup_group(client)
    _expense(
        client, alice_token, group["id"], "Dinner", "20.00", alice["id"],
        date="2026-06-10T12:00:00",
    )
    _expense(
        client, alice_token, group["id"], "Groceries", "60.00", alice["id"],
        date="2026-07-05T12:00:00",
    )

    body = _get_insights(client, alice_token).json()
    change = body["spending_change"]
    assert change is not None
    assert change["from_month"] == "2026-06"
    assert change["to_month"] == "2026-07"
    assert Decimal(change["from_amount"]) == Decimal("10.00")
    assert Decimal(change["to_amount"]) == Decimal("30.00")
    assert change["direction"] == "up"
    assert change["change_percent"] == 200.0

    assert len(body["monthly_summary"]) == 2
    assert body["monthly_summary"][0]["month"] == "2026-06"
    assert body["monthly_summary"][1]["month"] == "2026-07"
    assert any("Spending rose 200% compared with the previous month." in i for i in body["insights"])


def test_insights_category_increase_suggestion(client):
    alice, alice_token, group = _setup_group(client)
    _expense(
        client, alice_token, group["id"], "Coffee", "10.00", alice["id"],
        date="2026-06-10T12:00:00",
    )
    _expense(
        client, alice_token, group["id"], "Pizza", "60.00", alice["id"],
        date="2026-07-05T12:00:00",
    )

    body = _get_insights(client, alice_token).json()
    assert any(
        "Food expenses increased compared with last month" in s
        for s in body["suggestions"]
    )
    assert any(
        "Consider setting a food budget" in s for s in body["suggestions"]
    )


def test_insights_suggestions_never_empty_with_data(client):
    alice, alice_token, group = _setup_group(client)
    _expense(client, alice_token, group["id"], "Dinner", "30.00", alice["id"])

    body = _get_insights(client, alice_token).json()
    assert body["suggestions"]


def test_insights_declining_spending_direction(client):
    alice, alice_token, group = _setup_group(client)
    _expense(
        client, alice_token, group["id"], "Dinner", "60.00", alice["id"],
        date="2026-06-10T12:00:00",
    )
    _expense(
        client, alice_token, group["id"], "Movie", "10.00", alice["id"],
        date="2026-07-05T12:00:00",
        category="Entertainment",
    )

    body = _get_insights(client, alice_token).json()
    change = body["spending_change"]
    assert change is not None
    assert change["direction"] == "down"
    assert any("Spending fell" in i for i in body["insights"])
