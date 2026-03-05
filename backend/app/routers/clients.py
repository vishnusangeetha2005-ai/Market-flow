import logging
import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session
from passlib.context import CryptContext
from app.database import get_db
from app.auth.jwt import get_current_owner
from app.models.client import Client
from app.models.subscription import Subscription
from app.models.plan import Plan
from app.models.login_log import LoginLog
from app.models.client_social_token import ClientSocialToken
from app.schemas.client import (
    ClientCreate, ClientUpdate, ClientResetPassword, ClientResponse, ClientListResponse
)

_PLATFORMS = {"facebook", "instagram", "linkedin", "google"}

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/clients", tags=["clients"])
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


@router.get("", response_model=list[ClientListResponse])
async def list_clients(
    search: str = Query(None),
    status_filter: str = Query(None, alias="status"),
    plan_id: int = Query(None),
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_owner),
):
    query = db.query(Client)
    if search:
        query = query.filter(
            (Client.name.ilike(f"%{search}%")) | (Client.email.ilike(f"%{search}%"))
        )
    if status_filter:
        query = query.filter(Client.status == status_filter)
    clients = query.all()

    result = []
    for c in clients:
        plan_name = None
        if c.subscription:
            plan = db.query(Plan).filter(Plan.id == c.subscription.plan_id).first()
            if plan:
                plan_name = plan.name
        if plan_id and c.subscription and c.subscription.plan_id != plan_id:
            continue
        result.append(ClientListResponse(
            id=c.id,
            name=c.name,
            email=c.email,
            status=c.status,
            account_locked=c.account_locked,
            last_login=c.last_login,
            created_at=c.created_at,
            plan_name=plan_name,
        ))
    return result


@router.post("", response_model=ClientResponse, status_code=status.HTTP_201_CREATED)
async def create_client(
    body: ClientCreate,
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_owner),
):
    existing = db.query(Client).filter(Client.email == body.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already in use")
    plan = db.query(Plan).filter(Plan.id == body.plan_id).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")

    import datetime
    client = Client(
        name=body.name,
        email=body.email,
        password_hash=pwd_context.hash(body.password),
    )
    db.add(client)
    db.flush()

    sub = Subscription(
        client_id=client.id,
        plan_id=body.plan_id,
        start_date=datetime.date.today(),
        end_date=datetime.date.today().replace(month=datetime.date.today().month % 12 + 1)
        if datetime.date.today().month < 12
        else datetime.date(datetime.date.today().year + 1, 1, datetime.date.today().day),
    )
    db.add(sub)
    db.commit()
    db.refresh(client)
    return client


@router.get("/{client_id}", response_model=ClientResponse)
async def get_client(
    client_id: int,
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_owner),
):
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    return client


@router.put("/{client_id}", response_model=ClientResponse)
async def update_client(
    client_id: int,
    body: ClientUpdate,
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_owner),
):
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    if body.name:
        client.name = body.name
    if body.email:
        client.email = body.email
    db.commit()
    db.refresh(client)
    return client


@router.delete("/{client_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_client(
    client_id: int,
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_owner),
):
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    db.delete(client)
    db.commit()


@router.post("/{client_id}/suspend")
async def suspend_client(
    client_id: int,
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_owner),
):
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    client.status = "suspended"
    db.commit()
    return {"message": "Client suspended"}


@router.post("/{client_id}/activate")
async def activate_client(
    client_id: int,
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_owner),
):
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    client.status = "active"
    db.commit()
    return {"message": "Client activated"}


@router.post("/{client_id}/unlock")
async def unlock_client(
    client_id: int,
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_owner),
):
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    client.failed_attempts = 0
    client.account_locked = False
    db.commit()
    return {"message": "Client account unlocked"}


@router.post("/{client_id}/reset-password")
async def reset_password(
    client_id: int,
    body: ClientResetPassword,
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_owner),
):
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    client.password_hash = pwd_context.hash(body.new_password)
    db.commit()
    return {"message": "Password reset successfully"}


