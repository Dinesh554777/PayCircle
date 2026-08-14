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

    def create_user(self, data: UserCreate) -> User:
        if self.get_by_email(data.email) is not None:
            raise HTTPException(
                status_code=409, detail="A user with this email already exists"
            )
        return self.create(
            name=data.name,
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
        if data.name is not None:
            user.name = data.name
        if data.password is not None:
            user.password_hash = hash_password(data.password)
        self.db.commit()
        self.db.refresh(user)
        return user
