from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.ai.assistant import ExpenseAgent
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.schemas.chat import ChatIn, ChatOut
from app.services.chatbot_service import ChatbotService

router = APIRouter()


@router.post("/chat", response_model=ChatOut)
def chat(
    data: ChatIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return ChatOut(answer=ChatbotService(db).answer(data.message, current_user, group_id=data.group_id))


@router.post("/agent", response_model=ChatOut)
def agent_chat(
    data: ChatIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return ChatOut(answer=ExpenseAgent(db).answer(data.message, current_user, group_id=data.group_id))
