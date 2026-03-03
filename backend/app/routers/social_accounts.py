import logging
import secrets
from typing import Any
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.models.social_account import PlatformEnum
from app.schemas.social_account import SocialAccountResponse
from app.services import social_account_service
from app.config import settings

router = APIRouter(prefix="/social-accounts", tags=["social-accounts"])
logger = logging.getLogger(__name__)


@router.get("/", response_model=list[SocialAccountResponse])
async def list_accounts(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return social_account_service.get_user_accounts(db, current_user.id)


@router.get("/connect/{platform}", response_model=dict[str, str])
async def connect_account(
    platform: PlatformEnum,
    current_user: User = Depends(get_current_user),
) -> dict[str, str]:
    state = secrets.token_urlsafe(32)
    if platform == PlatformEnum.facebook:
        url = social_account_service.get_facebook_oauth_url(state)
    elif platform == PlatformEnum.instagram:
        url = social_account_service.get_instagram_oauth_url(state)
    elif platform == PlatformEnum.linkedin:
        url = social_account_service.get_linkedin_oauth_url(state)
    else:
        raise HTTPException(status_code=400, detail="Unsupported platform")
    return {"oauth_url": url, "state": state}


@router.get("/callback/facebook")
async def facebook_callback(
    code: str,
    state: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> RedirectResponse:
    token_data = await social_account_service.exchange_facebook_code(code)
    if "error" in token_data:
        raise HTTPException(status_code=400, detail="Facebook OAuth failed")

    access_token = token_data.get("access_token")
    user_info = await social_account_service.get_facebook_user_info(access_token)

    social_account_service.save_social_account(
        db=db,
        user_id=current_user.id,
        platform=PlatformEnum.facebook,
        account_name=user_info.get("name", "Facebook Account"),
        account_id=user_info.get("id", ""),
        access_token=access_token,
    )
    return RedirectResponse(url=f"{settings.FRONTEND_URL}/accounts?connected=facebook")


@router.get("/callback/instagram")
async def instagram_callback(
    code: str,
    state: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> RedirectResponse:
    token_data = await social_account_service.exchange_facebook_code(code)
    if "error" in token_data:
        raise HTTPException(status_code=400, detail="Instagram OAuth failed")

    access_token = token_data.get("access_token")
    user_info = await social_account_service.get_facebook_user_info(access_token)

    social_account_service.save_social_account(
        db=db,
        user_id=current_user.id,
        platform=PlatformEnum.instagram,
        account_name=user_info.get("name", "Instagram Account"),
        account_id=user_info.get("id", ""),
        access_token=access_token,
    )
    return RedirectResponse(url=f"{settings.FRONTEND_URL}/accounts?connected=instagram")


@router.get("/callback/linkedin")
async def linkedin_callback(
    code: str,
    state: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> RedirectResponse:
    token_data = await social_account_service.exchange_linkedin_code(code)
    if "error" in token_data:
        raise HTTPException(status_code=400, detail="LinkedIn OAuth failed")

    access_token = token_data.get("access_token")
    user_info = await social_account_service.get_linkedin_user_info(access_token)

    name = f"{user_info.get('localizedFirstName', '')} {user_info.get('localizedLastName', '')}".strip()
    social_account_service.save_social_account(
        db=db,
        user_id=current_user.id,
        platform=PlatformEnum.linkedin,
        account_name=name or "LinkedIn Account",
        account_id=user_info.get("id", ""),
        access_token=access_token,
    )
    return RedirectResponse(url=f"{settings.FRONTEND_URL}/accounts?connected=linkedin")


@router.delete("/{account_id}", status_code=204)
async def disconnect_account(
    account_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    social_account_service.disconnect_account(db, account_id, current_user.id)
