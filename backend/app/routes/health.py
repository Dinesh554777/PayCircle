from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.config import Settings, get_settings
from app.core.database import get_db

router = APIRouter()


@router.get("")
def health_check(
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
):
    db_ok = True
    try:
        db.execute(text("SELECT 1"))
    except Exception:
        db_ok = False

    return {
        "status": "ok",
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "database": "connected" if db_ok else "disconnected",
    }


@router.get("/sentry-debug")
def trigger_sentry_error():
    """Intentional error endpoint for testing Sentry Autofix integrations without breaking production."""
    raise Exception("This is a controlled test exception for Sentry Autofix.")
