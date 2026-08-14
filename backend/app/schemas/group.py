from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class GroupBase(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    description: str | None = None


class GroupCreate(GroupBase):
    created_by: int


class GroupRead(GroupBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_by: int
    created_at: datetime


class MemberAdd(BaseModel):
    user_id: int
    role: str = Field(default="member", pattern="^(admin|member)$")


class MemberRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    group_id: int
    user_id: int
    role: str
    created_at: datetime


class GroupWithMembers(GroupRead):
    members: list[MemberRead] = []
