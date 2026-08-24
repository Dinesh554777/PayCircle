from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.config import get_settings
from app.core.security import create_access_token, verify_password
from app.schemas.user import TokenResponse, UserCreate, UserLogin, GoogleAuthRequest
from app.services.user_service import UserService
from app.services.google_auth_service import GoogleAuthService

router = APIRouter()
settings = get_settings()

@router.get("/google/config")
def get_google_config():
    return {"client_id": settings.GOOGLE_CLIENT_ID}

@router.get("/google/url")
def get_google_auth_url():
    redirect_uri = settings.GOOGLE_REDIRECT_URI
    client_id = settings.GOOGLE_CLIENT_ID
    if not client_id:
        raise HTTPException(status_code=500, detail="Google OAuth not configured")
        
    url = (
        f"https://accounts.google.com/o/oauth2/v2/auth?"
        f"client_id={client_id}&"
        f"redirect_uri={redirect_uri}&"
        f"response_type=code&"
        f"scope=openid%20email%20profile&"
        f"access_type=offline&"
        f"prompt=consent"
    )
    return {"url": url}

@router.post("/google", response_model=TokenResponse)
async def google_auth(data: GoogleAuthRequest, db: Session = Depends(get_db)):
    if data.credential:
        google_info = await GoogleAuthService.verify_google_token(data.credential)
    elif data.code:
        google_info = await GoogleAuthService.exchange_code_for_token(data.code, data.redirect_uri)
    else:
        raise HTTPException(status_code=400, detail="Missing credential or code")

    user = UserService(db).authenticate_or_create_google_user(google_info)
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account has been disabled",
        )
        
    return {
        "access_token": create_access_token(user.id),
        "token_type": "bearer",
        "user": user,
    }


@router.post(
    "/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED
)
def register(data: UserCreate, db: Session = Depends(get_db)):
    user = UserService(db).create_user(data)
    return {
        "access_token": create_access_token(user.id),
        "token_type": "bearer",
        "user": user,
    }


@router.post("/login", response_model=TokenResponse)
def login(data: UserLogin, db: Session = Depends(get_db)):
    user = UserService(db).get_by_email(data.email)
    if user is None or not verify_password(data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account has been disabled",
        )
    return {
        "access_token": create_access_token(user.id),
        "token_type": "bearer",
        "user": user,
    }
