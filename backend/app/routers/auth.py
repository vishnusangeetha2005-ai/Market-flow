import logging
import secrets
import datetime
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
    ClientRegisterRequest, ForgotPasswordRequest, ResetPasswordRequest,
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


@router.post("/forgot-password")
async def forgot_password(body: ForgotPasswordRequest, db: Session = Depends(get_db)):
    client = db.query(Client).filter(Client.email == body.email).first()
    # Always return success to avoid email enumeration
    if not client:
        return {"message": "If your email is registered, a reset link has been generated."}

    token = secrets.token_urlsafe(32)
    client.reset_token = token
    client.reset_token_expires = datetime.datetime.utcnow() + datetime.timedelta(hours=1)
    db.commit()

    logger.info(f"Password reset requested for: {client.email} | token: {token}")
    return {
        "message": "Reset link generated successfully.",
        "reset_token": token,  # In production, send this via email instead
    }


@router.post("/reset-password")
async def reset_password(body: ResetPasswordRequest, db: Session = Depends(get_db)):
    client = db.query(Client).filter(Client.reset_token == body.token).first()
    if not client:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")

    if not client.reset_token_expires or datetime.datetime.utcnow() > client.reset_token_expires:
        raise HTTPException(status_code=400, detail="Reset token has expired")

    if len(body.new_password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")

    client.password_hash = pwd_context.hash(body.new_password)
    client.reset_token = None
    client.reset_token_expires = None
    client.failed_attempts = 0
    client.account_locked = False
    db.commit()

    logger.info(f"Password reset successful for: {client.email}")
    return {"message": "Password reset successfully. You can now login with your new password."}


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


@router.get("/facebook/connect")
async def facebook_connect(client: Client = Depends(get_current_client)):
    if not settings.FACEBOOK_APP_ID:
        raise HTTPException(status_code=400, detail="Facebook app not configured")
    state = create_access_token({"sub": str(client.id), "type": "fb_state"}, role="client")
    import urllib.parse
    params = urllib.parse.urlencode({
        "client_id": settings.FACEBOOK_APP_ID,
        "redirect_uri": f"{settings.BACKEND_URL}/api/v1/auth/facebook/callback",
        "scope": "pages_manage_posts,pages_read_engagement,pages_show_list",
        "state": state,
        "response_type": "code",
    })
    return {"auth_url": f"https://www.facebook.com/v18.0/dialog/oauth?{params}"}


@router.get("/facebook/callback")
async def facebook_callback(code: str = None, state: str = None, error: str = None, db: Session = Depends(get_db)):
    from fastapi.responses import RedirectResponse
    import httpx
    frontend_url = settings.FRONTEND_URL

    if error or not code or not state:
        return RedirectResponse(f"{frontend_url}/client/profile?facebook_error=1")

    try:
        payload = decode_token(state)
        if payload.get("type") != "fb_state":
            raise ValueError("Invalid state")
        client_id = int(payload["sub"])

        async with httpx.AsyncClient() as http:
            token_res = await http.get(
                "https://graph.facebook.com/v18.0/oauth/access_token",
                params={
                    "client_id": settings.FACEBOOK_APP_ID,
                    "client_secret": settings.FACEBOOK_APP_SECRET,
                    "redirect_uri": f"{settings.BACKEND_URL}/api/v1/auth/facebook/callback",
                    "code": code,
                }
            )
            token_data = token_res.json()
            user_token = token_data.get("access_token")
            if not user_token:
                raise ValueError("No access token")

            pages_res = await http.get(
                "https://graph.facebook.com/v18.0/me/accounts",
                params={"access_token": user_token, "fields": "id,name,access_token"}
            )
            pages = pages_res.json().get("data", [])
            if not pages:
                return RedirectResponse(f"{frontend_url}/client/profile?facebook_error=no_pages")

            page = pages[0]

        from app.models.client_social_token import ClientSocialToken
        existing = db.query(ClientSocialToken).filter(
            ClientSocialToken.client_id == client_id,
            ClientSocialToken.platform == "facebook"
        ).first()
        if existing:
            existing.access_token = page["access_token"]
            existing.page_id = page["id"]
            existing.account_name = page["name"]
        else:
            db.add(ClientSocialToken(
                client_id=client_id,
                platform="facebook",
                access_token=page["access_token"],
                page_id=page["id"],
                account_name=page["name"],
            ))
        db.commit()

        import urllib.parse
        return RedirectResponse(f"{frontend_url}/client/profile?facebook_connected=1&page_name={urllib.parse.quote(page['name'])}")
    except Exception as e:
        logger.error(f"Facebook OAuth error: {e}")
        return RedirectResponse(f"{frontend_url}/client/profile?facebook_error=1")
