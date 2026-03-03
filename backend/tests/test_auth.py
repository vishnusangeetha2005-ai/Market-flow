"""
test_auth.py — tests for /api/v1/auth/* endpoints.

Covers: register, login, /me, logout, token refresh.
"""
from __future__ import annotations

import pytest
from fastapi.testclient import TestClient


# ---------------------------------------------------------------------------
# Register
# ---------------------------------------------------------------------------

def test_register_success(client: TestClient):
    """POST /auth/register with valid data returns 201 and the user's email."""
    response = client.post(
        "/api/v1/auth/register",
        json={
            "email": "newuser@example.com",
            "password": "securepass123",
            "full_name": "New User",
        },
    )
    assert response.status_code == 201
    data = response.json()
    assert data["email"] == "newuser@example.com"
    assert data["full_name"] == "New User"
    assert "id" in data
    assert data["is_active"] is True


def test_register_duplicate_email(client: TestClient, test_user):
    """Registering with an already-used email returns 409."""
    response = client.post(
        "/api/v1/auth/register",
        json={
            "email": "test@example.com",  # same as test_user
            "password": "anotherpass123",
        },
    )
    assert response.status_code == 409


def test_register_invalid_email(client: TestClient):
    """An invalid email format is rejected with 422."""
    response = client.post(
        "/api/v1/auth/register",
        json={"email": "not-an-email", "password": "password123"},
    )
    assert response.status_code == 422


def test_register_password_too_short(client: TestClient):
    """Passwords shorter than 8 characters are rejected with 422."""
    response = client.post(
        "/api/v1/auth/register",
        json={"email": "short@example.com", "password": "abc"},
    )
    assert response.status_code == 422


def test_register_missing_email(client: TestClient):
    """Missing email field returns 422."""
    response = client.post(
        "/api/v1/auth/register",
        json={"password": "password123"},
    )
    assert response.status_code == 422


# ---------------------------------------------------------------------------
# Login
# ---------------------------------------------------------------------------

def test_login_success(client: TestClient, test_user):
    """POST /auth/login with correct credentials returns 200 and tokens."""
    response = client.post(
        "/api/v1/auth/login",
        data={"username": "test@example.com", "password": "password123"},
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["token_type"] == "bearer"


def test_login_wrong_password(client: TestClient, test_user):
    """Wrong password returns 401."""
    response = client.post(
        "/api/v1/auth/login",
        data={"username": "test@example.com", "password": "wrongpassword"},
    )
    assert response.status_code == 401


def test_login_nonexistent_user(client: TestClient):
    """Login for an unknown email returns 401."""
    response = client.post(
        "/api/v1/auth/login",
        data={"username": "nobody@example.com", "password": "password123"},
    )
    assert response.status_code == 401


def test_login_inactive_user(client: TestClient, db, test_user):
    """Login for an inactive user returns 401."""
    test_user.is_active = False
    db.commit()

    response = client.post(
        "/api/v1/auth/login",
        data={"username": "test@example.com", "password": "password123"},
    )
    assert response.status_code == 401


# ---------------------------------------------------------------------------
# /me
# ---------------------------------------------------------------------------

def test_me_authenticated(client: TestClient, auth_headers, test_user):
    """GET /auth/me with a valid token returns 200 and correct email."""
    response = client.get("/api/v1/auth/me", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == test_user.email
    assert data["id"] == test_user.id


def test_me_unauthenticated(client: TestClient):
    """GET /auth/me without a token returns 401."""
    response = client.get("/api/v1/auth/me")
    assert response.status_code == 401


def test_me_invalid_token(client: TestClient):
    """GET /auth/me with a garbage token returns 401."""
    response = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": "Bearer this.is.not.a.valid.token"},
    )
    assert response.status_code == 401


def test_me_returns_correct_fields(client: TestClient, auth_headers, test_user):
    """The /me response includes all expected UserResponse fields."""
    response = client.get("/api/v1/auth/me", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    for field in ("id", "email", "full_name", "is_active", "is_verified"):
        assert field in data, f"Missing field: {field}"


# ---------------------------------------------------------------------------
# Logout
# ---------------------------------------------------------------------------

def test_logout(client: TestClient, valid_refresh_token):
    """POST /auth/logout with a valid refresh token returns 204."""
    response = client.post(
        "/api/v1/auth/logout",
        json={"refresh_token": valid_refresh_token},
    )
    assert response.status_code == 204


def test_logout_with_unknown_token(client: TestClient):
    """Logout with an unknown token silently succeeds (204) — no error raised."""
    response = client.post(
        "/api/v1/auth/logout",
        json={"refresh_token": "unknown-refresh-token-value"},
    )
    assert response.status_code == 204


def test_logout_double_call(client: TestClient, valid_refresh_token):
    """Calling logout twice with the same token both return 204 (idempotent)."""
    client.post("/api/v1/auth/logout", json={"refresh_token": valid_refresh_token})
    response = client.post(
        "/api/v1/auth/logout",
        json={"refresh_token": valid_refresh_token},
    )
    assert response.status_code == 204


# ---------------------------------------------------------------------------
# Refresh
# ---------------------------------------------------------------------------

def test_refresh_token(client: TestClient, valid_refresh_token):
    """POST /auth/refresh with a valid refresh token returns 200 and new tokens."""
    response = client.post(
        "/api/v1/auth/refresh",
        json={"refresh_token": valid_refresh_token},
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert "refresh_token" in data
    # The new refresh token must differ from the old one (rotation)
    assert data["refresh_token"] != valid_refresh_token


def test_refresh_token_invalid(client: TestClient):
    """An invalid/garbage refresh token returns 401."""
    response = client.post(
        "/api/v1/auth/refresh",
        json={"refresh_token": "garbage.token.value"},
    )
    assert response.status_code == 401


def test_refresh_token_access_token_rejected(client: TestClient, auth_headers, test_user):
    """Using an *access* token as a refresh token is rejected with 401."""
    from app.auth.jwt import create_access_token
    access_tok = create_access_token({"sub": str(test_user.id)})
    response = client.post(
        "/api/v1/auth/refresh",
        json={"refresh_token": access_tok},
    )
    assert response.status_code == 401


def test_refresh_token_rotation_revokes_old(client: TestClient, valid_refresh_token):
    """After a successful refresh, the old refresh token can no longer be used."""
    # First refresh succeeds
    resp1 = client.post(
        "/api/v1/auth/refresh",
        json={"refresh_token": valid_refresh_token},
    )
    assert resp1.status_code == 200

    # Using the old token again must fail
    resp2 = client.post(
        "/api/v1/auth/refresh",
        json={"refresh_token": valid_refresh_token},
    )
    assert resp2.status_code == 401
