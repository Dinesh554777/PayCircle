from collections import defaultdict
from decimal import Decimal

from sqlalchemy.orm import Session

from app.models.expense import Expense
from app.models.expense_split import ExpenseSplit
from app.models.group_member import GroupMember
from app.models.settlement import Settlement
from app.models.user import User
from app.schemas.balance import BalanceItem, BalanceOut, TransferItem
from app.services.group_service import GroupService


class BalanceService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.groups = GroupService(db)

    def get_balances(self, group_id: int, actor: User) -> BalanceOut:
        group = self.groups.get_group_for_user(group_id, actor)

        members = (
            self.db.query(GroupMember).filter(GroupMember.group_id == group.id).all()
        )
        member_ids = [member.user_id for member in members]
        users = {
            user.id: user
            for user in self.db.query(User).filter(User.id.in_(member_ids)).all()
        }

        paid = defaultdict(lambda: Decimal("0.00"))
        owed = defaultdict(lambda: Decimal("0.00"))
        settled_paid = defaultdict(lambda: Decimal("0.00"))
        settled_received = defaultdict(lambda: Decimal("0.00"))

        for expense in self.db.query(Expense).filter(Expense.group_id == group.id):
            paid[expense.payer_id] += expense.amount

        for split in (
            self.db.query(ExpenseSplit)
            .join(Expense, Expense.id == ExpenseSplit.expense_id)
            .filter(Expense.group_id == group.id)
        ):
            owed[split.user_id] += split.amount

        for settlement in self.db.query(Settlement).filter(
            Settlement.group_id == group.id,
            Settlement.status == "completed",
        ):
            settled_paid[settlement.payer_id] += settlement.amount
            settled_received[settlement.receiver_id] += settlement.amount

        balances = []
        for member in members:
            user_id = member.user_id
            net = paid[user_id] - owed[user_id] + settled_paid[user_id] - settled_received[user_id]
            balances.append(
                BalanceItem(
                    user_id=user_id,
                    user=users.get(user_id),
                    total_paid=paid[user_id],
                    total_owed=owed[user_id],
                    settlements_paid=settled_paid[user_id],
                    settlements_received=settled_received[user_id],
                    net_balance=net,
                )
            )
        balances.sort(key=lambda item: item.net_balance, reverse=True)

        creditors = sorted(
            ((b.user_id, b.net_balance) for b in balances if b.net_balance > 0),
            key=lambda pair: -pair[1],
        )
        debtors = sorted(
            ((b.user_id, -b.net_balance) for b in balances if b.net_balance < 0),
            key=lambda pair: -pair[1],
        )

        transfers = []
        while debtors and creditors:
            debtor, debt = debtors.pop(0)
            creditor, credit = creditors.pop(0)
            amount = min(debt, credit)
            transfers.append(
                TransferItem(
                    from_user_id=debtor,
                    from_user=users.get(debtor),
                    to_user_id=creditor,
                    to_user=users.get(creditor),
                    amount=amount,
                )
            )
            if debt > amount:
                debtors.insert(0, (debtor, debt - amount))
            if credit > amount:
                creditors.insert(0, (creditor, credit - amount))

        return BalanceOut(balances=balances, who_owes_whom=transfers)
