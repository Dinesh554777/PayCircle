from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from sqlalchemy import exists

from app.core.database import get_db
from app.core.security import get_current_admin, get_current_user
from app.models.group_member import GroupMember
from app.models.user import User
from app.schemas.user import UserCreate, UserRead, UserUpdate
from app.services.user_service import UserService

router = APIRouter()


@router.post("", response_model=UserRead, status_code=status.HTTP_201_CREATED)
def create_user(data: UserCreate, db: Session = Depends(get_db)):
    return UserService(db).create_user(data)


@router.get("", response_model=list[UserRead])
def list_users(
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin),
):
    """Admin-only: return every registered user (prevents PII enumeration)."""
    return UserService(db).list_all()


@router.get("/me", response_model=UserRead)
def get_current_profile(current_user: User = Depends(get_current_user)):
    return current_user


@router.get("/search", response_model=list[UserRead])
def search_users(
    q: str = Query(default="", min_length=1, max_length=50),
    group_id: int | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Search users by username for inviting; optionally exclude current group members."""
    exclude_ids = {current_user.id}
    if group_id is not None:
        member_ids = (
            db.query(GroupMember.user_id).filter(GroupMember.group_id == group_id).all()
        )
        exclude_ids.update([row[0] for row in member_ids])
    users = UserService(db).search_by_username(q, exclude_user_id=current_user.id)
    if group_id is not None:
        users = [u for u in users if u.id not in exclude_ids]
    return users


@router.put("/me", response_model=UserRead)
def update_current_profile(
    data: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return UserService(db).update_user(current_user, data)


@router.get("/{user_id}", response_model=UserRead)
def get_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Allow viewing own profile or a profile of a user sharing a group."""
    if user_id == current_user.id:
        return current_user

    user = UserService(db).get_by_id(user_id)
    shares_group = db.query(
        exists().where(
            GroupMember.group_id.in_(
                db.query(GroupMember.group_id).filter(
                    GroupMember.user_id == current_user.id
                )
            ),
            GroupMember.user_id == user_id,
        )
    ).scalar()
    if not shares_group:
        raise HTTPException(
            status_code=403,
            detail="You may only view profiles of users you share a group with",
        )
    return user
