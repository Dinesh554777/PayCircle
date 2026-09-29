def test_404_error(client):
    response = client.get("/api/non-existent-route-for-testing")
    assert response.status_code == 404

def test_422_validation_error(client):
    response = client.post("/api/auth/login", json={})
    assert response.status_code == 422
    assert "detail" in response.json()
