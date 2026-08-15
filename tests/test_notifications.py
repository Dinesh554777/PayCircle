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


def _create_group(client, token, name="Trip", description="Goa trip"):
    response = client.post(
        "/api/groups",
        headers=_auth(token),
        json={"name": name, "description": description},
    )
    assert response.status_code == 201
    return response.json()


def _add_member(client, token, group_id, user_id):
    response = client.post(
        f"/api/groups/{group_id}/members",
        headers=_auth(token),
        json={"user_id": user_id},
    )
    assert response.status_code == 201
    return response.json()


def _add_expense(client, token, group_id, payer_id, title, amount):
    response = client.post(
        f"/api/groups/{group_id}/expenses",
        headers=_auth(token),
        json={
            "title": title,
            "amount": amount,
            "paid_by": payer_id,
            "split_method": "equal",
        },
    )
    assert response.status_code == 201
    return response.json()


def _list_notifications(client, token):
    response = client.get("/api/notifications", headers=_auth(token))
    assert response.status_code == 200
    return response.json()


def test_notification_apis_require_auth(client):
    assert client.get("/api/notifications").status_code == 401
    assert client.get("/api/notifications/unread-count").status_code == 401
    assert client.post("/api/notifications/read-all").status_code == 401
    assert client.patch("/api/notifications/1/read").status_code == 401


def test_added_to_group_creates_notification(client):
    alice, alice_token = _register(client, "Alice", "alice@example.com")
    bob, bob_token = _register(client, "Bob", "bob@example.com")
    group = _create_group(client, alice_token)
    _add_member(client, alice_token, group["id"], bob["id"])

    data = _list_notifications(client, bob_token)
    assert data["total"] == 1
    assert data["unread_count"] == 1
    notification = data["notifications"][0]
    assert notification["type"] == "added_to_group"
    assert notification["title"] == "Added to group"
    assert "Trip" in notification["message"]
    assert notification["group_id"] == group["id"]
    assert notification["is_read"] is False

    # alice (the actor) receives nothing
    assert _list_notifications(client, alice_token)["total"] == 0


def test_expense_creates_notifications_and_reminder(client):
    alice, alice_token = _register(client, "Alice", "alice@example.com")
    bob, bob_token = _register(client, "Bob", "bob@example.com")
    group = _create_group(client, alice_token)
    _add_member(client, alice_token, group["id"], bob["id"])
    _add_expense(client, alice_token, group["id"], alice["id"], "Dinner", 100)

    data = _list_notifications(client, bob_token)
    types = {n["type"] for n in data["notifications"]}
    assert types == {"added_to_group", "expense_added", "reminder"}
    reminder = next(n for n in data["notifications"] if n["type"] == "reminder")
    assert reminder["title"] == "Payment reminder"
    assert "₹50.00" in reminder["message"]


def test_reminder_not_duplicated(client):
    alice, alice_token = _register(client, "Alice", "alice@example.com")
    bob, bob_token = _register(client, "Bob", "bob@example.com")
    group = _create_group(client, alice_token)
    _add_member(client, alice_token, group["id"], bob["id"])
    _add_expense(client, alice_token, group["id"], alice["id"], "Dinner", 100)
    _add_expense(client, alice_token, group["id"], alice["id"], "Taxi", 60)

    data = _list_notifications(client, bob_token)
    reminders = [n for n in data["notifications"] if n["type"] == "reminder"]
    expense_added = [n for n in data["notifications"] if n["type"] == "expense_added"]
    assert len(reminders) == 1
    assert len(expense_added) == 2


def test_settlement_records_notification(client):
    alice, alice_token = _register(client, "Alice", "alice@example.com")
    bob, bob_token = _register(client, "Bob", "bob@example.com")
    group = _create_group(client, alice_token)
    _add_member(client, alice_token, group["id"], bob["id"])
    _add_expense(client, alice_token, group["id"], alice["id"], "Dinner", 100)

    create = client.post(
        f"/api/groups/{group['id']}/settlements",
        headers=_auth(bob_token),
        json={"payer_id": bob["id"], "receiver_id": alice["id"], "amount": 50},
    )
    assert create.status_code == 201

    data = _list_notifications(client, alice_token)
    pending = next(n for n in data["notifications"] if n["type"] == "settlement_recorded")
    assert "pending settlement" in pending["message"]

    complete = client.patch(
        f"/api/groups/{group['id']}/settlements/{create.json()['id']}",
        headers=_auth(bob_token),
        json={"status": "completed"},
    )
    assert complete.status_code == 200

    data = _list_notifications(client, alice_token)
    completed = [n for n in data["notifications"] if n["type"] == "settlement_recorded"]
    assert len(completed) == 2
    assert any("completed a settlement" in n["message"] for n in completed)


def test_mark_read_and_mark_all_read(client):
    alice, alice_token = _register(client, "Alice", "alice@example.com")
    bob, bob_token = _register(client, "Bob", "bob@example.com")
    group = _create_group(client, alice_token)
    _add_member(client, alice_token, group["id"], bob["id"])
    _add_expense(client, alice_token, group["id"], alice["id"], "Dinner", 100)

    assert _list_notifications(client, bob_token)["unread_count"] == 3

    unread = client.get("/api/notifications/unread-count", headers=_auth(bob_token)).json()
    assert unread["unread_count"] == 3

    first_id = _list_notifications(client, bob_token)["notifications"][0]["id"]
    mark = client.patch(
        f"/api/notifications/{first_id}/read", headers=_auth(bob_token)
    )
    assert mark.status_code == 200
    assert mark.json()["is_read"] is True
    assert client.get(
        "/api/notifications/unread-count", headers=_auth(bob_token)
    ).json()["unread_count"] == 2

    mark_all = client.post("/api/notifications/read-all", headers=_auth(bob_token))
    assert mark_all.status_code == 200
    assert mark_all.json()["unread_count"] == 0


def test_notifications_are_private(client):
    alice, alice_token = _register(client, "Alice", "alice@example.com")
    bob, bob_token = _register(client, "Bob", "bob@example.com")
    carol, carol_token = _register(client, "Carol", "carol@example.com")
    group = _create_group(client, alice_token)
    _add_member(client, alice_token, group["id"], bob["id"])

    bob_notification = _list_notifications(client, bob_token)["notifications"][0]

    # carol cannot mark bob's notification read
    assert (
        client.patch(
            f"/api/notifications/{bob_notification['id']}/read",
            headers=_auth(carol_token),
        ).status_code
        == 404
    )
    # carol sees none of bob's notifications
    assert _list_notifications(client, carol_token)["total"] == 0
