"""Agentic expense assistant (single lightweight agent with tools).

Flow:  user request → understand intent → select tool → retrieve data →
       analyze → generate response

Each tool only ever touches the authenticated user's own data. This module is
the future extension point for LLM function-calling: an LLM can be pointed at
`list_tools()` and asked to call `run_tool()`.
"""
from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from decimal import Decimal
from typing import Any, Callable

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.ai.safety import SAFETY_PREAMBLE, assert_user_in_group, user_group_ids
from app.models.expense import Expense
from app.models.group import Group
from app.models.settlement import Settlement
from app.models.user import User
from app.services.analytics_service import AnalyticsService
from app.services.balance_service import BalanceService
from app.services.settlement_optimizer import SettlementOptimizerService

DEFAULT_LIMIT = 5

TOOL_DESCRIPTIONS = {
    "get_expenses": (
        "List the user's expenses, optionally filtered by category. "
        "Returns title, amount (user's share), category, date, and group."
    ),
    "get_group_balance": (
        "Show who owes whom in a group, or across all the user's groups. "
        "Accepts an optional group_id."
    ),
    "get_transactions": (
        "List recent expense and settlement activity in the user's groups. "
        "Accepts an optional group_id."
    ),
    "calculate_spending": (
        "Total spending for period 'total', 'month' (current month), or "
        "'last_month'. Returns the total and expense count."
    ),
    "get_category_summary": (
        "Spending totals and share per category."
    ),
    "get_monthly_summary": (
        "Monthly spending totals and expense counts over the user's history."
    ),
    "get_settlement_suggestions": (
        "Optimized settlement suggestions for a group: the minimum number of "
        "payments that clears all outstanding balances. Accepts a group_id."
    ),
}

MONTH_LABELS = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
]

_NO_DATA = "You don't have enough expense data to answer that yet. Add an expense and I'll be able to help."

_GUIDANCE = (
    "I can help you understand your PayCircle spending. Try asking about: "
    "your spending this month, total spending, highest spending category, "
    "monthly totals, recent expenses, who you owe, settlement suggestions, "
    "or your group balances."
)


@dataclass
class Tool:
    name: str
    description: str
    handler: Callable[..., Any]


