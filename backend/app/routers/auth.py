import logging
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session
from passlib.context import CryptContext
from app.config import settings
from app.database import get_db
from app.models.owner import Owner
from app.models.client import Client
from app.models.login_log import LoginLog
from app.schemas.auth import (
    OwnerLoginRequest, ClientLoginRequest, TokenResponse, RefreshRequest, MeResponse,
    ClientRegisterRequest,
)
from app.auth.jwt import create_access_token, create_refresh_token, decode_token, get_current_client

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/auth", tags=["auth"])
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

MAX_FAILED_ATTEMPTS = 5


def get_device_info(request: Request) -> tuple[str, str]:
    user_agent_str = request.headers.get("user-agent", "Unknown")
    try:
        from user_agents import parse
        ua = parse(user_agent_str)
        device_type = "mobile" if ua.is_mobile else ("tablet" if ua.is_tablet else "desktop")
        browser = ua.browser.family or "Unknown"
    except Exception:
        device_type = "unknown"
        browser = "unknown"
    return device_type, browser


def log_attempt(
    db: Session,
    status: str,
    ip: str,
    device_type: str,
    browser: str,
    client_id: int | None = None,
    is_owner: bool = False,
):
    log = LoginLog(
        client_id=client_id,
        is_owner=is_owner,
        ip_address=ip,
        device_type=device_type,
        browser=browser,
        status=status,
    )
    db.add(log)
    db.commit()


@router.post("/register", response_model=TokenResponse, status_code=201)
async def register_client(body: ClientRegisterRequest, db: Session = Depends(get_db)):
    existing = db.query(Client).filter(Client.email == body.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    client = Client(
        name=body.name,
        email=body.email,
        password_hash=pwd_context.hash(body.password),
        status="active",
    )
    db.add(client)
    db.commit()
    db.refresh(client)
    logger.info(f"New client registered: {client.email}")
    access_token = create_access_token({"sub": str(client.id), "email": client.email}, role="client")
    refresh_token = create_refresh_token({"sub": str(client.id), "email": client.email})
    return TokenResponse(access_token=access_token, refresh_token=refresh_token, role="client")


@router.post("/owner-login", response_model=TokenResponse)
async def owner_login(body: OwnerLoginRequest, request: Request, db: Session = Depends(get_db)):
    ip = request.client.host if request.client else "unknown"
    device_type, browser = get_device_info(request)

    owner = db.query(Owner).filter(Owner.email == body.email).first()
    if not owner or not pwd_context.verify(body.password, owner.password_hash):
        log_attempt(db, "failed", ip, device_type, browser, is_owner=True)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    log_attempt(db, "success", ip, device_type, browser, is_owner=True)
    access_token = create_access_token({"sub": str(owner.id), "email": owner.email}, role="owner")
    refresh_token = create_refresh_token({"sub": str(owner.id), "email": owner.email})
    return TokenResponse(access_token=access_token, refresh_token=refresh_token, role="owner")


@router.post("/client-login", response_model=TokenResponse)
async def client_login(body: ClientLoginRequest, request: Request, db: Session = Depends(get_db)):
    ip = request.client.host if request.client else "unknown"
    device_type, browser = get_device_info(request)

    client = db.query(Client).filter(Client.email == body.email).first()
    if not client:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    if client.account_locked:
        log_attempt(db, "locked", ip, device_type, browser, client_id=client.id)
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is locked due to too many failed attempts. Contact your administrator.",
        )

    if client.status == "suspended":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account is suspended")

    if not pwd_context.verify(body.password, client.password_hash):
        client.failed_attempts += 1
        if client.failed_attempts >= MAX_FAILED_ATTEMPTS:
            client.account_locked = True
            log_attempt(db, "locked", ip, device_type, browser, client_id=client.id)
            db.commit()
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Account locked after too many failed attempts.",
            )
        db.commit()
        log_attempt(db, "failed", ip, device_type, browser, client_id=client.id)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    # Success
    import datetime
    client.failed_attempts = 0
    client.last_login = datetime.datetime.utcnow()
    client.login_count += 1
    db.commit()
    log_attempt(db, "success", ip, device_type, browser, client_id=client.id)

    access_token = create_access_token(
        {"sub": str(client.id), "email": client.email}, role="client"
    )
    refresh_token = create_refresh_token({"sub": str(client.id), "email": client.email})
    return TokenResponse(access_token=access_token, refresh_token=refresh_token, role="client")


@router.post("/refresh")
async def refresh_token(body: RefreshRequest, db: Session = Depends(get_db)):
    payload = decode_token(body.refresh_token)
    if payload.get("type") != "refresh":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")
    role = payload.get("role", "client")
    access_token = create_access_token(
        {"sub": payload["sub"], "email": payload.get("email", "")}, role=role
    )
    return {"access_token": access_token, "token_type": "bearer"}


@router.post("/logout")
async def logout():
    return {"message": "Logged out successfully"}


@router.get("/me", response_model=MeResponse)
async def me(client=Depends(get_current_client)):
    return MeResponse(
        id=client.id,
        email=client.email,
        name=client.name,
        role="client",
    )
