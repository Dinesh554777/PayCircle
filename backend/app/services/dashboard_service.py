from collections import defaultdict
from decimal import Decimal

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.expense import Expense
from app.models.expense_split import ExpenseSplit
from app.models.group import Group
from app.models.group_member import GroupMember
from app.models.settlement import Settlement
from app.models.user import User
from app.schemas.dashboard import DashboardOut, GroupSummary
from app.schemas.transaction import FeedItem, FeedSplit
from app.services.activity_service import ActivityService
from app.services.analytics_service import AnalyticsService

RECENT_GROUPS_LIMIT = 5
RECENT_TRANSACTIONS_LIMIT = 10


class DashboardService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def _group_ids(self, user: User) -> list[int]:
        return [
            group.id
            for group in (
                self.db.query(Group)
                .join(GroupMember, GroupMember.group_id == Group.id)
                .filter(GroupMember.user_id == user.id)
                .order_by(Group.created_at.desc())
                .all()
            )
        ]

    def _sum_by_group(
        self, query, id_column, group_ids: list[int]
    ) -> dict[int, Decimal]:
        totals = defaultdict(lambda: Decimal("0.00"))
        for group_id, amount in (
            query.group_by(id_column).filter(id_column.in_(group_ids)).all()
        ):
            totals[group_id] = Decimal(amount or "0.00")
        return totals

    def get_dashboard(self, user: User) -> DashboardOut:
        groups = (
            self.db.query(Group)
            .join(GroupMember, GroupMember.group_id == Group.id)
            .filter(GroupMember.user_id == user.id)
            .order_by(Group.created_at.desc())
            .all()
        )
        group_ids = [group.id for group in groups]

        member_counts: dict[int, int] = {}
        for group_id, count in (
            self.db.query(GroupMember.group_id, func.count(GroupMember.id))
            .filter(GroupMember.group_id.in_(group_ids))
            .group_by(GroupMember.group_id)
            .all()
        ):
            member_counts[group_id] = count

        expense_totals = self._sum_by_group(
            self.db.query(Expense.group_id, func.sum(Expense.amount)),
            Expense.group_id,
            group_ids,
        )
        paid_totals = self._sum_by_group(
            self.db.query(Expense.group_id, func.sum(Expense.amount)).filter(
                Expense.payer_id == user.id
            ),
            Expense.group_id,
            group_ids,
        )
        owed_totals = self._sum_by_group(
            self.db.query(Expense.group_id, func.sum(ExpenseSplit.amount))
            .join(Expense, Expense.id == ExpenseSplit.expense_id)
            .filter(ExpenseSplit.user_id == user.id),
            Expense.group_id,
            group_ids,
        )
        settled_paid_totals = self._sum_by_group(
            self.db.query(Settlement.group_id, func.sum(Settlement.amount)).filter(
                Settlement.payer_id == user.id,
                Settlement.status == "completed",
            ),
            Settlement.group_id,
            group_ids,
        )
        settled_received_totals = self._sum_by_group(
            self.db.query(Settlement.group_id, func.sum(Settlement.amount)).filter(
                Settlement.receiver_id == user.id,
                Settlement.status == "completed",
            ),
            Settlement.group_id,
            group_ids,
        )

        recent_groups: list[GroupSummary] = []
        total_expenses = Decimal("0.00")
        amount_paid = Decimal("0.00")
        amount_owed = Decimal("0.00")
        amount_to_receive = Decimal("0.00")

        for group in groups:
            total = expense_totals[group.id]
            paid = paid_totals[group.id]
            owed = owed_totals[group.id]
            settled_paid = settled_paid_totals[group.id]
            settled_received = settled_received_totals[group.id]
            net = paid - owed + settled_paid - settled_received

            total_expenses += total
            amount_paid += paid
            if net < 0:
                amount_owed += -net
            elif net > 0:
                amount_to_receive += net

            if len(recent_groups) < RECENT_GROUPS_LIMIT:
                recent_groups.append(
                    GroupSummary(
                        id=group.id,
                        name=group.name,
                        description=group.description,
                        created_at=group.created_at,
                        member_count=member_counts.get(group.id, 0),
                        total_expenses=total,
                        my_balance=net,
                    )
                )

        recent_transactions = self._recent_transactions(group_ids)
        analytics = AnalyticsService(self.db).summary(user)
        recent_activity = ActivityService(self.db).list_for_user(user, limit=10)

        return DashboardOut(
            group_count=len(groups),
            total_expenses=total_expenses,
            amount_paid=amount_paid,
            amount_owed=amount_owed,
            amount_to_receive=amount_to_receive,
            recent_groups=recent_groups,
            recent_transactions=recent_transactions,
            analytics=analytics,
            recent_activity=recent_activity,
        )

    def _recent_transactions(self, group_ids: list[int]) -> list[FeedItem]:
        items: list[FeedItem] = []

        for expense in (
            self.db.query(Expense)
            .filter(Expense.group_id.in_(group_ids))
            .order_by(func.coalesce(Expense.paid_at, Expense.created_at).desc())
            .limit(RECENT_TRANSACTIONS_LIMIT)
            .all()
        ):
            items.append(
                FeedItem(
                    type="expense",
                    amount=expense.amount,
                    date=expense.paid_at or expense.created_at,
                    title=expense.title,
                    category=expense.category,
                    ai_category=expense.ai_category,
                    payer=expense.payer,
                    group=expense.group,
                    splits=[
                        FeedSplit(
                            user_id=split.user_id,
                            amount=split.amount,
                            user=split.user,
                        )
                        for split in expense.splits
                    ],
                )
            )

        for settlement in (
            self.db.query(Settlement)
            .filter(Settlement.group_id.in_(group_ids))
            .order_by(Settlement.settled_at.desc())
            .limit(RECENT_TRANSACTIONS_LIMIT)
            .all()
        ):
            items.append(
                FeedItem(
                    type="settlement",
                    amount=settlement.amount,
                    date=settlement.settled_at,
                    title=f"{settlement.payer.name} → {settlement.receiver.name}",
                    payer=settlement.payer,
                    receiver=settlement.receiver,
                    status=settlement.status,
                    group=settlement.group,
                )
            )

        items.sort(key=lambda item: item.date, reverse=True)
        return items[:RECENT_TRANSACTIONS_LIMIT]
