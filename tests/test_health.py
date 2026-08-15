def test_health_endpoint(client):
    response = client.get("/api/health")
    assert response.status_code == 200

    body = response.json()
    assert body["status"] == "ok"
    assert body["app"] == "PayCircle API"
    assert body["database"] == "connected"


def test_database_check_endpoint(client):
    response = client.get("/api/db/check")
    assert response.status_code == 200

    body = response.json()
    assert body["database"] == "connected"
    assert set(body["tables"]) == {
        "users",
        "groups",
        "group_members",
        "expenses",
        "expense_splits",
        "settlements",
        "transactions",
        "notifications",
    }
