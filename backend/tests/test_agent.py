from datetime import datetime

import pytest
from fastapi import HTTPException

from app.ai.assistant import ExpenseAgent
from app.services.balance_service import BalanceService
from tests.helpers import add_member, make_expense, make_group, make_user


def _setup(db):
    alice = make_user(db, "Alice")
    bob = make_user(db, "Bob")
    group = make_group(db, alice, "Trip")
    add_member(db, group, bob)
    make_expense(
        db, group, alice, "Dinner", 200, "Food", [alice, bob],
        paid_at=datetime(2026, 1, 15),
    )
    return alice, bob, group


def _agent(db):
    return ExpenseAgent(db)


def test_tools_are_registered(db_session):
    agent = _agent(db_session)
    tools = agent.list_tools()
    assert len(tools) == 6
    names = {tool["name"] for tool in tools}
    assert {
        "get_expenses",
        "get_group_balance",
        "get_transactions",
        "calculate_spending",
        "get_category_summary",
        "get_monthly_summary",
    } <= names


def test_calculate_spending_total(db_session):
    alice, bob, group = _setup(db_session)
    result = _agent(db_session).run_tool("calculate_spending", alice, period="total")
    assert result["total"] == 100.0
    assert result["count"] == 1


def test_calculate_spending_current_month(db_session):
    alice, bob, group = _setup(db_session)
    # Add an expense in the current month too.
    make_expense(
        db_session, group, alice, "Lunch", 100, "Food", [alice, bob],
        paid_at=datetime.now(),
    )
    result = _agent(db_session).run_tool("calculate_spending", alice, period="month")
    assert result["count"] == 1
    assert result["total"] == 50.0


def test_get_category_summary(db_session):
    alice, bob, group = _setup(db_session)
    make_expense(db_session, group, alice, "Cab", 100, "Transport", [alice, bob])
    result = _agent(db_session).run_tool("get_category_summary", alice)
    categories = {item["category"]: item for item in result["categories"]}
    assert categories["Food"]["amount"] == 100.0
    assert categories["Transport"]["amount"] == 50.0
    assert categories["Food"]["share"] > categories["Transport"]["share"]


def test_get_expenses(db_session):
    alice, bob, group = _setup(db_session)
    result = _agent(db_session).run_tool("get_expenses", alice, limit=5)
    assert result["count"] == 1
    assert result["expenses"][0]["title"] == "Dinner"
    assert result["expenses"][0]["amount"] == 100.0


def test_get_monthly_summary(db_session):
    alice, bob, group = _setup(db_session)
    result = _agent(db_session).run_tool("get_monthly_summary", alice)
    assert len(result["months"]) == 1
    assert result["months"][0]["month"] == "2026-01"
    assert result["months"][0]["amount"] == 100.0


def test_get_group_balance(db_session):
    alice, bob, group = _setup(db_session)
    # Alice paid for everything, Bob owes her.
    result = _agent(db_session).run_tool("get_group_balance", alice, group_id=group.id)
    assert result["groups"][0]["name"] == "Trip"
    assert result["groups"][0]["your_net_balance"] == 100.0
    assert any(
        t["from"] == "Bob" and t["to"] == "Alice" and t["amount"] == 100.0
        for t in result["groups"][0]["transfers"]
    )


def test_group_balance_rejects_non_member(db_session):
    alice, bob, group = _setup(db_session)
    carol = make_user(db_session, "Carol")
    agent = _agent(db_session)
    with pytest.raises(HTTPException) as exc:
        agent.run_tool("get_group_balance", carol, group_id=group.id)
    assert exc.value.status_code == 403


def test_agent_isolation_from_other_users_data(db_session):
    alice, bob, group = _setup(db_session)
    carol = make_user(db_session, "Carol")

    # Carol is not in the group, so she must see no expenses at all.
    result = _agent(db_session).run_tool("get_expenses", carol)
    assert result["expenses"] == []
    assert result["count"] == 0

    # Balance tool scoped to no groups → no data.
    result = _agent(db_session).run_tool("get_group_balance", carol)
    assert result["groups"] == []


def test_agent_no_data_message(db_session):
    carol = make_user(db_session, "Carol")
    answer = _agent(db_session).answer("How much did I spend this month?", carol)
    assert "don't have enough expense data" in answer


def test_agent_answers_questions(db_session):
    alice, bob, group = _setup(db_session)
    agent = _agent(db_session)

    assert "₹100.00" in agent.answer("How much did I spend in total?", alice)
    assert "Food" in agent.answer("What category do I spend the most on?", alice)
    assert "Trip" in agent.answer("How much do I owe in my trip group?", alice)
    assert "Dinner" in agent.answer("Show my recent expenses.", alice)


def test_agent_guidance_for_unrelated_question(db_session):
    alice, bob, group = _setup(db_session)
    answer = _agent(db_session).answer("What is the meaning of life?", alice)
    assert "Try asking about" in answer


def test_unknown_tool_raises(db_session):
    alice, bob, group = _setup(db_session)
    with pytest.raises(HTTPException) as exc:
        _agent(db_session).run_tool("not_a_tool", alice)
    assert exc.value.status_code == 404
