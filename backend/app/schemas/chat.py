from pydantic import BaseModel, Field


class ChatIn(BaseModel):
    message: str = Field(min_length=1, max_length=2000)
    group_id: int | None = Field(None, description="Optional group ID to scope the conversation")


class ChatOut(BaseModel):
    answer: str
