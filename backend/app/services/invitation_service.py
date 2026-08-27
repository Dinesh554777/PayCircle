"""Group invitation service — send, accept, decline, resend."""
import logging
from datetime import datetime, timedelta, timezone

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models.group import Group
from app.models.group_invitation import GroupInvitation
from app.models.group_member import GroupMember
from app.models.user import User
from app.services.activity_service import ActivityService, ActivityType
from app.services.email_service import send_invitation_email
from app.services.notification_service import NotificationService, NotificationType

logger = logging.getLogger("paycircle.invitations")

INVITATION_EXPIRY_DAYS = 7


class InvitationService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.notifications = NotificationService(db)
        self.activities = ActivityService(db)

    # ---------------------------------------------------------------- send

    def send_invitation(self, group_id: int, email: str, actor: User) -> GroupInvitation:
        email = email.strip().lower()
        group = self._require_group(group_id)
        self._require_membership(group_id, actor.id)
        self._check_not_already_member(group_id, email)

        existing = self._find_pending(group_id, email)
        if existing:
            return self._resend(existing, actor)

        invitee_user = self.db.query(User).filter(User.email == email).first()
        token = self._generate_token()
        expires_at = datetime.now(timezone.utc) + timedelta(days=INVITATION_EXPIRY_DAYS)

        invitation = GroupInvitation(
            group_id=group_id,
            invited_by=actor.id,
            invitee_email=email,
            invitee_user_id=invitee_user.id if invitee_user else None,
            status="pending",
            token=token,
            expires_at=expires_at,
        )
        self.db.add(invitation)
        self.db.flush()

        email_ok = send_invitation_email(email, actor.name, group.name, token)
        if not email_ok:
            logger.warning("Failed to send invitation email to %s for group '%s'", email, group.name)
            raise HTTPException(
                status_code=502,
                detail="Invitation created but the email could not be sent. Check SMTP configuration.",
            )

        if invitee_user:
            self.notifications.create_notification(
                invitee_user.id,
                NotificationType.GROUP_ACTIVITY,
                "New group invitation",
                f"{actor.name} invited you to join '{group.name}'.",
                group_id=group_id,
                related_id=invitation.id,
            )

        self.db.commit()
        self.db.refresh(invitation)
        return invitation

    # ---------------------------------------------------------------- resend

    def _resend(self, invitation: GroupInvitation, actor: User) -> GroupInvitation:
        import secrets

        group = self.db.get(Group, invitation.group_id)
        invitation.token = secrets.token_hex(32)
        invitation.expires_at = datetime.now(timezone.utc) + timedelta(days=INVITATION_EXPIRY_DAYS)
        invitation.status = "pending"
        invitation.accepted_at = None
        invitation.declined_at = None
        self.db.flush()

        email_ok = send_invitation_email(
            invitation.invitee_email, actor.name, group.name, invitation.token
        )
        if not email_ok:
            logger.warning("Failed to resend invitation email to %s", invitation.invitee_email)
            raise HTTPException(
                status_code=502,
                detail="Invitation updated but the email could not be sent. Check SMTP configuration.",
            )

        if invitation.invitee_user_id:
            self.notifications.create_notification(
                invitation.invitee_user_id,
                NotificationType.GROUP_ACTIVITY,
                "Invitation resent",
                f"{actor.name} re-invited you to join '{group.name}'.",
                group_id=invitation.group_id,
                related_id=invitation.id,
            )

        self.db.commit()
        self.db.refresh(invitation)
        return invitation

    def resend_invitation(self, invitation_id: int, actor: User) -> GroupInvitation:
        invitation = self.db.get(GroupInvitation, invitation_id)
        if invitation is None:
            raise HTTPException(status_code=404, detail="Invitation not found")
        if invitation.invited_by != actor.id:
            raise HTTPException(status_code=403, detail="Only the inviter can resend")
        if invitation.status not in ("pending", "declined", "expired"):
            raise HTTPException(
                status_code=400, detail=f"Cannot resend a {invitation.status} invitation"
            )
        return self._resend(invitation, actor)

    # ---------------------------------------------------------------- accept

    def accept_invitation(self, token: str, user: User) -> dict:
        invitation = self._find_by_token(token)
        self._validate_acceptable(invitation, user)

        now = datetime.now(timezone.utc)
        invitation.status = "accepted"
        invitation.accepted_at = now
        invitation.invitee_user_id = user.id

        member = GroupMember(group_id=invitation.group_id, user_id=user.id, role="member")
        self.db.add(member)

        group = self.db.get(Group, invitation.group_id)
        self.activities.record(
            user.id,
            ActivityType.MEMBER_ADDED,
            f"{user.name} joined group '{group.name}'.",
            group_id=invitation.group_id,
            related_id=member.id,
        )

        self.db.commit()
        self.db.refresh(member)
        return {"group_name": group.name, "group_id": group.id}

    # ---------------------------------------------------------------- decline

    def decline_invitation(self, token: str, user: User) -> dict:
        invitation = self._find_by_token(token)

        if invitation.status != "pending":
            raise HTTPException(status_code=400, detail=f"Invitation is already {invitation.status}")

        if invitation.invitee_user_id is not None and invitation.invitee_user_id != user.id:
            raise HTTPException(status_code=403, detail="This invitation is not for you")

        if datetime.now(timezone.utc) > invitation.expires_at:
            raise HTTPException(status_code=400, detail="This invitation has expired")

        invitation.status = "declined"
        invitation.declined_at = datetime.now(timezone.utc)
        if invitation.invitee_user_id is None:
            invitation.invitee_user_id = user.id

        group = self.db.get(Group, invitation.group_id)
        self.db.commit()
        return {"group_name": group.name, "group_id": group.id}

    # ---------------------------------------------------------------- list

    def list_pending_for_user(self, user: User) -> list[dict]:
        now = datetime.now(timezone.utc)
        invitations = (
            self.db.query(GroupInvitation)
            .filter(
                GroupInvitation.invitee_email == user.email,
                GroupInvitation.status == "pending",
                GroupInvitation.expires_at > now,
            )
            .order_by(GroupInvitation.created_at.desc())
            .all()
        )
        return [self._enrich(inv) for inv in invitations]

    def list_sent_for_group(self, group_id: int, actor: User) -> list[dict]:
        self._require_membership(group_id, actor.id)
        invitations = (
            self.db.query(GroupInvitation)
            .filter(GroupInvitation.group_id == group_id)
            .order_by(GroupInvitation.created_at.desc())
            .all()
        )
        return [self._enrich(inv) for inv in invitations]

    def get_by_token(self, token: str) -> dict:
        invitation = self._find_by_token(token)
        group = self.db.get(Group, invitation.group_id)
        inviter = self.db.get(User, invitation.invited_by)
        return {
            "id": invitation.id,
            "token": invitation.token,
            "group_id": invitation.group_id,
            "group_name": group.name if group else "Unknown",
            "inviter_name": inviter.name if inviter else "Someone",
            "invitee_email": invitation.invitee_email,
            "status": invitation.status,
            "expires_at": invitation.expires_at,
        }

    # ---------------------------------------------------------------- cancel

    def cancel_invitation(self, invitation_id: int, actor: User) -> None:
        invitation = self.db.get(GroupInvitation, invitation_id)
        if invitation is None:
            raise HTTPException(status_code=404, detail="Invitation not found")
        if invitation.invited_by != actor.id:
            raise HTTPException(status_code=403, detail="Only the inviter can cancel")
        if invitation.status != "pending":
            raise HTTPException(status_code=400, detail=f"Cannot cancel a {invitation.status} invitation")
        invitation.status = "cancelled"
        self.db.commit()

    # ---------------------------------------------------------------- helpers

    def _require_group(self, group_id: int) -> Group:
        group = self.db.get(Group, group_id)
        if group is None:
            raise HTTPException(status_code=404, detail="Group not found")
        return group

    def _require_membership(self, group_id: int, user_id: int) -> None:
        exists = (
            self.db.query(GroupMember)
            .filter(GroupMember.group_id == group_id, GroupMember.user_id == user_id)
            .first()
        )
        if exists is None:
            raise HTTPException(status_code=403, detail="You are not a member of this group")

    def _check_not_already_member(self, group_id: int, email: str) -> None:
        user = self.db.query(User).filter(User.email == email).first()
        if user:
            exists = (
                self.db.query(GroupMember)
                .filter(GroupMember.group_id == group_id, GroupMember.user_id == user.id)
                .first()
            )
            if exists:
                raise HTTPException(
                    status_code=409, detail="This user is already a member of this group"
                )

    def _find_pending(self, group_id: int, email: str) -> GroupInvitation | None:
        return (
            self.db.query(GroupInvitation)
            .filter(
                GroupInvitation.group_id == group_id,
                GroupInvitation.invitee_email == email,
                GroupInvitation.status == "pending",
            )
            .first()
        )

    def _find_by_token(self, token: str) -> GroupInvitation:
        invitation = (
            self.db.query(GroupInvitation).filter(GroupInvitation.token == token).first()
        )
        if invitation is None:
            raise HTTPException(status_code=404, detail="Invitation not found")
        return invitation

    def _validate_acceptable(self, invitation: GroupInvitation, user: User) -> None:
        if invitation.status == "accepted":
            raise HTTPException(status_code=400, detail="Invitation already accepted")
        if invitation.status in ("declined", "cancelled"):
            raise HTTPException(status_code=400, detail=f"Invitation has been {invitation.status}")
        if datetime.now(timezone.utc) > invitation.expires_at:
            invitation.status = "expired"
            self.db.commit()
            raise HTTPException(status_code=400, detail="This invitation has expired")
        if invitation.invitee_email.strip().lower() != user.email.strip().lower():
            raise HTTPException(
                status_code=403,
                detail="This invitation was sent to a different email address",
            )
        already_member = (
            self.db.query(GroupMember)
            .filter(
                GroupMember.group_id == invitation.group_id,
                GroupMember.user_id == user.id,
            )
            .first()
        )
        if already_member:
            invitation.status = "accepted"
            self.db.commit()
            raise HTTPException(status_code=400, detail="You are already a member of this group")

    def _enrich(self, inv: GroupInvitation) -> dict:
        group = self.db.get(Group, inv.group_id)
        inviter = self.db.get(User, inv.invited_by)
        member_count = (
            self.db.query(GroupMember)
            .filter(GroupMember.group_id == inv.group_id)
            .count()
        )
        return {
            "id": inv.id,
            "group_id": inv.group_id,
            "invited_by": inv.invited_by,
            "invitee_email": inv.invitee_email,
            "invitee_user_id": inv.invitee_user_id,
            "status": inv.status,
            "token": inv.token,
            "expires_at": inv.expires_at,
            "accepted_at": inv.accepted_at,
            "declined_at": inv.declined_at,
            "created_at": inv.created_at,
            "group_name": group.name if group else "Unknown",
            "inviter_name": inviter.name if inviter else "Someone",
            "member_count": member_count,
        }

    @staticmethod
    def _generate_token() -> str:
        import secrets
        return secrets.token_hex(32)
