from app.ai.safety import assert_user_in_group
from app.models.activity import Activity
from app.services.base import BaseService


class ActivityType:
    GROUP_CREATED = "group_created"
    MEMBER_ADDED = "member_added"
    MEMBER_REMOVED = "member_removed"
    MEMBER_LEFT = "member_left"
    EXPENSE_ADDED = "expense_added"
    EXPENSE_EDITED = "expense_edited"
    EXPENSE_DELETED = "expense_deleted"
    SETTLEMENT_CREATED = "settlement_created"
    SETTLEMENT_COMPLETED = "settlement_completed"


class ActivityService(BaseService[Activity]):
    def __init__(self, db) -> None:
        super().__init__(db, Activity)

    def record(
        self,
        user_id: int,
        type: str,
        message: str,
        group_id: int | None = None,
        related_id: int | None = None,
    ) -> Activity:
        activity = Activity(
            user_id=user_id,
            type=type,
            message=message,
            group_id=group_id,
            related_id=related_id,
        )
        self.db.add(activity)
        return activity

    def list_for_group(self, group_id: int, actor, limit: int = 50) -> list[Activity]:
        assert_user_in_group(self.db, actor, group_id)
        return (
            self.db.query(Activity)
            .filter(Activity.group_id == group_id)
            .order_by(Activity.created_at.desc(), Activity.id.desc())
            .limit(limit)
            .all()
        )

    def list_for_user(self, user, limit: int = 50) -> list[Activity]:
        group_ids = [membership.group_id for membership in user.memberships]
        if not group_ids:
            return []
        return (
            self.db.query(Activity)
            .filter(Activity.group_id.in_(group_ids))
            .order_by(Activity.created_at.desc(), Activity.id.desc())
            .limit(limit)
            .all()
        )
