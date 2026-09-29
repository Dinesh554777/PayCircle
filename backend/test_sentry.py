from fastapi.testclient import TestClient
from app.main import app
import sys

client = TestClient(app)

print("--- Testing /api/health ---")
r_health = client.get("/api/health")
print(r_health.status_code, r_health.json())

print("--- Testing /api/test-error ---")
try:
    r_err = client.get("/api/test-error")
    print(r_err.status_code, r_err.json())
except Exception as e:
    print(f"Exception caught in client: {e}")

sys.exit(0)
