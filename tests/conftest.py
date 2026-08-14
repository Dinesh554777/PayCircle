import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

import app.models  # noqa: F401  (register all models on Base.metadata)
from app.core.database import Base, get_db
from app.main import app
from ai.categorizer import CategorizationResult
import app.services.expense_service as expense_service_module

test_engine = create_engine(
    "sqlite://",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)


@pytest.fixture()
def db_session():
    Base.metadata.create_all(bind=test_engine)
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=test_engine)


@pytest.fixture()
def client(db_session):
    def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture(autouse=True)
def _stub_ai_categorizer(monkeypatch):
    """Never hit the network during tests; tests override per-case when needed."""

    class StubCategorizer:
        def categorize(self, text):
            return CategorizationResult("Food", 0.95, True, "groq")

    monkeypatch.setattr(expense_service_module, "GroqCategorizer", lambda: StubCategorizer())
