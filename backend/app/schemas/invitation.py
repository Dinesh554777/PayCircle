from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class InvitationCreate(BaseModel):
    username: str = Field(min_length=1, max_length=50)


class InvitationRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    group_id: int
    invited_by: int
    invitee_user_id: int | None = None
    status: str
    expires_at: datetime
    created_at: datetime


class InvitationWithGroup(InvitationRead):
    token: str = ""
    group_name: str = ""
    inviter_name: str = ""
    invitee_username: str = ""
    invitee_name: str = ""
    member_count: int = 0


class InvitationTokenOut(BaseModel):
    token: str
    group_name: str
    inviter_name: str
    status: str
    expires_at: datetime
    group_id: int


class InvitationActionOut(BaseModel):
    message: str
    group_name: str
    group_id: int
