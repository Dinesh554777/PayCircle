from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.schemas.invitation import InvitationCreate, InvitationWithGroup
from app.services.invitation_service import InvitationService

router = APIRouter()


@router.post(
    "/groups/{group_id}/invitations",
    response_model=InvitationWithGroup,
    status_code=201,
)
def send_invitation(
    group_id: int,
    data: InvitationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    inv = InvitationService(db).send_invitation(group_id, data.email, current_user)
    return InvitationService(db)._enrich(inv)


@router.get("/groups/{group_id}/invitations", response_model=list[dict])
def list_group_invitations(
    group_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return InvitationService(db).list_sent_for_group(group_id, current_user)


@router.get("/invitations", response_model=list[dict])
def list_my_invitations(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return InvitationService(db).list_pending_for_user(current_user)


@router.get("/invitations/{token}")
def get_invitation_by_token(
    token: str,
    db: Session = Depends(get_db),
):
    return InvitationService(db).get_by_token(token)


@router.post("/invitations/{token}/accept")
def accept_invitation(
    token: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = InvitationService(db).accept_invitation(token, current_user)
    return {"message": f"You joined {result['group_name']} successfully.", **result}


@router.post("/invitations/{token}/decline")
def decline_invitation(
    token: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = InvitationService(db).decline_invitation(token, current_user)
    return {"message": "Invitation declined.", **result}


@router.post("/invitations/{invitation_id}/resend")
def resend_invitation(
    invitation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    InvitationService(db).resend_invitation(invitation_id, current_user)
    return {"message": "Invitation resent."}


@router.delete(
    "/invitations/{invitation_id}", status_code=204
)
def cancel_invitation(
    invitation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    InvitationService(db).cancel_invitation(invitation_id, current_user)
