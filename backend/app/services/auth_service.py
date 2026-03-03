from __future__ import annotations

import logging
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.auth.jwt import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)
from app.exceptions import ConflictError, NotFoundError, UnauthorizedError
from app.models.refresh_token import RefreshToken
from app.models.user import User
from app.schemas.auth import Token

logger = logging.getLogger(__name__)


def register_user(db: Session, email: str, password: str, full_name: str | None = None) -> User:
    """Register a new user with email and password.

    Raises ConflictError if the email is already in use.
    """
    existing = db.query(User).filter(User.email == email).first()
    if existing:
        logger.warning("Registration attempted with existing email: %s", email)
        raise ConflictError("An account with this email already exists")

    user = User(
        email=email,
        hashed_password=hash_password(password),
        full_name=full_name,
        is_active=True,
        is_verified=False,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    logger.info("New user registered: id=%s email=%s", user.id, user.email)
    return user


def login_user(db: Session, email: str, password: str) -> Token:
    """Validate credentials and return a token pair.

    Raises UnauthorizedError on invalid credentials or inactive account.
    """
    user = db.query(User).filter(User.email == email).first()
    if not user or not user.hashed_password:
        logger.warning("Login failed for email (not found or OAuth-only): %s", email)
        raise UnauthorizedError("Invalid email or password")

    if not verify_password(password, user.hashed_password):
        logger.warning("Login failed — wrong password for email: %s", email)
        raise UnauthorizedError("Invalid email or password")

    if not user.is_active:
        logger.warning("Login attempt by inactive user id=%s", user.id)
        raise UnauthorizedError("Account is inactive")

    token_data = {"sub": str(user.id)}
    access_token = create_access_token(token_data)
    refresh_token_str = create_refresh_token(token_data)

    _store_refresh_token(db, user.id, refresh_token_str)

    logger.info("User logged in: id=%s", user.id)
    return Token(
        access_token=access_token,
        refresh_token=refresh_token_str,
        token_type="bearer",
    )


def refresh_tokens(db: Session, refresh_token: str) -> Token:
    """Issue a new token pair from a valid refresh token.

    Raises UnauthorizedError if the token is invalid, expired, or not found
    in the database (already revoked).
    """
    payload = decode_token(refresh_token)
    if not payload or payload.get("type") != "refresh":
        logger.warning("Invalid or wrong-type refresh token presented")
        raise UnauthorizedError("Invalid refresh token")

    stored = db.query(RefreshToken).filter(RefreshToken.token == refresh_token).first()
    if not stored:
        logger.warning("Refresh token not found in DB (already revoked or never issued)")
        raise UnauthorizedError("Refresh token has been revoked")

    if stored.expires_at < datetime.now(timezone.utc):
        logger.warning("Expired refresh token presented for user_id=%s", stored.user_id)
        db.delete(stored)
        db.commit()
        raise UnauthorizedError("Refresh token has expired")

    user = db.query(User).filter(User.id == stored.user_id).first()
    if not user or not user.is_active:
        logger.warning("Refresh token belongs to missing/inactive user id=%s", stored.user_id)
        raise UnauthorizedError("User not found or inactive")

    # Rotate — delete old token and issue new pair
    db.delete(stored)
    db.commit()

    token_data = {"sub": str(user.id)}
    new_access = create_access_token(token_data)
    new_refresh = create_refresh_token(token_data)
    _store_refresh_token(db, user.id, new_refresh)

    logger.info("Tokens refreshed for user id=%s", user.id)
    return Token(
        access_token=new_access,
        refresh_token=new_refresh,
        token_type="bearer",
    )


def logout_user(db: Session, refresh_token: str) -> None:
    """Revoke the supplied refresh token.

    Silently succeeds if the token is not found so that double-logout is safe.
    """
    stored = db.query(RefreshToken).filter(RefreshToken.token == refresh_token).first()
    if stored:
        user_id = stored.user_id
        db.delete(stored)
        db.commit()
        logger.info("Refresh token revoked for user id=%s", user_id)
    else:
        logger.debug("logout_user called with unknown/already-revoked token")


def get_or_create_google_user(db: Session, google_user_data: dict) -> User:
    """Return the User matching the Google OAuth profile, creating one if needed.

    The lookup order is:
    1. Match by oauth_provider + oauth_id (returning users).
    2. Match by email (user already registered with password).
    3. Create a brand-new user.
    """
    google_id: str = str(google_user_data.get("id", ""))
    email: str = google_user_data.get("email", "")
    full_name: str | None = google_user_data.get("name")

    # 1. Existing OAuth user
    user = (
        db.query(User)
        .filter(User.oauth_provider == "google", User.oauth_id == google_id)
        .first()
    )
    if user:
        logger.info("Google OAuth: returning user id=%s", user.id)
        return user

    # 2. Email already exists — link the OAuth provider
    user = db.query(User).filter(User.email == email).first()
    if user:
        user.oauth_provider = "google"
        user.oauth_id = google_id
        if not user.is_verified:
            user.is_verified = True
        db.commit()
        db.refresh(user)
        logger.info("Google OAuth: linked existing user id=%s to Google", user.id)
        return user

    # 3. New user
    user = User(
        email=email,
        full_name=full_name,
        hashed_password=None,
        oauth_provider="google",
        oauth_id=google_id,
        is_active=True,
        is_verified=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    logger.info("Google OAuth: new user created id=%s email=%s", user.id, user.email)
    return user


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _store_refresh_token(db: Session, user_id: int, token: str) -> RefreshToken:
    """Persist a refresh token so it can be validated and revoked later."""
    from datetime import timedelta
    from app.config import settings

    expires_at = datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    rt = RefreshToken(user_id=user_id, token=token, expires_at=expires_at)
    db.add(rt)
    db.commit()
    db.refresh(rt)
    return rt
