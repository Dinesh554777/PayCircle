import pytest

from app.models.user import User


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


def _make_admin(db_session, email):
    user = db_session.query(User).filter(User.email == email).first()
    user.is_admin = True
    db_session.commit()
    return user


def test_admin_apis_require_auth(client):
    assert client.get("/api/admin/users").status_code == 401
    assert client.get("/api/admin/groups").status_code == 401
    assert client.get("/api/admin/stats").status_code == 401
    assert client.patch("/api/admin/users/1/status", json={"is_active": False}).status_code == 401


def test_admin_apis_require_admin_role(client, db_session):
    alice, alice_token = _register(client, "Alice", "alice@example.com")
    bob, bob_token = _register(client, "Bob", "bob@example.com")

    _make_admin(db_session, "alice@example.com")

    for endpoint in ["/api/admin/users", "/api/admin/groups", "/api/admin/stats"]:
        assert client.get(endpoint, headers=_auth(bob_token)).status_code == 403
        assert client.get(endpoint, headers=_auth(alice_token)).status_code == 200


def test_admin_stats(client, db_session):
    alice, alice_token = _register(client, "Alice", "alice@example.com")
    _register(client, "Bob", "bob@example.com")
    _register(client, "Carol", "carol@example.com")
    _make_admin(db_session, "alice@example.com")

    group = client.post(
        "/api/groups", headers=_auth(alice_token), json={"name": "Trip"}
    )
    assert group.status_code == 201
    client.post(
        f"/api/groups/{group.json()['id']}/expenses",
        headers=_auth(alice_token),
        json={"title": "Dinner", "amount": 100, "paid_by": alice["id"]},
    )

    stats = client.get("/api/admin/stats", headers=_auth(alice_token)).json()
    assert stats["total_users"] == 3
    assert stats["active_users"] == 3
    assert stats["total_groups"] == 1
    assert stats["total_expenses"] == 1
    assert stats["total_transactions"] == 1
    assert stats["total_settlements"] == 0
    assert float(stats["total_amount_spent"]) == 100.0


def test_admin_list_users_includes_counts(client, db_session):
    alice, alice_token = _register(client, "Alice", "alice@example.com")
    bob, bob_token = _register(client, "Bob", "bob@example.com")
    carol, _ = _register(client, "Carol", "carol@example.com")
    _make_admin(db_session, "alice@example.com")

    group = client.post(
        "/api/groups", headers=_auth(bob_token), json={"name": "Trip"}
    ).json()
    client.post(
        f"/api/groups/{group['id']}/members",
        headers=_auth(bob_token),
        json={"user_id": carol["id"]},
    )

    users = client.get("/api/admin/users", headers=_auth(alice_token)).json()
    by_email = {u["email"]: u for u in users}
    assert by_email["bob@example.com"]["groups_count"] == 1
    assert by_email["carol@example.com"]["groups_count"] == 1
    assert "is_admin" in by_email["alice@example.com"]
    assert "is_active" in by_email["bob@example.com"]

    groups = client.get("/api/admin/groups", headers=_auth(alice_token)).json()
    assert len(groups) == 1
    assert groups[0]["name"] == "Trip"
    assert groups[0]["member_count"] == 2


def test_admin_can_disable_and_reenable_user(client, db_session):
    alice, alice_token = _register(client, "Alice", "alice@example.com")
    bob, bob_token = _register(client, "Bob", "bob@example.com")
    _make_admin(db_session, "alice@example.com")

    disable = client.patch(
        f"/api/admin/users/{bob['id']}/status",
        headers=_auth(alice_token),
        json={"is_active": False},
    )
    assert disable.status_code == 200
    assert disable.json()["is_active"] is False

    # bob's existing token is now rejected and login is blocked
    assert client.get("/api/groups", headers=_auth(bob_token)).status_code == 403
    login = client.post(
        "/api/auth/login", json={"email": "bob@example.com", "password": "secret123"}
    )
    assert login.status_code == 403

    enable = client.patch(
        f"/api/admin/users/{bob['id']}/status",
        headers=_auth(alice_token),
        json={"is_active": True},
    )
    assert enable.status_code == 200
    assert client.post(
        "/api/auth/login", json={"email": "bob@example.com", "password": "secret123"}
    ).status_code == 200


def test_admin_cannot_disable_self(client, db_session):
    alice, alice_token = _register(client, "Alice", "alice@example.com")
    _make_admin(db_session, "alice@example.com")

    response = client.patch(
        f"/api/admin/users/{alice['id']}/status",
        headers=_auth(alice_token),
        json={"is_active": False},
    )
    assert response.status_code == 400


def test_disable_unknown_user_returns_404(client, db_session):
    alice, alice_token = _register(client, "Alice", "alice@example.com")
    _make_admin(db_session, "alice@example.com")

    response = client.patch(
        "/api/admin/users/9999/status",
        headers=_auth(alice_token),
        json={"is_active": False},
    )
    assert response.status_code == 404
