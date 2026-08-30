"""Tests for the in-app, username-based group invitation flow."""
from datetime import datetime, timedelta, timezone

import pytest
from fastapi import HTTPException

from app.models.group_invitation import GroupInvitation
from app.models.group_member import GroupMember
from app.models.notification import Notification
from app.models.user import User
from app.services.invitation_service import (
    INVITATION_EXPIRY_DAYS,
    InvitationService,
)
from app.services.notification_service import NotificationType

from tests.helpers import add_member, make_group, make_user


def pending_for(db, user) -> list[dict]:
    return InvitationService(db).list_pending_for_user(user)


def test_send_creates_pending_invitation_and_notification(db_session):
    owner = make_user(db_session, "Owner", "owner@example.com")
    invitee = make_user(db_session, "Invitee", "invitee@example.com")
    group = make_group(db_session, owner, "Trip")

    inv = InvitationService(db_session).send_invitation(group.id, "invitee", owner)

    assert inv.status == "pending"
    assert inv.invitee_user_id == invitee.id
    assert inv.group_id == group.id
    ref = inv.expires_at
    now = datetime.now(timezone.utc)
    if ref.tzinfo is None:
        now = now.replace(tzinfo=None)
    assert now < ref
    assert (ref - now).days in (INVITATION_EXPIRY_DAYS, INVITATION_EXPIRY_DAYS - 1)

    notif = (
        db_session.query(Notification)
        .filter(
            Notification.user_id == invitee.id,
            Notification.type == NotificationType.GROUP_INVITATION,
            Notification.related_id == inv.id,
        )
        .first()
    )
    assert notif is not None
    assert not notif.is_read


def test_invite_nonexistent_user_raises_404(db_session):
    owner = make_user(db_session, "Owner", "owner@example.com")
    group = make_group(db_session, owner, "Trip")
    with pytest.raises(HTTPException) as exc:
        InvitationService(db_session).send_invitation(group.id, "nobody", owner)
    assert exc.value.status_code == 404


def test_invite_self_raises_400(db_session):
    owner = make_user(db_session, "Owner", "owner@example.com")
    group = make_group(db_session, owner, "Trip")
    with pytest.raises(HTTPException) as exc:
        InvitationService(db_session).send_invitation(group.id, "owner", owner)
    assert exc.value.status_code == 400


def test_invite_non_member_raises_403(db_session):
    owner = make_user(db_session, "Owner", "owner@example.com")
    outsider = make_user(db_session, "Outsider", "outsider@example.com")
    member = make_user(db_session, "Member", "member@example.com")
    group = make_group(db_session, owner, "Trip")
    add_member(db_session, group, member)
    with pytest.raises(HTTPException) as exc:
        InvitationService(db_session).send_invitation(
            group.id, "member", outsider
        )
    assert exc.value.status_code == 403


def test_invite_existing_member_raises_409(db_session):
    owner = make_user(db_session, "Owner", "owner@example.com")
    member = make_user(db_session, "Member", "member@example.com")
    group = make_group(db_session, owner, "Trip")
    add_member(db_session, group, member)
    with pytest.raises(HTTPException) as exc:
        InvitationService(db_session).send_invitation(group.id, "member", owner)
    assert exc.value.status_code == 409


def test_duplicate_pending_raises_409(db_session):
    owner = make_user(db_session, "Owner", "owner@example.com")
    invitee = make_user(db_session, "Invitee", "invitee@example.com")
    group = make_group(db_session, owner, "Trip")

    svc = InvitationService(db_session)
    inv1 = svc.send_invitation(group.id, "invitee", owner)
    with pytest.raises(HTTPException) as exc:
        svc.send_invitation(group.id, "invitee", owner)
    assert exc.value.status_code == 409
    count = (
        db_session.query(GroupInvitation)
        .filter(GroupInvitation.group_id == group.id)
        .count()
    )
    assert count == 1
    assert inv1.status == "pending"


