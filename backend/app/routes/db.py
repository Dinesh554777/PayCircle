from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.database import Base, get_db

router = APIRouter()


@router.get("/check")
def database_check(db: Session = Depends(get_db)):
    try:
        db.execute(text("SELECT 1"))
        connected = True
    except Exception:
        connected = False

    tables = [table.name for table in Base.metadata.sorted_tables]
    return {
        "database": "connected" if connected else "disconnected",
        "tables": tables,
    }
