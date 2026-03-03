"""
test_social_accounts.py — tests for /api/v1/social-accounts/* endpoints.

Covers: list, connect URL generation, disconnect (soft delete).
"""
from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from app.models.social_account import SocialAccount, PlatformEnum


# ---------------------------------------------------------------------------
# List accounts
# ---------------------------------------------------------------------------

def test_list_accounts_empty(client: TestClient, auth_headers):
    """Authenticated user with no accounts receives an empty list (200)."""
    response = client.get("/api/v1/social-accounts/", headers=auth_headers)
    assert response.status_code == 200
    assert response.json() == []


def test_list_accounts_with_data(client: TestClient, auth_headers, test_social_account):
    """Authenticated user with one account receives a list with 1 item."""
    response = client.get("/api/v1/social-accounts/", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["account_name"] == "Test Page"
    assert data[0]["platform"] == "facebook"


def test_list_accounts_unauthenticated(client: TestClient):
    """Unauthenticated request returns 401."""
    response = client.get("/api/v1/social-accounts/")
    assert response.status_code == 401


def test_list_accounts_only_own(client: TestClient, auth_headers, db, test_user2):
    """User only sees their own accounts, not another user's."""
    other_account = SocialAccount(
        user_id=test_user2.id,
        platform=PlatformEnum.instagram,
        account_name="Other Page",
        account_id="999",
        access_token="other_token",
        is_active=True,
    )
    db.add(other_account)
    db.commit()

    response = client.get("/api/v1/social-accounts/", headers=auth_headers)
    assert response.status_code == 200
    assert response.json() == []


def test_list_accounts_excludes_inactive(client: TestClient, auth_headers, db, test_user):
    """Inactive accounts are not returned."""
    inactive = SocialAccount(
        user_id=test_user.id,
        platform=PlatformEnum.linkedin,
        account_name="Inactive Account",
        account_id="000",
        access_token="token",
        is_active=False,
    )
    db.add(inactive)
    db.commit()

    response = client.get("/api/v1/social-accounts/", headers=auth_headers)
    assert response.status_code == 200
    assert response.json() == []


# ---------------------------------------------------------------------------
# Connect (OAuth URL generation)
# ---------------------------------------------------------------------------

def test_get_connect_url_facebook(client: TestClient, auth_headers):
    """GET /connect/facebook returns 200 with an oauth_url."""
    response = client.get("/api/v1/social-accounts/connect/facebook", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert "oauth_url" in data
    assert "facebook.com" in data["oauth_url"]


def test_get_connect_url_instagram(client: TestClient, auth_headers):
    """GET /connect/instagram returns 200 with an oauth_url."""
    response = client.get("/api/v1/social-accounts/connect/instagram", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert "oauth_url" in data
    # Instagram uses Facebook's OAuth flow
    assert "facebook.com" in data["oauth_url"]


def test_get_connect_url_linkedin(client: TestClient, auth_headers):
    """GET /connect/linkedin returns 200 with an oauth_url."""
    response = client.get("/api/v1/social-accounts/connect/linkedin", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert "oauth_url" in data
    assert "linkedin.com" in data["oauth_url"]


def test_get_connect_url_includes_state(client: TestClient, auth_headers):
    """The connect response includes a state parameter for CSRF protection."""
    response = client.get("/api/v1/social-accounts/connect/facebook", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert "state" in data
    assert len(data["state"]) > 0


def test_get_connect_url_unauthenticated(client: TestClient):
    """Connect URL endpoint without auth returns 401."""
    response = client.get("/api/v1/social-accounts/connect/facebook")
    assert response.status_code == 401


def test_get_connect_url_invalid_platform(client: TestClient, auth_headers):
    """Unsupported platform returns 422 (path param enum validation)."""
    response = client.get(
        "/api/v1/social-accounts/connect/tiktok", headers=auth_headers
    )
    assert response.status_code == 422


# ---------------------------------------------------------------------------
# Disconnect
# ---------------------------------------------------------------------------

def test_disconnect_account(client: TestClient, auth_headers, test_social_account, db):
    """DELETE /{id} soft-disconnects the account (returns 204)."""
    account_id = test_social_account.id
    response = client.delete(
        f"/api/v1/social-accounts/{account_id}", headers=auth_headers
    )
    assert response.status_code == 204

    # The account should now be inactive in the database
    db.expire(test_social_account)
    db.refresh(test_social_account)
    assert test_social_account.is_active is False


def test_disconnect_account_disappears_from_list(
    client: TestClient, auth_headers, test_social_account
):
    """After disconnecting, the account no longer appears in the list."""
    account_id = test_social_account.id
    client.delete(f"/api/v1/social-accounts/{account_id}", headers=auth_headers)

    response = client.get("/api/v1/social-accounts/", headers=auth_headers)
    assert response.status_code == 200
    assert response.json() == []


def test_disconnect_nonexistent(client: TestClient, auth_headers):
    """Deleting a non-existent account returns 404."""
    response = client.delete(
        "/api/v1/social-accounts/99999", headers=auth_headers
    )
    assert response.status_code == 404


def test_disconnect_other_users_account(
    client: TestClient, auth_headers, db, test_user2
):
    """User1 cannot disconnect User2's account — returns 404."""
    other_account = SocialAccount(
        user_id=test_user2.id,
        platform=PlatformEnum.facebook,
        account_name="User2 Page",
        account_id="user2_acct",
        access_token="user2_token",
        is_active=True,
    )
    db.add(other_account)
    db.commit()

    response = client.delete(
        f"/api/v1/social-accounts/{other_account.id}", headers=auth_headers
    )
    assert response.status_code == 404


def test_disconnect_unauthenticated(client: TestClient, test_social_account):
    """DELETE without auth returns 401."""
    response = client.delete(
        f"/api/v1/social-accounts/{test_social_account.id}"
    )
    assert response.status_code == 401
