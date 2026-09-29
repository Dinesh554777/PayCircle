from contextlib import asynccontextmanager

import uuid
import sentry_sdk
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware

from app.core.config import get_settings
from app.routes.api import api_router
from app.utils.bootstrap import promote_admin_emails
from app.utils.errors import install_exception_handlers
from app.utils.logger import request_id_ctx_var, logger

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    promote_admin_emails()
    yield


if settings.SENTRY_DSN:
    sentry_sdk.init(
        dsn=settings.SENTRY_DSN,
        environment=settings.ENVIRONMENT,
        # Set traces_sample_rate to 1.0 to capture 100%
        # of transactions for performance monitoring.
        traces_sample_rate=0.1,
    )

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="AI-Powered Shared Expense Management System",
    lifespan=lifespan,
)

class RequestIDMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        req_id = request.headers.get("X-Request-ID") or str(uuid.uuid4())
        request_id_ctx_var.set(req_id)
        
        # Add minimal request log
        logger.info(f"Incoming Request: {request.method} {request.url.path}")
        
        response = await call_next(request)
        response.headers["X-Request-ID"] = req_id
        return response

app.add_middleware(RequestIDMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

install_exception_handlers(app)

app.include_router(api_router, prefix="/api")
