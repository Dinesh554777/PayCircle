from fastapi import APIRouter

from app.routes import (
    auth,
    balances,
    dashboard,
    db,
    expenses,
    groups,
    health,
    insights,
    settlements,
    transactions,
    users,
)

api_router = APIRouter()

api_router.include_router(health.router, prefix="/health", tags=["health"])
api_router.include_router(db.router, prefix="/db", tags=["database"])
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(groups.router, prefix="/groups", tags=["groups"])
api_router.include_router(expenses.router, tags=["expenses"])
api_router.include_router(settlements.router, tags=["settlements"])
api_router.include_router(transactions.router, tags=["transactions"])
api_router.include_router(balances.router, tags=["balances"])
api_router.include_router(dashboard.router, prefix="/dashboard", tags=["dashboard"])
api_router.include_router(insights.router, prefix="/ai", tags=["ai"])
