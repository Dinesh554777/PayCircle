from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models.user import User
from app.schemas.user import UserCreate
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
        # TODO: hash the password properly in the authentication phase
        return self.create(name=data.name, email=data.email, password_hash=data.password)
