from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_admin
from app.models.user import User
from app.schemas.admin import (
    AdminGroupRead,
    AdminUserRead,
    AdminUserStatusUpdate,
    SystemStatsOut,
)
from app.services.admin_service import AdminService

router = APIRouter()


@router.get("/users", response_model=list[AdminUserRead])
def list_users(
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin),
):
    return AdminService(db).list_users()


@router.patch("/users/{user_id}/status", response_model=AdminUserRead)
def update_user_status(
    user_id: int,
    data: AdminUserStatusUpdate,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin),
):
    return AdminService(db).set_user_active(user_id, data.is_active, current_admin)


@router.get("/groups", response_model=list[AdminGroupRead])
def list_groups(
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin),
):
    return AdminService(db).list_groups()


@router.get("/stats", response_model=SystemStatsOut)
def system_stats(
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin),
):
    return AdminService(db).system_stats()
