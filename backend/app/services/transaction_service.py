from sqlalchemy.orm import Session

from app.models.expense import Expense
from app.models.settlement import Settlement
from app.models.user import User
from app.schemas.transaction import FeedItem, FeedSplit
from app.services.group_service import GroupService


class TransactionService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.groups = GroupService(db)

    def get_group_feed(self, group_id: int, actor: User) -> list[FeedItem]:
        self.groups.get_group_for_user(group_id, actor)

        items: list[FeedItem] = []
        for expense in self.db.query(Expense).filter(Expense.group_id == group_id):
            items.append(
                FeedItem(
                    type="expense",
                    amount=expense.amount,
                    date=expense.paid_at or expense.created_at,
                    title=expense.title,
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

        for settlement in self.db.query(Settlement).filter(
            Settlement.group_id == group_id
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
        return items