class ExpenseAgent:
    """A single assistant that answers questions through small, safe tools."""

    def __init__(
        self,
        db: Session,
        analytics: AnalyticsService | None = None,
        balances: BalanceService | None = None,
    ) -> None:
        self.db = db
        self.analytics = analytics or AnalyticsService(db)
        self.balances = balances or BalanceService(db)
        self._tools: dict[str, Tool] = self._build_tools()

    # ------------------------------------------------------------------ tools

    def _build_tools(self) -> dict[str, Tool]:
        return {
            "get_expenses": Tool(
                name="get_expenses",
                description=TOOL_DESCRIPTIONS["get_expenses"],
                handler=self._tool_get_expenses,
            ),
            "get_group_balance": Tool(
                name="get_group_balance",
                description=TOOL_DESCRIPTIONS["get_group_balance"],
                handler=self._tool_get_group_balance,
            ),
            "get_transactions": Tool(
                name="get_transactions",
                description=TOOL_DESCRIPTIONS["get_transactions"],
                handler=self._tool_get_transactions,
            ),
            "calculate_spending": Tool(
                name="calculate_spending",
                description=TOOL_DESCRIPTIONS["calculate_spending"],
                handler=self._tool_calculate_spending,
            ),
            "get_category_summary": Tool(
                name="get_category_summary",
                description=TOOL_DESCRIPTIONS["get_category_summary"],
                handler=self._tool_get_category_summary,
            ),
            "get_monthly_summary": Tool(
                name="get_monthly_summary",
                description=TOOL_DESCRIPTIONS["get_monthly_summary"],
                handler=self._tool_get_monthly_summary,
            ),
            "get_settlement_suggestions": Tool(
                name="get_settlement_suggestions",
                description=TOOL_DESCRIPTIONS["get_settlement_suggestions"],
                handler=self._tool_get_settlement_suggestions,
            ),
        }

    @property
    def tools(self) -> dict[str, Tool]:
        return self._tools

    def list_tools(self) -> list[dict]:
        """Tool metadata for future LLM function-calling registration."""
        return [
            {
                "name": tool.name,
                "description": tool.description,
                "parameters": {"type": "object", "properties": {}},
                "safety": SAFETY_PREAMBLE,
            }
            for tool in self._tools.values()
        ]

    def run_tool(self, name: str, user: User, group_id: int | None = None, **kwargs) -> dict:
        """Execute a tool. Returns a JSON-safe dict (never raw ORM objects)."""
        tool = self._tools.get(name)
        if tool is None:
            raise HTTPException(
                status_code=404, detail=f"Unknown tool: {name}"
            )
        kwargs["group_id"] = group_id
        return tool.handler(user, **kwargs)

    # ------------------------------------------------------------- tool impls

    def _tool_get_expenses(
        self,
        user: User,
        category: str | None = None,
        limit: int = DEFAULT_LIMIT,
        sort: str = "recent",
        group_id: int | None = None,
    ) -> dict:
        rows = self.analytics.expense_rows(user, group_id=group_id)
        if category:
            rows = [row for row in rows if row.category.lower() == category.lower()]
        if sort == "amount":
            rows = sorted(rows, key=lambda row: row.share, reverse=True)
        else:
            rows = sorted(rows, key=lambda row: row.date, reverse=True)
        expenses = [
            {
                "title": row.expense.title or "Expense",
                "amount": _num(row.share),
                "category": row.category,
                "date": row.date.date().isoformat(),
                "group": row.expense.group.name if row.expense.group else "Group",
            }
            for row in rows[:limit]
        ]
        return {"expenses": expenses, "count": len(expenses)}

    def _tool_get_group_balance(
        self, user: User, group_id: int | None = None
    ) -> dict:
        groups = self._groups_for(user, group_id)
        result = {"groups": []}
        for group in groups:
            balances = self.balances.get_balances(group.id, user)
            mine = next(
                (
                    item
                    for item in balances.balances
                    if item.user_id == user.id
                ),
                None,
            )
            result["groups"].append(
                {
                    "group_id": group.id,
                    "name": group.name,
                    "your_net_balance": _num(mine.net_balance) if mine else 0.0,
                    "transfers": [
                        {
                            "from": transfer.from_user.name if transfer.from_user else None,
                            "to": transfer.to_user.name if transfer.to_user else None,
                            "amount": _num(transfer.amount),
                        }
                        for transfer in balances.who_owes_whom
                    ],
                }
            )
        return result

    def _tool_get_transactions(
        self, user: User, group_id: int | None = None, limit: int = DEFAULT_LIMIT
    ) -> dict:
        groups = self._groups_for(user, group_id)
        group_ids = [group.id for group in groups]
        items: list[dict] = []
        if group_ids:
            expenses = (
                self.db.query(Expense)
                .filter(Expense.group_id.in_(group_ids))
                .all()
            )
            for expense in expenses:
                items.append(
                    {
                        "type": "expense",
                        "title": expense.title or "Expense",
                        "amount": _num(expense.amount),
                        "date": (expense.paid_at or expense.created_at).isoformat(),
                        "group": expense.group.name if expense.group else "Group",
                        "paid_by": expense.payer.name if expense.payer else None,
                    }
                )
            settlements = (
                self.db.query(Settlement)
                .filter(Settlement.group_id.in_(group_ids))
                .all()
            )
            for settlement in settlements:
                items.append(
                    {
                        "type": "settlement",
                        "title": (
                            f"{settlement.payer.name if settlement.payer else 'member'} → "
                            f"{settlement.receiver.name if settlement.receiver else 'member'}"
                        ),
                        "amount": _num(settlement.amount),
                        "date": settlement.settled_at.isoformat(),
                        "group": settlement.group.name if settlement.group else "Group",
                        "status": settlement.status,
                    }
                )
        items.sort(key=lambda item: item["date"], reverse=True)
        return {"transactions": items[:limit], "count": len(items[:limit])}

    def _tool_calculate_spending(self, user: User, period: str = "total", group_id: int | None = None) -> dict:
        rows = self.analytics.expense_rows(user, group_id=group_id)
        now = datetime.now()
        current_key = (now.year, now.month)
        prev_key = (
            (current_key[0] - 1, 12)
            if current_key[1] == 1
            else (current_key[0], current_key[1] - 1)
        )

        if period == "month":
            filtered = [
                row
                for row in rows
                if (row.date.year, row.date.month) == current_key
            ]
            label = f"{MONTH_LABELS[current_key[1] - 1]} {current_key[0]}"
        elif period == "last_month":
            filtered = [
                row
                for row in rows
                if (row.date.year, row.date.month) == prev_key
            ]
            label = f"{MONTH_LABELS[prev_key[1] - 1]} {prev_key[0]}"
        else:
            filtered = list(rows)
            label = "all time"

        total = sum((row.share for row in filtered), Decimal("0.00"))
        return {
            "period": period,
            "label": label,
            "total": _num(total),
            "count": len(filtered),
        }

    def _tool_get_category_summary(self, user: User, group_id: int | None = None) -> dict:
        rows = self.analytics.expense_rows(user, group_id=group_id)
        if not rows:
            return {"categories": []}
        total = sum((row.share for row in rows), Decimal("0.00"))
        totals: dict[str, Decimal] = {}
        for row in rows:
            totals[row.category] = totals.get(row.category, Decimal("0.00")) + row.share
        categories = [
            {
                "category": category,
                "amount": _num(amount),
                "count": sum(1 for row in rows if row.category == category),
                "share": float(amount / total * 100),
            }
            for category, amount in sorted(
                totals.items(), key=lambda item: item[1], reverse=True
            )
        ]
        return {"categories": categories}

    def _tool_get_monthly_summary(self, user: User, group_id: int | None = None) -> dict:
        rows = self.analytics.expense_rows(user, group_id=group_id)
        if not rows:
            return {"months": []}
        totals: dict[tuple[int, int], Decimal] = {}
        for row in rows:
            key = (row.date.year, row.date.month)
            totals[key] = totals.get(key, Decimal("0.00")) + row.share
        months = [
            {
                "month": f"{year:04d}-{month:02d}",
                "label": f"{MONTH_LABELS[month - 1]} {year}",
                "amount": _num(amount),
                "count": sum(
                    1
                    for row in rows
                    if (row.date.year, row.date.month) == (year, month)
                ),
            }
            for (year, month), amount in sorted(totals.items())
        ]
        return {"months": months}

    def _tool_get_settlement_suggestions(
        self, user: User, group_id: int | None = None
    ) -> dict:
        groups = self._groups_for(user, group_id)
        optimizer = SettlementOptimizerService(self.db)
        result = {"groups": []}
        for group in groups:
            suggestions = optimizer.get_suggestions(group.id, user)
            result["groups"].append(
                {
                    "group_id": group.id,
                    "name": group.name,
                    "settled_up": suggestions.settled_up,
                    "payment_count": suggestions.payment_count,
                    "total_amount": _num(suggestions.total_amount),
                    "suggestions": [
                        {
                            "payer": suggestion.payer.name
                            if suggestion.payer
                            else None,
                            "receiver": suggestion.receiver.name
                            if suggestion.receiver
                            else None,
                            "amount": _num(suggestion.amount),
                        }
                        for suggestion in suggestions.suggestions
                    ],
                }
            )
        return result

    # ------------------------------------------------------------- data scope

    def _groups_for(self, user: User, group_id: int | None):
        if group_id is not None:
            return [assert_user_in_group(self.db, user, group_id)]
        ids = user_group_ids(self.db, user)
        if not ids:
            return []
        return self.db.query(Group).filter(Group.id.in_(ids)).all()

    # ------------------------------------------------------------ intent + chat

    def resolve_intent(self, question: str) -> tuple[str, dict]:
        """Keyword-based intent → (tool name, args). Kept tiny and rule-based."""
        text = question.lower()

        if any(word in text for word in ("settle", "settlement", "settlements", "fewer payments", "minimum payments", "how to pay back")):
            return "get_settlement_suggestions", {}
        if any(word in text for word in ("who should i pay", "who do i owe", "how much do i owe")):
            return "get_group_balance", {}
        if any(word in text for word in ("who owes me", "who owes", "am i owed")):
            return "get_group_balance", {}
        if any(word in text for word in ("this month", "this month's", "month's spending", "spent this month", "spend this month")):
            return "calculate_spending", {"period": "month"}
        if any(word in text for word in ("last month", "previous month")):
            return "calculate_spending", {"period": "last_month"}
        if any(word in text for word in ("highest", "largest", "biggest", "top expense")):
            return "get_expenses", {"limit": 1, "sort": "amount"}
        if "category" in text or "categories" in text:
            return "get_category_summary", {}
        if any(word in text for word in ("monthly", "per month", "every month")):
            return "get_monthly_summary", {}
        if any(word in text for word in ("transaction", "transactions", "activity")):
            return "get_transactions", {}
        if any(word in text for word in ("recent", "show my expenses", "show my recent", "my expenses", "last expense")):
            return "get_expenses", {}
        if any(word in text for word in ("total", "spent", "spending", "spend", "all my money", "how much")):
            return "calculate_spending", {"period": "total"}
        return "", {}

    def answer(self, question: str, user: User, group_id: int | None = None) -> str:
        question = (question or "").strip()
        if not question:
            return _GUIDANCE

        tool_name, args = self.resolve_intent(question)
        if not tool_name:
            return _GUIDANCE

        result = self.run_tool(tool_name, user, group_id=group_id, **args)
        return self._generate_response(tool_name, result)

    # ------------------------------------------------------------ response gen

    def _generate_response(self, tool_name: str, result: dict) -> str:
        if tool_name == "get_group_balance":
            return self._respond_balance(result)
        if tool_name == "calculate_spending":
            return self._respond_spending(result)
        if tool_name == "get_category_summary":
            return self._respond_categories(result)
        if tool_name == "get_monthly_summary":
            return self._respond_monthly(result)
        if tool_name == "get_expenses":
            return self._respond_expenses(result)
        if tool_name == "get_transactions":
            return self._respond_transactions(result)
        if tool_name == "get_settlement_suggestions":
            return self._respond_settlements(result)
        return _GUIDANCE

    def _respond_balance(self, result: dict) -> str:
        groups = result.get("groups") or []
        if not groups:
            return _NO_DATA
        parts = []
        for group in groups:
            net = group.get("your_net_balance") or 0
            if abs(net) < 0.005:
                parts.append(f"You are settled up in {group['name']}.")
                continue
            if net < 0:
                parts.append(f"You owe ₹{abs(net):,.2f} in {group['name']}.")
            else:
                parts.append(f"You are owed ₹{net:,.2f} in {group['name']}.")
        return " ".join(parts)

    def _respond_spending(self, result: dict) -> str:
        total = result.get("total") or 0
        count = result.get("count") or 0
        if count == 0:
            return _NO_DATA
        label = result.get("label") or "all time"
        return (
            f"Your spending for {label} is ₹{total:,.2f} "
            f"across {count} expense{'s' if count != 1 else ''}."
        )

    def _respond_categories(self, result: dict) -> str:
        categories = result.get("categories") or []
        if not categories:
            return _NO_DATA
        top = categories[0]
        return (
            f"Your top spending category is {top['category']} "
            f"(₹{top['amount']:,.2f}, {top['share']:.0f}% of spending). "
            + "Breakdown: "
            + ", ".join(
                f"{item['category']} ₹{item['amount']:,.2f}"
                for item in categories
            )
            + "."
        )

    def _respond_monthly(self, result: dict) -> str:
        months = result.get("months") or []
        if not months:
            return _NO_DATA
        last = months[-1]
        return (
            f"Your highest-spending months so far: "
            + ", ".join(f"{item['label']} ₹{item['amount']:,.2f}" for item in months)
            + f". Most recent month with data: {last['label']} "
            f"({last['count']} expense{'s' if last['count'] != 1 else ''})."
        )

    def _respond_expenses(self, result: dict) -> str:
        expenses = result.get("expenses") or []
        if not expenses:
            return _NO_DATA
        if len(expenses) == 1 and result.get("count") == 1:
            item = expenses[0]
            return (
                f"Your {item['category'].lower()} expense '{item['title']}' "
                f"is ₹{item['amount']:,.2f} ({item['date']}, group {item['group']})."
            )
        return (
            "Your expenses: "
            + "; ".join(
                f"{item['title']} ₹{item['amount']:,.2f} ({item['category']}, {item['date']})"
                for item in expenses
            )
            + "."
        )

    def _respond_transactions(self, result: dict) -> str:
        transactions = result.get("transactions") or []
        if not transactions:
            return _NO_DATA
        return (
            "Recent activity: "
            + "; ".join(
                f"{item['type']} '{item['title']}' ₹{item['amount']:,.2f} in {item['group']}"
                for item in transactions
            )
            + "."
        )

    def _respond_settlements(self, result: dict) -> str:
        groups = result.get("groups") or []
        if not groups:
            return _NO_DATA
        parts = []
        for group in groups:
            if group.get("settled_up"):
                parts.append(f"Great news — everything is already settled in {group['name']}.")
                continue
            suggestions = group.get("suggestions") or []
            steps = "; ".join(
                f"{item['payer']} pays {item['receiver']} ₹{item['amount']:,.2f}"
                for item in suggestions
            )
            parts.append(
                f"In {group['name']}, you can clear all balances in "
                f"{group['payment_count']} payment"
                f"{'s' if group['payment_count'] != 1 else ''} "
                f"totalling ₹{group['total_amount']:,.2f}: {steps}."
            )
        return " ".join(parts)


def _num(value: Decimal | None) -> float:
    return float(value) if value is not None else 0.0
