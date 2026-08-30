from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.core.security import hash_password
from app.models.user import User
from app.schemas.user import UserCreate, UserUpdate
from app.services.base import BaseService


class UserService(BaseService[User]):
    def __init__(self, db: Session) -> None:
        super().__init__(db, User)

    def get_by_email(self, email: str) -> User | None:
        return self.db.query(User).filter(User.email == email).first()

    def get_by_username(self, username: str) -> User | None:
        return (
            self.db.query(User).filter(User.username == username.strip().lower()).first()
        )

    def search_by_username(self, query: str, exclude_user_id: int, limit: int = 8) -> list[User]:
        """Return users whose username contains the query, excluding the given user."""
        q = query.strip().lower()
        if not q:
            return []
        return (
            self.db.query(User)
            .filter(User.username.ilike(f"%{q}%"), User.id != exclude_user_id)
            .order_by(User.username)
            .limit(limit)
            .all()
        )

    def create_user(self, data: UserCreate) -> User:
        if self.get_by_email(data.email) is not None:
            raise HTTPException(
                status_code=409, detail="A user with this email already exists"
            )
        if self.get_by_username(data.username) is not None:
            raise HTTPException(
                status_code=409, detail="That username is already taken"
            )
        return self.create(
            name=data.name,
            username=self._normalize_username(data.username),
            email=data.email,
            password_hash=hash_password(data.password),
        )

    def update_user(self, user: User, data: UserUpdate) -> User:
        if data.email is not None and data.email != user.email:
            if self.get_by_email(data.email) is not None:
                raise HTTPException(
                    status_code=409, detail="A user with this email already exists"
                )
            user.email = data.email
        if data.username is not None and data.username != user.username:
            if self.get_by_username(data.username) is not None:
                raise HTTPException(
                    status_code=409, detail="That username is already taken"
                )
            user.username = self._normalize_username(data.username)
        if data.name is not None:
            user.name = data.name
        if data.password is not None:
            user.password_hash = hash_password(data.password)
        self.db.commit()
        self.db.refresh(user)
        return user

    def get_by_google_id(self, google_id: str) -> User | None:
        return self.db.query(User).filter(User.google_id == google_id).first()

    def authenticate_or_create_google_user(self, google_info: dict) -> User:
        google_id = google_info.get("sub")
        email = google_info.get("email")
        name = google_info.get("name", "Google User")
        avatar_url = google_info.get("picture")

        if not google_id or not email:
            raise HTTPException(status_code=400, detail="Invalid Google profile info")

        # Check if user already linked
        user = self.get_by_google_id(google_id)
        if user:
            # Update name/avatar if they changed
            updated = False
            if user.name != name:
                user.name = name
                updated = True
            if user.avatar_url != avatar_url:
                user.avatar_url = avatar_url
                updated = True
            if updated:
                self.db.commit()
                self.db.refresh(user)
            return user

        # Check if user exists by email
        user = self.get_by_email(email)
        if user:
            user.google_id = google_id
            if not user.avatar_url:
                user.avatar_url = avatar_url
            self.db.commit()
            self.db.refresh(user)
            return user

        # Create new user
        from app.core.config import get_settings
        settings = get_settings()
        admin_emails = [e.strip().lower() for e in settings.ADMIN_EMAILS.split(",") if e.strip()]
        is_admin = email.lower() in admin_emails

        new_user = User(
            name=name,
            username=self._ensure_unique_username(email),
            email=email,
            google_id=google_id,
            avatar_url=avatar_url,
            is_active=True,
            is_admin=is_admin,
            password_hash=None,
        )
        self.db.add(new_user)
        self.db.commit()
        self.db.refresh(new_user)
        return new_user

    @staticmethod
    def _normalize_username(username: str) -> str:
        return username.strip().lower()

    def _derive_username(self, email: str) -> str:
        base = email.split("@")[0].lower()
        base = "".join(ch for ch in base if ch.isalnum() or ch in "._-")[:50] or "user"
        return base

    def _ensure_unique_username(self, email: str) -> str:
        base = self._derive_username(email)
        candidate = base
        suffix = 1
        while self.get_by_username(candidate) is not None:
            suffix += 1
            candidate = f"{base}{suffix}"[:50]
        return candidate
