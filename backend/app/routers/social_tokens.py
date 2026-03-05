import logging
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
import datetime
from sqlalchemy.orm import Session
from app.database import get_db
from app.auth.jwt import get_current_client
from app.models.client import Client
from app.models.client_social_token import ClientSocialToken

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/social-tokens", tags=["social-tokens"])

PLATFORMS = {"facebook", "instagram", "linkedin", "google"}


class SocialTokenSave(BaseModel):
    platform: str
    account_name: str
    access_token: str
    page_id: Optional[str] = None


class SocialTokenResponse(BaseModel):
    id: int
    platform: str
    account_name: str
    access_token_preview: str   # show only last 6 chars for security
    page_id: Optional[str]
    is_active: bool
    updated_at: datetime.datetime

    class Config:
        from_attributes = True


def _to_response(t: ClientSocialToken) -> SocialTokenResponse:
    preview = ("*" * 6 + t.access_token[-6:]) if len(t.access_token) > 6 else "****"
    return SocialTokenResponse(
        id=t.id,
        platform=t.platform,
        account_name=t.account_name,
        access_token_preview=preview,
        page_id=t.page_id,
        is_active=t.is_active,
        updated_at=t.updated_at,
    )


@router.get("", response_model=list[SocialTokenResponse])
async def list_tokens(
    db: Session = Depends(get_db),
    client: Client = Depends(get_current_client),
):
    tokens = (
        db.query(ClientSocialToken)
        .filter(ClientSocialToken.client_id == client.id)
        .all()
    )
    return [_to_response(t) for t in tokens]


@router.post("", response_model=SocialTokenResponse)
async def save_token(
    body: SocialTokenSave,
    db: Session = Depends(get_db),
    client: Client = Depends(get_current_client),
):
    if body.platform not in PLATFORMS:
        raise HTTPException(status_code=400, detail=f"Platform must be one of: {', '.join(PLATFORMS)}")

    # Upsert — one token per platform per client
    token = (
        db.query(ClientSocialToken)
        .filter(ClientSocialToken.client_id == client.id, ClientSocialToken.platform == body.platform)
        .first()
    )
    if token:
        token.account_name = body.account_name
        token.access_token = body.access_token
        token.page_id = body.page_id
        token.is_active = True
        token.updated_at = datetime.datetime.utcnow()
    else:
        token = ClientSocialToken(
            client_id=client.id,
            platform=body.platform,
            account_name=body.account_name,
            access_token=body.access_token,
            page_id=body.page_id,
        )
        db.add(token)

    db.commit()
    db.refresh(token)
    return _to_response(token)


@router.delete("/{platform}", status_code=204)
async def delete_token(
    platform: str,
    db: Session = Depends(get_db),
    client: Client = Depends(get_current_client),
):
    token = (
        db.query(ClientSocialToken)
        .filter(ClientSocialToken.client_id == client.id, ClientSocialToken.platform == platform)
        .first()
    )
    if not token:
        raise HTTPException(status_code=404, detail="Token not found")
    db.delete(token)
    db.commit()
