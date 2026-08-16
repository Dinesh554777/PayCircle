from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.schemas.group import (
    GroupCreate,
    GroupRead,
    GroupWithMembers,
    MemberAdd,
    MemberRead,
)
from app.schemas.group_health import GroupHealthOut
from app.services.group_health import GroupHealthService
from app.services.group_service import GroupService

router = APIRouter()


@router.post("", response_model=GroupRead, status_code=status.HTTP_201_CREATED)
def create_group(
    data: GroupCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return GroupService(db).create_group(data, current_user)


@router.get("", response_model=list[GroupRead])
def list_groups(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return GroupService(db).get_user_groups(current_user)


@router.get("/{group_id}", response_model=GroupWithMembers)
def get_group(
    group_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    group = GroupService(db).get_group_for_user(group_id, current_user)
    group.members = GroupService(db).get_members(group_id)
    return group


@router.get("/{group_id}/members", response_model=list[MemberRead])
def list_members(
    group_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    GroupService(db).get_group_for_user(group_id, current_user)
    return GroupService(db).get_members(group_id)


@router.get("/{group_id}/health", response_model=GroupHealthOut)
def get_group_health(
    group_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return GroupHealthService(db).calculate(group_id, current_user)


@router.post(
    "/{group_id}/members",
    response_model=MemberRead,
    status_code=status.HTTP_201_CREATED,
)
def add_member(
    group_id: int,
    data: MemberAdd,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return GroupService(db).add_member(group_id, data, current_user)


@router.delete(
    "/{group_id}/members/{user_id}", status_code=status.HTTP_204_NO_CONTENT
)
def remove_member(
    group_id: int,
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    GroupService(db).remove_member(group_id, user_id, current_user)


@router.delete("/{group_id}/leave", status_code=status.HTTP_204_NO_CONTENT)
def leave_group(
    group_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    GroupService(db).leave_group(group_id, current_user)
