from pydantic import BaseModel, Field


class ChatMessage(BaseModel):
    role: str
    content: str

class ChatIn(BaseModel):
    message: str = Field(min_length=1, max_length=2000)
    history: list[ChatMessage] | None = None
    group_id: int | None = Field(None, description="Optional group ID to scope the conversation")

class ChatOut(BaseModel):
    answer: str
    action: dict | None = None
