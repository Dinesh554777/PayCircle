from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    """Application settings loaded from environment variables / .env file."""

    APP_NAME: str = "PayCircle API"
    APP_VERSION: str = "0.1.0"
    DEBUG: bool = False

    DATABASE_URL: str = "postgresql://paycircle:paycircle@localhost:5432/paycircle"
    DATABASE_URL_UNPOOLED: str = ""  # Direct (non-pooled) URL for migrations
    SECRET_KEY: str = "change-me-in-production"
    JWT_SECRET: str = ""
    FRONTEND_URL: str = ""  # Public frontend base URL used in email links; defaults to first CORS origin
    AI_API_KEY: str = ""
    AI_MODEL: str = "llama-3.3-70b-versatile"
    AI_VISION_MODEL: str = "qwen/qwen3.6-27b"

    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24

    CORS_ORIGINS: str = "http://localhost:5173"

    ADMIN_EMAILS: str = ""

    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""
    GOOGLE_REDIRECT_URI: str = "http://localhost:5173/auth/callback"
    RAZORPAY_KEY_ID: str = ""
    RAZORPAY_KEY_SECRET: str = ""
    GROQ_API_KEY: str = ""

    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASS: str = ""
    EMAIL_FROM: str = ""

    RESEND_API_KEY: str = ""
    RESEND_FROM: str = ""  # Verified sender, e.g. PayCircle <noreply@yourdomain.com>

    @property
    def effective_ai_api_key(self) -> str:
        return self.GROQ_API_KEY or self.AI_API_KEY

    @property
    def auth_secret(self) -> str:
        return self.JWT_SECRET or self.SECRET_KEY

    model_config = SettingsConfigDict(
        env_file=BASE_DIR / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @property
    def cors_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]

    @property
    def frontend_base_url(self) -> str:
        """Base URL used to build links embedded in emails (invitations, etc.)."""
        if self.FRONTEND_URL.strip():
            return self.FRONTEND_URL.strip()
        if self.cors_origins_list:
            return self.cors_origins_list[0]
        return "http://localhost:5173"


@lru_cache
def get_settings() -> Settings:
    return Settings()
