from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models.group import Group
from app.models.group_member import GroupMember
from app.models.user import User
from app.schemas.group import GroupCreate
from app.services.base import BaseService


class GroupService(BaseService[Group]):
    def __init__(self, db: Session) -> None:
        super().__init__(db, Group)

    def create_group(self, data: GroupCreate) -> Group:
        if self.db.get(User, data.created_by) is None:
            raise HTTPException(status_code=404, detail="Owner user not found")

        group = self.create(
            name=data.name, description=data.description, created_by=data.created_by
        )
        self.db.add(GroupMember(group_id=group.id, user_id=data.created_by, role="admin"))
        self.db.commit()
        return group

    def add_member(self, group_id: int, data) -> GroupMember:
        group = self.get_by_id(group_id)
        if self.db.get(User, data.user_id) is None:
            raise HTTPException(status_code=404, detail="User not found")
        if self.db.query(GroupMember).filter_by(
            group_id=group_id, user_id=data.user_id
        ).first():
            raise HTTPException(
                status_code=409, detail="User is already a member of this group"
            )

        member = GroupMember(group_id=group.id, user_id=data.user_id, role=data.role)
        self.db.add(member)
        self.db.commit()
        self.db.refresh(member)
        return member

    def get_members(self, group_id: int) -> list[GroupMember]:
        group = self.get_by_id(group_id)
        return self.db.query(GroupMember).filter(GroupMember.group_id == group.id).all()
