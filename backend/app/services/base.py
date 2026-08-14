from typing import Generic, TypeVar

from fastapi import HTTPException
from sqlalchemy.orm import Session

ModelType = TypeVar("ModelType")


class BaseService(Generic[ModelType]):
    def __init__(self, db: Session, model: type[ModelType]) -> None:
        self.db = db
        self.model = model

    def create(self, **kwargs) -> ModelType:
        obj = self.model(**kwargs)
        self.db.add(obj)
        self.db.commit()
        self.db.refresh(obj)
        return obj

    def get_by_id(self, obj_id: int) -> ModelType:
        obj = self.db.get(self.model, obj_id)
        if obj is None:
            raise HTTPException(
                status_code=404, detail=f"{self.model.__name__} not found"
            )
        return obj

    def list_all(self) -> list[ModelType]:
        return self.db.query(self.model).all()
