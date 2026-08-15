from fastapi import HTTPException
import pytest

from app.services.search_service import SearchService
from tests.helpers import add_member, make_expense, make_group, make_user


def _setup(db):
    alice = make_user(db, "Alice")
    bob = make_user(db, "Bob")
    group = make_group(db, alice, "Weekend Trip", "Goa trip with friends")
    add_member(db, group, bob)
    make_expense(db, group, alice, "Pizza Dinner", 200, "Food", [alice, bob])
    make_expense(db, group, bob, "Fuel", 100, "Transport", [alice, bob])
    return alice, bob, group


def test_search_expenses(db_session):
    alice, bob, group = _setup(db_session)
    results = SearchService(db_session).search("pizza", alice)
    assert len(results.expenses) == 1
    assert results.expenses[0].title == "Pizza Dinner"
    assert results.expenses[0].group_name == "Weekend Trip"


def test_search_groups(db_session):
    alice, bob, group = _setup(db_session)
    results = SearchService(db_session).search("trip", alice)
    assert any(g.name == "Weekend Trip" for g in results.groups)


def test_search_matches_description_and_category(db_session):
    alice, bob, group = _setup(db_session)
    by_description = SearchService(db_session).search("goa", alice)
    assert any(g.name == "Weekend Trip" for g in by_description.groups)

    by_category = SearchService(db_session).search("transport", alice)
    assert any(e.title == "Fuel" for e in by_category.expenses)


def test_search_no_results(db_session):
    alice, bob, group = _setup(db_session)
    results = SearchService(db_session).search("nonexistentxyz", alice)
    assert results.expenses == []
    assert results.groups == []
    assert results.transactions == []


def test_search_is_isolated_between_users(db_session):
    alice, bob, group = _setup(db_session)
    carol = make_user(db_session, "Carol")
    other = make_group(db_session, carol, "Carol Private")

    results = SearchService(db_session).search("Pizza", carol)
    assert results.expenses == []

    results = SearchService(db_session).search("Carol", alice)
    assert results.groups == []


def test_search_rejects_empty_or_long_query(db_session):
    alice, bob, group = _setup(db_session)
    service = SearchService(db_session)
    with pytest.raises(HTTPException):
        service.search("", alice)
    with pytest.raises(HTTPException):
        service.search("x" * 101, alice)
