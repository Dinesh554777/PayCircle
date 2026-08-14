def _register(client, name="Alice", email="alice@example.com", password="secret123"):
    return client.post(
        "/api/auth/register",
        json={"name": name, "email": email, "password": password},
    )


def _auth_header(token):
    return {"Authorization": f"Bearer {token}"}


def test_register_returns_token_and_user(client):
    response = _register(client)
    assert response.status_code == 201
    data = response.json()
    assert data["token_type"] == "bearer"
    assert data["access_token"]
    assert data["user"]["name"] == "Alice"
    assert data["user"]["email"] == "alice@example.com"
    assert data["user"]["id"] > 0
    assert "password" not in data["user"]
    assert "password_hash" not in str(data).lower() or "password" not in data


def test_register_password_is_hashed(client):
    response = _register(client)
    assert response.status_code == 201
    user_id = response.json()["user"]["id"]
    stored = client.get(f"/api/users/{user_id}").json()
    assert "secret123" not in str(stored)


def test_register_duplicate_email_rejected(client):
    assert _register(client).status_code == 201
    response = _register(client, name="Alice Again")
    assert response.status_code == 409
    assert "already exists" in response.json()["detail"]


def test_login_success(client):
    _register(client)
    response = client.post(
        "/api/auth/login",
        json={"email": "alice@example.com", "password": "secret123"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["access_token"]
    assert data["user"]["email"] == "alice@example.com"
    assert "password" not in data["user"]


def test_login_invalid_password(client):
    _register(client)
    response = client.post(
        "/api/auth/login",
        json={"email": "alice@example.com", "password": "wrong-password"},
    )
    assert response.status_code == 401
    assert "Incorrect email or password" in response.json()["detail"]


def test_login_unknown_email(client):
    response = client.post(
        "/api/auth/login",
        json={"email": "nobody@example.com", "password": "secret123"},
    )
    assert response.status_code == 401


def test_protected_endpoint_requires_token(client):
    assert client.get("/api/users/me").status_code == 401
    assert client.put("/api/users/me", json={"name": "X"}).status_code == 401
    bad = client.get("/api/users/me", headers=_auth_header("not-a-real-token"))
    assert bad.status_code == 401


def test_get_me_returns_current_user(client):
    token = _register(client).json()["access_token"]
    response = client.get("/api/users/me", headers=_auth_header(token))
    assert response.status_code == 200
    assert response.json()["email"] == "alice@example.com"


def test_profile_update(client):
    token = _register(client).json()["access_token"]
    response = client.put(
        "/api/users/me",
        headers=_auth_header(token),
        json={"name": "Alice Updated", "password": "newpass123"},
    )
    assert response.status_code == 200
    assert response.json()["name"] == "Alice Updated"
    assert "password" not in response.json()

    login = client.post(
        "/api/auth/login",
        json={"email": "alice@example.com", "password": "newpass123"},
    )
    assert login.status_code == 200


def test_profile_update_duplicate_email(client):
    _register(client, name="Bob", email="bob@example.com")
    token = _register(client, name="Alice", email="alice@example.com").json()[
        "access_token"
    ]
    response = client.put(
        "/api/users/me",
        headers=_auth_header(token),
        json={"email": "bob@example.com"},
    )
    assert response.status_code == 409
