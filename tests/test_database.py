import pytest
from sqlalchemy import text

from app.core.database import check_db_connection, get_db


def _database_reachable() -> bool:
    try:
        return check_db_connection()
    except Exception:
        return False


def test_database_connection():
    if not _database_reachable():
        pytest.skip("Configured database is not reachable")

    assert check_db_connection() is True


def test_session_executes_query():
    if not _database_reachable():
        pytest.skip("Configured database is not reachable")

    session = next(get_db())
    try:
        result = session.execute(text("SELECT 1")).scalar()
        assert result == 1
    finally:
        session.close()
