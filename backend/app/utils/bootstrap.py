from app.core.config import get_settings
from app.core.database import SessionLocal
from app.models.user import User


def promote_admin_emails() -> None:
    """Promote users whose email is listed in ADMIN_EMAILS to admin on startup."""
    settings = get_settings()
    emails = [
        email.strip().lower()
        for email in settings.ADMIN_EMAILS.split(",")
        if email.strip()
    ]
    if not emails:
        return
    db = SessionLocal()
    try:
        users = db.query(User).filter(User.email.in_(emails)).all()
        for user in users:
            if not user.is_admin:
                user.is_admin = True
        if users:
            db.commit()
    finally:
        db.close()