@router.get("/{client_id}/activity")
async def get_client_activity(
    client_id: int,
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_owner),
):
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    logs = (
        db.query(LoginLog)
        .filter(LoginLog.client_id == client_id)
        .order_by(LoginLog.login_time.desc())
        .limit(50)
        .all()
    )
    tokens_used = sum(gc.tokens_used for gc in client.generated_content)
    return {
        "login_logs": [
            {
                "id": log.id,
                "login_time": log.login_time,
                "ip_address": log.ip_address,
                "device_type": log.device_type,
                "browser": log.browser,
                "status": log.status,
            }
            for log in logs
        ],
        "total_tokens_used": tokens_used,
        "total_banners": len(client.banners),
        "total_posts": len(client.posts),
        "login_count": client.login_count,
    }


# ── Owner-managed social tokens per client ────────────────────────────────────

class OwnerSocialTokenSave(BaseModel):
    platform: str
    account_name: str
    access_token: str
    page_id: Optional[str] = None


class OwnerSocialTokenResponse(BaseModel):
    id: int
    platform: str
    account_name: str
    access_token_preview: str
    page_id: Optional[str]
    is_active: bool
    updated_at: datetime.datetime

    class Config:
        from_attributes = True


def _token_to_response(t: ClientSocialToken) -> OwnerSocialTokenResponse:
    preview = ("*" * 6 + t.access_token[-6:]) if len(t.access_token) > 6 else "****"
    return OwnerSocialTokenResponse(
        id=t.id,
        platform=t.platform,
        account_name=t.account_name,
        access_token_preview=preview,
        page_id=t.page_id,
        is_active=t.is_active,
        updated_at=t.updated_at,
    )


@router.get("/{client_id}/social-tokens", response_model=list[OwnerSocialTokenResponse])
async def owner_list_social_tokens(
    client_id: int,
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_owner),
):
    """Owner: list all social tokens connected for a client."""
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    tokens = (
        db.query(ClientSocialToken)
        .filter(ClientSocialToken.client_id == client_id)
        .all()
    )
    return [_token_to_response(t) for t in tokens]


@router.post("/{client_id}/social-tokens", response_model=OwnerSocialTokenResponse)
async def owner_save_social_token(
    client_id: int,
    body: OwnerSocialTokenSave,
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_owner),
):
    """Owner: connect or update a social account for a client."""
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    if body.platform not in _PLATFORMS:
        raise HTTPException(
            status_code=400,
            detail=f"Platform must be one of: {', '.join(sorted(_PLATFORMS))}"
        )

    # Upsert — one token per platform per client
    token = (
        db.query(ClientSocialToken)
        .filter(
            ClientSocialToken.client_id == client_id,
            ClientSocialToken.platform == body.platform,
        )
        .first()
    )
    now = datetime.datetime.utcnow()
    if token:
        token.account_name = body.account_name
        token.access_token = body.access_token
        token.page_id = body.page_id
        token.is_active = True
        token.updated_at = now
    else:
        token = ClientSocialToken(
            client_id=client_id,
            platform=body.platform,
            account_name=body.account_name,
            access_token=body.access_token,
            page_id=body.page_id,
        )
        db.add(token)

    db.commit()
    db.refresh(token)
    logger.info("Owner saved %s token for client %s", body.platform, client_id)
    return _token_to_response(token)


@router.delete("/{client_id}/social-tokens/{platform}", status_code=status.HTTP_204_NO_CONTENT)
async def owner_delete_social_token(
    client_id: int,
    platform: str,
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_owner),
):
    """Owner: remove a social token for a client."""
    token = (
        db.query(ClientSocialToken)
        .filter(
            ClientSocialToken.client_id == client_id,
            ClientSocialToken.platform == platform,
        )
        .first()
    )
    if not token:
        raise HTTPException(status_code=404, detail="Token not found")
    db.delete(token)
    db.commit()
