from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class GroupBase(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    description: str | None = None


class GroupCreate(GroupBase):
    pass


class GroupRead(GroupBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_by: int
    created_at: datetime


class UserBrief(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    email: EmailStr


class GroupBrief(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str


class MemberAdd(BaseModel):
    user_id: int | None = None
    email: EmailStr | None = None
    role: str = Field(default="member", pattern="^(admin|member)$")


class MemberRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    group_id: int
    user_id: int
    role: str
    joined_at: datetime
    user: UserBrief | None = None


class GroupWithMembers(GroupRead):
    creator: UserBrief | None = Field(default=None, validation_alias="created_by_user")
    members: list[MemberRead] = []
