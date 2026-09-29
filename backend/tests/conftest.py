"""Shared pytest fixtures: an isolated in-memory SQLite database per test."""
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.database import Base
import app.models  # noqa: F401  (register all models on Base.metadata)


@pytest.fixture()
def db_session():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    session = sessionmaker(bind=engine, autocommit=False, autoflush=False)()
    yield session
    session.close()
    engine.dispose()


@pytest.fixture()
def client(db_session, monkeypatch):
    from fastapi.testclient import TestClient
    from app.main import app
    from app.core.database import get_db
    
    # Mock promote_admin_emails to avoid hitting real DB during lifespan
    monkeypatch.setattr("app.main.promote_admin_emails", lambda: None)

    def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()
