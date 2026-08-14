from fastapi import APIRouter

from app.routes import db, expenses, groups, health, settlements, transactions, users

api_router = APIRouter()

api_router.include_router(health.router, prefix="/health", tags=["health"])
api_router.include_router(db.router, prefix="/db", tags=["database"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(groups.router, prefix="/groups", tags=["groups"])
api_router.include_router(expenses.router, tags=["expenses"])
api_router.include_router(settlements.router, tags=["settlements"])
api_router.include_router(transactions.router, tags=["transactions"])
