from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.ai.assistant import ExpenseAgent
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.schemas.chat import ChatIn, ChatOut, ChatActionRequest
from app.services.chatbot_service import ChatbotService
from app.services.expense_service import ExpenseService
from app.schemas.expense import ExpenseCreate
from fastapi import HTTPException

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
    history = [m.model_dump() for m in data.history] if data.history else []
    res = ExpenseAgent(db).answer(data.message, current_user, group_id=data.group_id, history=history)
    if isinstance(res, dict):
        return ChatOut(answer=res.get("message", ""), action=res.get("action"), type=res.get("type", "message"))
    return ChatOut(answer=res)

ALLOWED_ACTIONS = {"create_expense", "create_cash_settlement"}

@router.post("/agent/action", response_model=ChatOut)
def agent_action(
    req: ChatActionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    action_name = req.action.name
    if action_name not in ALLOWED_ACTIONS:
        raise HTTPException(status_code=400, detail="Action not allowed")
    
    if action_name == "create_expense":
        if not req.group_id:
            raise HTTPException(status_code=400, detail="group_id is required for create_expense")
        expense_data = ExpenseCreate(**req.action.payload)
        ExpenseService(db).create_expense(req.group_id, expense_data, current_user)
        return ChatOut(answer="The expense was added successfully.", type="action_success")
    elif action_name == "create_cash_settlement":
        return ChatOut(answer="Cash settlement request created successfully.", type="action_success")

