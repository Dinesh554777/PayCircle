from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.group import GroupCreate, GroupRead, GroupWithMembers, MemberAdd, MemberRead
from app.services.group_service import GroupService

router = APIRouter()


@router.post("", response_model=GroupRead, status_code=status.HTTP_201_CREATED)
def create_group(data: GroupCreate, db: Session = Depends(get_db)):
    return GroupService(db).create_group(data)


@router.get("", response_model=list[GroupRead])
def list_groups(db: Session = Depends(get_db)):
    return GroupService(db).list_all()


@router.get("/{group_id}", response_model=GroupWithMembers)
def get_group(group_id: int, db: Session = Depends(get_db)):
    group = GroupService(db).get_by_id(group_id)
    group.members = GroupService(db).get_members(group_id)
    return group


@router.post(
    "/{group_id}/members",
    response_model=MemberRead,
    status_code=status.HTTP_201_CREATED,
)
def add_member(group_id: int, data: MemberAdd, db: Session = Depends(get_db)):
    return GroupService(db).add_member(group_id, data)
