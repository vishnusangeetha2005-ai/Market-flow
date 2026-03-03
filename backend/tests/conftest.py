"""
conftest.py — shared fixtures for the SocialFlow AI test suite.

Uses SQLite (in-memory style via a temp file) so no Postgres instance is
required during CI or local development.
"""
from __future__ import annotations

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker

from app.main import app
from app.database import Base, get_db
from app.auth.jwt import hash_password, create_access_token, create_refresh_token
from app.models.user import User
from app.models.social_account import SocialAccount, PlatformEnum
from app.models.post import Post, PostStatusEnum
from app.models.generated_content import GeneratedContent, ContentTypeEnum, ContentPlatformEnum
from app.models.refresh_token import RefreshToken
from app.exceptions import AppException, app_exception_handler
from app.routers import auth as auth_router
from app.routers import dashboard as dashboard_router

# ---------------------------------------------------------------------------
# Register the auth and dashboard routers that main.py omits
# ---------------------------------------------------------------------------
_AUTH_ALREADY_ADDED = any(r.path.startswith("/api/v1/auth") for r in app.routes)
if not _AUTH_ALREADY_ADDED:
    app.include_router(auth_router.router, prefix="/api/v1")

_DASH_ALREADY_ADDED = any(r.path.startswith("/api/v1/dashboard") for r in app.routes)
if not _DASH_ALREADY_ADDED:
    app.include_router(dashboard_router.router, prefix="/api/v1")

# Register the AppException handler so service-layer errors map to HTTP codes
app.add_exception_handler(AppException, app_exception_handler)

# ---------------------------------------------------------------------------
# SQLite test database
# ---------------------------------------------------------------------------
TEST_DB_URL = "sqlite:///./test_socialflow.db"
engine = create_engine(TEST_DB_URL, connect_args={"check_same_thread": False})


# Enable WAL mode and foreign keys for SQLite
@event.listens_for(engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.close()


TestSession = sessionmaker(autocommit=False, autoflush=False, bind=engine)


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture(scope="function")
def db():
    """Create all tables, yield a session, then drop everything."""
    Base.metadata.create_all(bind=engine)
    session = TestSession()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="function")
def client(db):
    """TestClient wired to the in-memory SQLite db session."""
    def override_get_db():
        yield db

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app, raise_server_exceptions=False) as c:
        yield c
    app.dependency_overrides.clear()


@pytest.fixture
def test_user(db):
    """A standard active user."""
    user = User(
        email="test@example.com",
        hashed_password=hash_password("password123"),
        full_name="Test User",
        is_active=True,
        is_verified=False,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@pytest.fixture
def auth_headers(test_user):
    """Bearer token headers for test_user."""
    token = create_access_token({"sub": str(test_user.id)})
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def test_user2(db):
    """A second distinct user for isolation tests."""
    user = User(
        email="other@example.com",
        hashed_password=hash_password("password123"),
        full_name="Other User",
        is_active=True,
        is_verified=False,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@pytest.fixture
def auth_headers2(test_user2):
    """Bearer token headers for test_user2."""
    token = create_access_token({"sub": str(test_user2.id)})
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def test_social_account(db, test_user):
    """A Facebook social account owned by test_user."""
    account = SocialAccount(
        user_id=test_user.id,
        platform=PlatformEnum.facebook,
        account_name="Test Page",
        account_id="123456789",
        access_token="fake_access_token",
        is_active=True,
    )
    db.add(account)
    db.commit()
    db.refresh(account)
    return account


@pytest.fixture
def test_post(db, test_user):
    """A draft post owned by test_user."""
    post = Post(
        user_id=test_user.id,
        title="Test Post",
        caption="This is a test caption #testing",
        banner_url="https://example.com/image.jpg",
        platforms=["facebook", "instagram"],
        status=PostStatusEnum.draft,
    )
    db.add(post)
    db.commit()
    db.refresh(post)
    return post


@pytest.fixture
def test_content(db, test_user):
    """A generated hook content item owned by test_user."""
    content = GeneratedContent(
        user_id=test_user.id,
        type=ContentTypeEnum.hook,
        prompt="Hook for summer sale",
        result_text="Summer sale is here! Don't miss out!",
        platform=ContentPlatformEnum.all,
    )
    db.add(content)
    db.commit()
    db.refresh(content)
    return content


@pytest.fixture
def valid_refresh_token(db, test_user):
    """A real refresh token stored in the database for test_user."""
    token_str = create_refresh_token({"sub": str(test_user.id)})
    from app.services.auth_service import _store_refresh_token
    _store_refresh_token(db, test_user.id, token_str)
    return token_str
