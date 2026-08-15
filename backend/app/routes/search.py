from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.schemas.search import SearchResults
from app.services.search_service import SearchService

router = APIRouter()


@router.get("/search", response_model=SearchResults)
def search(
    q: str = Query(..., min_length=1, max_length=100, description="Search query"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return SearchService(db).search(q, current_user)
