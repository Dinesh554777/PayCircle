from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import get_settings
from app.routes.api import api_router
from app.utils.bootstrap import promote_admin_emails
from app.utils.errors import install_exception_handlers

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    promote_admin_emails()
    yield


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="AI-Powered Shared Expense Management System",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

install_exception_handlers(app)

app.include_router(api_router, prefix="/api")
