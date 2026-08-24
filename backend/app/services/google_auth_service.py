import httpx
from fastapi import HTTPException
from app.core.config import get_settings

settings = get_settings()

class GoogleAuthService:
    @staticmethod
    async def verify_google_token(credential: str) -> dict:
        """Verify the Google ID token (credential) and return user info."""
        if not credential:
            raise HTTPException(status_code=400, detail="Missing credential")
            
        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(
                    f"https://oauth2.googleapis.com/tokeninfo?id_token={credential}"
                )
                if response.status_code != 200:
                    raise HTTPException(status_code=401, detail="Invalid Google token")
                return response.json()
            except httpx.RequestError as e:
                raise HTTPException(status_code=500, detail="Failed to verify Google token")

    @staticmethod
    async def exchange_code_for_token(code: str, redirect_uri: str) -> dict:
        """Exchange an authorization code for an access token and user info."""
        if not code:
            raise HTTPException(status_code=400, detail="Missing authorization code")
            
        if not settings.GOOGLE_CLIENT_ID or not settings.GOOGLE_CLIENT_SECRET:
            raise HTTPException(status_code=500, detail="Google OAuth not configured")
            
        async with httpx.AsyncClient() as client:
            try:
                # 1. Exchange code for token
                token_response = await client.post(
                    "https://oauth2.googleapis.com/token",
                    data={
                        "client_id": settings.GOOGLE_CLIENT_ID,
                        "client_secret": settings.GOOGLE_CLIENT_SECRET,
                        "code": code,
                        "grant_type": "authorization_code",
                        "redirect_uri": redirect_uri or settings.GOOGLE_REDIRECT_URI,
                    }
                )
                if token_response.status_code != 200:
                    raise HTTPException(status_code=401, detail="Failed to exchange code")
                
                token_data = token_response.json()
                access_token = token_data.get("access_token")
                id_token = token_data.get("id_token")
                
                if id_token:
                    # Best practice: if id_token is present, verify it
                    return await GoogleAuthService.verify_google_token(id_token)
                
                # 2. If no id_token but we have access_token, fetch user info
                userinfo_response = await client.get(
                    "https://www.googleapis.com/oauth2/v3/userinfo",
                    headers={"Authorization": f"Bearer {access_token}"}
                )
                if userinfo_response.status_code != 200:
                    raise HTTPException(status_code=401, detail="Failed to fetch user info")
                    
                return userinfo_response.json()
            except httpx.RequestError:
                raise HTTPException(status_code=500, detail="Failed to communicate with Google")
