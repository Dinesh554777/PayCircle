import pytest
from tests.helpers import make_user

def test_register(client):
    response = client.post(
        "/api/auth/register",
        json={"email": "newuser@example.com", "password": "securepassword", "name": "New User", "username": "newuser123"}
    )
    assert response.status_code == 201
    assert "access_token" in response.json()

def test_login_success(client, db_session):
    client.post(
        "/api/auth/register",
        json={"email": "loginuser@example.com", "password": "securepassword", "name": "Login User", "username": "loguser"}
    )
    
    response = client.post(
        "/api/auth/login",
        json={"email": "loginuser@example.com", "password": "securepassword"}
    )
    assert response.status_code == 200
    assert "access_token" in response.json()

def test_login_invalid_credentials(client):
    response = client.post(
        "/api/auth/login",
        json={"email": "nonexistent@example.com", "password": "wrongpassword"}
    )
    assert response.status_code == 401

def test_protected_endpoint_without_token(client):
    response = client.get("/api/users/me")
    assert response.status_code == 401

def test_protected_endpoint_with_invalid_token(client):
    response = client.get(
        "/api/users/me",
        headers={"Authorization": "Bearer invalid_token"}
    )
    assert response.status_code == 401

def test_role_authorization_admin_only(client, db_session):
    # Register a standard user
    res = client.post("/api/auth/register", json={"email": "standard@example.com", "password": "pass", "name": "Std", "username": "std123"})
    token = res.json()["access_token"]
    
    # Try an admin endpoint
    response = client.get("/api/admin/system-stats", headers={"Authorization": f"Bearer {token}"})
    # Usually role mismatch returns 403
    assert response.status_code == 403
