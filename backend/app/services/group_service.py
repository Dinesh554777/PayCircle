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

    def create_group(self, data: GroupCreate, creator: User) -> Group:
        group = self.create(
            name=data.name, description=data.description, created_by=creator.id
        )
        self.db.add(GroupMember(group_id=group.id, user_id=creator.id, role="admin"))
        self.db.commit()
        return group

    def get_user_groups(self, user: User) -> list[Group]:
        return (
            self.db.query(Group)
            .join(GroupMember, GroupMember.group_id == Group.id)
            .filter(GroupMember.user_id == user.id)
            .order_by(Group.created_at.desc())
            .all()
        )

    def get_membership(self, group_id: int, user_id: int) -> GroupMember | None:
        return (
            self.db.query(GroupMember)
            .filter_by(group_id=group_id, user_id=user_id)
            .first()
        )

    def get_group_for_user(self, group_id: int, user: User) -> Group:
        group = self.get_by_id(group_id)
        if self.get_membership(group.id, user.id) is None:
            raise HTTPException(
                status_code=403, detail="You are not a member of this group"
            )
        return group

    def add_member(self, group_id: int, data, actor: User) -> GroupMember:
        group = self.get_group_for_user(group_id, actor)

        if data.user_id is None and data.email is None:
            raise HTTPException(status_code=422, detail="user_id or email is required")

        if data.user_id is not None:
            user = self.db.get(User, data.user_id)
        else:
            user = self.db.query(User).filter(User.email == data.email).first()

        if user is None:
            raise HTTPException(status_code=404, detail="User not found")

        if self.get_membership(group.id, user.id) is not None:
            raise HTTPException(
                status_code=409, detail="User is already a member of this group"
            )

        member = GroupMember(group_id=group.id, user_id=user.id, role=data.role)
        self.db.add(member)
        self.db.commit()
        self.db.refresh(member)
        return member

    def get_members(self, group_id: int) -> list[GroupMember]:
        group = self.get_by_id(group_id)
        return (
            self.db.query(GroupMember).filter(GroupMember.group_id == group.id).all()
        )

    def remove_member(self, group_id: int, user_id: int, actor: User) -> None:
        group = self.get_group_for_user(group_id, actor)

        if user_id == group.created_by:
            raise HTTPException(
                status_code=400, detail="Cannot remove the group creator"
            )
        if user_id == actor.id:
            raise HTTPException(
                status_code=400, detail="Leave the group instead of removing yourself"
            )

        membership = self.get_membership(group.id, user_id)
        if membership is None:
            raise HTTPException(
                status_code=404, detail="User is not a member of this group"
            )

        self.db.delete(membership)
        self.db.commit()

    def leave_group(self, group_id: int, user: User) -> None:
        group = self.get_by_id(group_id)
        membership = self.get_membership(group.id, user.id)
        if membership is None:
            raise HTTPException(
                status_code=404, detail="You are not a member of this group"
            )
        self.db.delete(membership)
        self.db.commit()
