import logging
from urllib.parse import urlencode
from sqlalchemy.orm import Session
from app.models.social_account import SocialAccount, PlatformEnum
from app.exceptions import NotFoundError
from app.config import settings
import httpx

logger = logging.getLogger(__name__)


def get_user_accounts(db: Session, user_id: int) -> list[SocialAccount]:
    """List all connected social accounts for a user"""
    return db.query(SocialAccount).filter(
        SocialAccount.user_id == user_id,
        SocialAccount.is_active == True
    ).all()


def disconnect_account(db: Session, account_id: int, user_id: int) -> None:
    """Soft-disconnect a social account"""
    account = db.query(SocialAccount).filter(
        SocialAccount.id == account_id,
        SocialAccount.user_id == user_id
    ).first()
    if not account:
        raise NotFoundError("SocialAccount")
    account.is_active = False
    db.commit()


def get_facebook_oauth_url(state: str) -> str:
    """Generate Facebook OAuth authorization URL"""
    params = {
        "client_id": settings.FACEBOOK_APP_ID,
        "redirect_uri": f"{settings.BACKEND_URL}/api/v1/social-accounts/callback/facebook",
        "scope": "pages_show_list,pages_read_engagement,pages_manage_posts,instagram_basic,instagram_content_publish",
        "state": state,
        "response_type": "code",
    }
    return f"https://www.facebook.com/v18.0/dialog/oauth?{urlencode(params)}"


def get_instagram_oauth_url(state: str) -> str:
    """Instagram uses Facebook OAuth with additional scopes"""
    return get_facebook_oauth_url(state)  # Instagram uses Facebook Graph API


def get_linkedin_oauth_url(state: str) -> str:
    """Generate LinkedIn OAuth authorization URL"""
    params = {
        "response_type": "code",
        "client_id": settings.LINKEDIN_CLIENT_ID,
        "redirect_uri": f"{settings.BACKEND_URL}/api/v1/social-accounts/callback/linkedin",
        "scope": "r_liteprofile r_emailaddress w_member_social",
        "state": state,
    }
    return f"https://www.linkedin.com/oauth/v2/authorization?{urlencode(params)}"


async def exchange_facebook_code(code: str) -> dict:
    """Exchange Facebook auth code for access token"""
    async with httpx.AsyncClient() as client:
        response = await client.get(
            "https://graph.facebook.com/v18.0/oauth/access_token",
            params={
                "client_id": settings.FACEBOOK_APP_ID,
                "client_secret": settings.FACEBOOK_APP_SECRET,
                "redirect_uri": f"{settings.BACKEND_URL}/api/v1/social-accounts/callback/facebook",
                "code": code,
            }
        )
        return response.json()


async def get_facebook_user_info(access_token: str) -> dict:
    """Get Facebook user/page info"""
    async with httpx.AsyncClient() as client:
        response = await client.get(
            "https://graph.facebook.com/me",
            params={"access_token": access_token, "fields": "id,name"}
        )
        return response.json()


async def exchange_linkedin_code(code: str) -> dict:
    """Exchange LinkedIn auth code for access token"""
    async with httpx.AsyncClient() as client:
        response = await client.post(
            "https://www.linkedin.com/oauth/v2/accessToken",
            data={
                "grant_type": "authorization_code",
                "code": code,
                "redirect_uri": f"{settings.BACKEND_URL}/api/v1/social-accounts/callback/linkedin",
                "client_id": settings.LINKEDIN_CLIENT_ID,
                "client_secret": settings.LINKEDIN_CLIENT_SECRET,
            }
        )
        return response.json()


async def get_linkedin_user_info(access_token: str) -> dict:
    """Get LinkedIn user profile"""
    async with httpx.AsyncClient() as client:
        response = await client.get(
            "https://api.linkedin.com/v2/me",
            headers={"Authorization": f"Bearer {access_token}"},
            params={"projection": "(id,localizedFirstName,localizedLastName)"}
        )
        return response.json()


def save_social_account(
    db: Session,
    user_id: int,
    platform: PlatformEnum,
    account_name: str,
    account_id: str,
    access_token: str,
) -> SocialAccount:
    """Save or update a connected social account"""
    existing = db.query(SocialAccount).filter(
        SocialAccount.user_id == user_id,
        SocialAccount.platform == platform,
        SocialAccount.account_id == account_id,
    ).first()

    if existing:
        existing.access_token = access_token
        existing.account_name = account_name
        existing.is_active = True
        db.commit()
        db.refresh(existing)
        return existing

    account = SocialAccount(
        user_id=user_id,
        platform=platform,
        account_name=account_name,
        account_id=account_id,
        access_token=access_token,
        is_active=True,
    )
    db.add(account)
    db.commit()
    db.refresh(account)
    return account
