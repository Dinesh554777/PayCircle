"""Chatbot service that answers questions using only the authenticated user's data."""
from datetime import datetime
from decimal import Decimal

from fastapi import HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from ai.chatbot import (
    EXPENSE_KEYWORDS,
    NO_DATA_MESSAGE,
    UNRELATED_MESSAGE,
    Chatbot,
)
from app.models.expense import Expense
from app.models.group import Group
from app.models.group_member import GroupMember
from app.models.user import User
from app.services.balance_service import BalanceService
from app.services.insights_service import InsightsService
from app.services.prediction_service import PredictionService

RECENT_EXPENSES_LIMIT = 10


class ChatbotService:
    """Build a safe context from the user's expenses and answer questions."""

    def __init__(self, db: Session, chatbot: Chatbot | None = None) -> None:
        self.db = db
        self.chatbot = chatbot or Chatbot()

    def answer(self, message: str, user: User) -> str:
        question = (message or "").strip()
        if not question:
            raise HTTPException(status_code=400, detail="Message cannot be empty")

        context = self._build_context(user)
        if not context.get("has_data"):
            return NO_DATA_MESSAGE
        if not self._is_expense_related(question):
            return UNRELATED_MESSAGE
        return self.chatbot.answer(question, context)

    def _build_context(self, user: User) -> dict:
        insights = InsightsService(self.db).get_insights(user)
        if insights.expense_count == 0:
            return {"has_data": False}

        now = datetime.now()
        current_key = (now.year, now.month)
        current_month = None
        for month in insights.monthly_summary:
            year, month_num = month.month.split("-")
            if (int(year), int(month_num)) == current_key:
                current_month = {
                    "month": month.label,
                    "amount": month.amount,
                    "count": month.count,
                }
                break

        prediction = PredictionService(self.db).get_prediction(user)
        prediction_ctx = None
        if prediction.has_prediction and prediction.predicted_amount is not None:
            prediction_ctx = {
                "amount": prediction.predicted_amount,
                "period": prediction.period_label,
            }

        owes, owed_to = self._collect_balances(user)

        return {
            "has_data": True,
            "summary": insights.summary,
            "total_spending": insights.total_spending,
            "average_expense": insights.average_expense,
            "top_category": (
                {
                    "category": insights.top_category,
                    "amount": insights.top_category_amount,
                    "share": insights.top_category_share,
                }
                if insights.top_category
                else None
            ),
            "category_breakdown": [
                {
                    "category": item.category,
                    "amount": item.amount,
                    "count": item.count,
                    "share": item.share,
                }
                for item in insights.category_breakdown
            ],
            "monthly_totals": [
                {"month": item.label, "amount": item.amount}
                for item in insights.monthly_summary
            ],
            "current_month": current_month,
            "recent_expenses": self._recent_expenses(user),
            "balances": {"you_owe": owes, "you_are_owed": owed_to},
            "suggestions": insights.suggestions,
            "prediction": prediction_ctx,
        }

    def _user_group_ids(self, user: User) -> list[int]:
        return [
            group.id
            for group in (
                self.db.query(Group)
                .join(GroupMember, GroupMember.group_id == Group.id)
                .filter(GroupMember.user_id == user.id)
                .all()
            )
        ]

    def _recent_expenses(self, user: User, limit: int = RECENT_EXPENSES_LIMIT) -> list[dict]:
        group_ids = self._user_group_ids(user)
        if not group_ids:
            return []
        expenses = (
            self.db.query(Expense)
            .filter(Expense.group_id.in_(group_ids))
            .order_by(func.coalesce(Expense.paid_at, Expense.created_at).desc())
            .all()
        )
        items: list[dict] = []
        for expense in expenses:
            share = sum(
                (
                    split.amount
                    for split in expense.splits
                    if split.user_id == user.id
                ),
                Decimal("0.00"),
            )
            if share <= 0:
                continue
            date = expense.paid_at or expense.created_at
            category = expense.category or expense.ai_category or "Other"
            items.append(
                {
                    "title": expense.title or "Expense",
                    "amount": share,
                    "category": category,
                    "date": date.date().isoformat() if date else "",
                    "group": expense.group.name,
                    "paid_by": expense.payer.name,
                }
            )
            if len(items) >= limit:
                break
        return items

    def _collect_balances(self, user: User) -> tuple[list[dict], list[dict]]:
        owes: list[dict] = []
        owed_to: list[dict] = []
        for group in (
            self.db.query(Group)
            .join(GroupMember, GroupMember.group_id == Group.id)
            .filter(GroupMember.user_id == user.id)
            .all()
        ):
            balances = BalanceService(self.db).get_balances(group.id, user)
            for transfer in balances.who_owes_whom:
                if transfer.from_user_id == user.id and transfer.to_user is not None:
                    owes.append(
                        {
                            "to": transfer.to_user.name,
                            "amount": transfer.amount,
                            "group": group.name,
                        }
                    )
                elif transfer.to_user_id == user.id and transfer.from_user is not None:
                    owed_to.append(
                        {
                            "from": transfer.from_user.name,
                            "amount": transfer.amount,
                            "group": group.name,
                        }
                    )
        return owes, owed_to

    @staticmethod
    def _is_expense_related(question: str) -> bool:
        lowered = question.lower()
        return any(keyword in lowered for keyword in EXPENSE_KEYWORDS)