def test_accept_adds_member_with_role_and_returns_group(db_session):
    owner = make_user(db_session, "Owner", "owner@example.com")
    invitee = make_user(db_session, "Invitee", "invitee@example.com")
    group = make_group(db_session, owner, "Trip")
    inv = InvitationService(db_session).send_invitation(group.id, "invitee", owner)

    result = InvitationService(db_session).accept_invitation(inv.id, invitee)

    assert result["group_id"] == group.id
    assert result["group_name"] == "Trip"
    member = (
        db_session.query(GroupMember)
        .filter(GroupMember.group_id == group.id, GroupMember.user_id == invitee.id)
        .first()
    )
    assert member is not None
    assert member.role == "member"
    assert inv.status == "accepted"

    notif = (
        db_session.query(Notification)
        .filter(
            Notification.user_id == invitee.id,
            Notification.type == NotificationType.GROUP_INVITATION,
            Notification.related_id == inv.id,
        )
        .first()
    )
    assert notif is not None and notif.is_read


def test_accept_other_users_invitation_raises_403(db_session):
    owner = make_user(db_session, "Owner", "owner@example.com")
    invitee = make_user(db_session, "Invitee", "invitee@example.com")
    intruder = make_user(db_session, "Intruder", "intruder@example.com")
    group = make_group(db_session, owner, "Trip")
    inv = InvitationService(db_session).send_invitation(group.id, "invitee", owner)
    with pytest.raises(HTTPException) as exc:
        InvitationService(db_session).accept_invitation(inv.id, intruder)
    assert exc.value.status_code == 403


def test_decline_sets_declined_and_marks_notification_read(db_session):
    owner = make_user(db_session, "Owner", "owner@example.com")
    invitee = make_user(db_session, "Invitee", "invitee@example.com")
    group = make_group(db_session, owner, "Trip")
    inv = InvitationService(db_session).send_invitation(group.id, "invitee", owner)

    result = InvitationService(db_session).decline_invitation(inv.id, invitee)

    assert inv.status == "declined"
    assert result["group_id"] == group.id
    # not added as member
    assert (
        db_session.query(GroupMember)
        .filter(GroupMember.group_id == group.id, GroupMember.user_id == invitee.id)
        .first()
        is None
    )
    notif = (
        db_session.query(Notification)
        .filter(
            Notification.user_id == invitee.id,
            Notification.type == NotificationType.GROUP_INVITATION,
            Notification.related_id == inv.id,
        )
        .first()
    )
    assert notif is not None and notif.is_read


def test_accept_expired_invitation_raises(db_session):
    owner = make_user(db_session, "Owner", "owner@example.com")
    invitee = make_user(db_session, "Invitee", "invitee@example.com")
    group = make_group(db_session, owner, "Trip")
    inv = InvitationService(db_session).send_invitation(group.id, "invitee", owner)
    inv.expires_at = datetime.now(timezone.utc) - timedelta(days=1)
    db_session.commit()
    with pytest.raises(HTTPException) as exc:
        InvitationService(db_session).accept_invitation(inv.id, invitee)
    assert exc.value.status_code == 400
    assert inv.status == "expired"


def test_list_pending_only_returns_own_active_invitations(db_session):
    owner = make_user(db_session, "Owner", "owner@example.com")
    invitee = make_user(db_session, "Invitee", "invitee@example.com")
    group = make_group(db_session, owner, "Trip")
    svc = InvitationService(db_session)
    inv = svc.send_invitation(group.id, "invitee", owner)
    # another group invitation too
    other_group = make_group(db_session, owner, "Dinner")
    svc.send_invitation(other_group.id, "invitee", owner)
    # decline one -> should disappear from pending
    svc.decline_invitation(inv.id, invitee)

    listing = pending_for(db_session, invitee)
    ids = [row["id"] for row in listing]
    assert inv.id not in ids
    assert len(ids) == 1


def test_cancel_invitation_sets_cancelled(db_session):
    owner = make_user(db_session, "Owner", "owner@example.com")
    invitee = make_user(db_session, "Invitee", "invitee@example.com")
    group = make_group(db_session, owner, "Trip")
    inv = InvitationService(db_session).send_invitation(group.id, "invitee", owner)
    InvitationService(db_session).cancel_invitation(inv.id, owner)
    assert inv.status == "cancelled"
