from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class InvitationCreate(BaseModel):
    email: EmailStr


class InvitationRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    group_id: int
    invited_by: int
    invitee_email: str
    invitee_user_id: int | None = None
    status: str
    expires_at: datetime
    accepted_at: datetime | None = None
    declined_at: datetime | None = None
    created_at: datetime


class InvitationWithGroup(InvitationRead):
    token: str = ""
    group_name: str = ""
    inviter_name: str = ""
    member_count: int = 0


class InvitationTokenOut(BaseModel):
    token: str
    group_name: str
    inviter_name: str
    invitee_email: str
    status: str
    expires_at: datetime
    group_id: int


class InvitationActionOut(BaseModel):
    message: str
    group_name: str
    group_id: int
