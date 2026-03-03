import logging
from httpx import AsyncClient
from app.config import settings

logger = logging.getLogger(__name__)


async def get_google_tokens(code: str) -> dict:
    async with AsyncClient() as client:
        response = await client.post(
            "https://oauth2.googleapis.com/token",
            data={
                "client_id": settings.GOOGLE_CLIENT_ID,
                "client_secret": settings.GOOGLE_CLIENT_SECRET,
                "code": code,
                "grant_type": "authorization_code",
                "redirect_uri": f"{settings.FRONTEND_URL}/auth/callback",
            },
        )
        return response.json()


async def get_google_user(access_token: str) -> dict:
    async with AsyncClient() as client:
        response = await client.get(
            "https://www.googleapis.com/oauth2/v2/userinfo",
            headers={"Authorization": f"Bearer {access_token}"},
        )
        return response.json()
