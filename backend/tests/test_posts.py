"""
test_posts.py — tests for /api/v1/posts/* endpoints.

Covers: CRUD, scheduling, publishing (mocked), and post results.
"""
from __future__ import annotations

from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock, patch

import pytest
from fastapi.testclient import TestClient

from app.models.post import Post, PostStatusEnum


# ---------------------------------------------------------------------------
# Create
# ---------------------------------------------------------------------------

def test_create_post(client: TestClient, auth_headers):
    """POST /posts creates a new draft post and returns 201."""
    response = client.post(
        "/api/v1/posts/",
        json={
            "title": "My First Post",
            "caption": "Hello, social world!",
            "banner_url": "https://example.com/banner.jpg",
            "platforms": ["facebook", "instagram"],
        },
        headers=auth_headers,
    )
    assert response.status_code == 201
    data = response.json()
    assert data["title"] == "My First Post"
    assert data["status"] == "draft"
    assert "facebook" in data["platforms"]


def test_create_post_unauthenticated(client: TestClient):
    """POST /posts without auth returns 401."""
    response = client.post(
        "/api/v1/posts/",
        json={
            "title": "Post",
            "caption": "Caption",
            "platforms": ["facebook"],
        },
    )
    assert response.status_code == 401


def test_create_post_empty_platforms(client: TestClient, auth_headers):
    """POST /posts with an empty platforms list is rejected with 422."""
    response = client.post(
        "/api/v1/posts/",
        json={
            "title": "Post",
            "caption": "Caption",
            "platforms": [],
        },
        headers=auth_headers,
    )
    assert response.status_code == 422


def test_create_post_missing_title(client: TestClient, auth_headers):
    """POST /posts without a title returns 422."""
    response = client.post(
        "/api/v1/posts/",
        json={"caption": "Caption", "platforms": ["facebook"]},
        headers=auth_headers,
    )
    assert response.status_code == 422


def test_create_post_missing_caption(client: TestClient, auth_headers):
    """POST /posts without a caption returns 422."""
    response = client.post(
        "/api/v1/posts/",
        json={"title": "Title", "platforms": ["facebook"]},
        headers=auth_headers,
    )
    assert response.status_code == 422


def test_create_post_without_banner(client: TestClient, auth_headers):
    """banner_url is optional — post can be created without it."""
    response = client.post(
        "/api/v1/posts/",
        json={
            "title": "No Banner Post",
            "caption": "Caption without image",
            "platforms": ["linkedin"],
        },
        headers=auth_headers,
    )
    assert response.status_code == 201
    assert response.json()["banner_url"] is None


# ---------------------------------------------------------------------------
# List
# ---------------------------------------------------------------------------

def test_list_posts_empty(client: TestClient, auth_headers):
    """GET /posts for a user with no posts returns 200 and an empty list."""
    response = client.get("/api/v1/posts/", headers=auth_headers)
    assert response.status_code == 200
    assert response.json() == []


def test_list_posts_with_data(client: TestClient, auth_headers, test_post):
    """GET /posts returns a list containing the user's post."""
    response = client.get("/api/v1/posts/", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["title"] == test_post.title


def test_list_posts_filter_by_status(client: TestClient, auth_headers, db, test_user):
    """?status=draft returns only draft posts."""
    draft = Post(
        user_id=test_user.id,
        title="Draft Post",
        caption="draft",
        platforms=["facebook"],
        status=PostStatusEnum.draft,
    )
    scheduled = Post(
        user_id=test_user.id,
        title="Scheduled Post",
        caption="scheduled",
        platforms=["instagram"],
        status=PostStatusEnum.scheduled,
        scheduled_at=datetime.now(timezone.utc) + timedelta(hours=1),
    )
    db.add(draft)
    db.add(scheduled)
    db.commit()

    response = client.get("/api/v1/posts/?status=draft", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert all(p["status"] == "draft" for p in data)
    titles = [p["title"] for p in data]
    assert "Draft Post" in titles
    assert "Scheduled Post" not in titles


def test_list_posts_filter_by_scheduled(client: TestClient, auth_headers, db, test_user):
    """?status=scheduled returns only scheduled posts."""
    Post_ = Post(
        user_id=test_user.id,
        title="Scheduled Only",
        caption="go",
        platforms=["linkedin"],
        status=PostStatusEnum.scheduled,
        scheduled_at=datetime.now(timezone.utc) + timedelta(days=1),
    )
    db.add(Post_)
    db.commit()

    response = client.get("/api/v1/posts/?status=scheduled", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["status"] == "scheduled"


def test_list_posts_unauthenticated(client: TestClient):
    """GET /posts without auth returns 401."""
    response = client.get("/api/v1/posts/")
    assert response.status_code == 401


def test_list_posts_only_own(client: TestClient, auth_headers, db, test_user2):
    """User only sees their own posts."""
    other_post = Post(
        user_id=test_user2.id,
        title="Other User Post",
        caption="not yours",
        platforms=["facebook"],
        status=PostStatusEnum.draft,
    )
    db.add(other_post)
    db.commit()

    response = client.get("/api/v1/posts/", headers=auth_headers)
    assert response.status_code == 200
    assert response.json() == []


# ---------------------------------------------------------------------------
# Get single
# ---------------------------------------------------------------------------

def test_get_post(client: TestClient, auth_headers, test_post):
    """GET /posts/{id} returns 200 and the correct post."""
    response = client.get(f"/api/v1/posts/{test_post.id}", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == test_post.id
    assert data["title"] == test_post.title


def test_get_post_not_found(client: TestClient, auth_headers):
    """GET /posts/99999 returns 404."""
    response = client.get("/api/v1/posts/99999", headers=auth_headers)
    assert response.status_code == 404


def test_get_post_other_user(client: TestClient, auth_headers, db, test_user2):
    """User cannot GET another user's post — returns 404."""
    other_post = Post(
        user_id=test_user2.id,
        title="User2 Post",
        caption="private",
        platforms=["facebook"],
        status=PostStatusEnum.draft,
    )
    db.add(other_post)
    db.commit()

    response = client.get(f"/api/v1/posts/{other_post.id}", headers=auth_headers)
    assert response.status_code == 404


def test_get_post_unauthenticated(client: TestClient, test_post):
    """GET without auth returns 401."""
    response = client.get(f"/api/v1/posts/{test_post.id}")
    assert response.status_code == 401


# ---------------------------------------------------------------------------
# Update
# ---------------------------------------------------------------------------

def test_update_post(client: TestClient, auth_headers, test_post):
    """PUT /posts/{id} updates fields and returns 200 with new values."""
    response = client.put(
        f"/api/v1/posts/{test_post.id}",
        json={"title": "Updated Title"},
        headers=auth_headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["title"] == "Updated Title"


def test_update_post_caption(client: TestClient, auth_headers, test_post):
    """Caption can be updated independently."""
    response = client.put(
        f"/api/v1/posts/{test_post.id}",
        json={"caption": "Brand new caption text"},
        headers=auth_headers,
    )
    assert response.status_code == 200
    assert response.json()["caption"] == "Brand new caption text"


def test_update_post_not_found(client: TestClient, auth_headers):
    """PUT on a non-existent post returns 404."""
    response = client.put(
        "/api/v1/posts/99999",
        json={"title": "Ghost"},
        headers=auth_headers,
    )
    assert response.status_code == 404


def test_update_post_unauthenticated(client: TestClient, test_post):
    """PUT without auth returns 401."""
    response = client.put(
        f"/api/v1/posts/{test_post.id}",
        json={"title": "No Auth"},
    )
    assert response.status_code == 401


# ---------------------------------------------------------------------------
# Delete
# ---------------------------------------------------------------------------

def test_delete_post(client: TestClient, auth_headers, test_post):
    """DELETE /posts/{id} returns 204 and subsequent GET returns 404."""
    response = client.delete(
        f"/api/v1/posts/{test_post.id}", headers=auth_headers
    )
    assert response.status_code == 204

    get_response = client.get(
        f"/api/v1/posts/{test_post.id}", headers=auth_headers
    )
    assert get_response.status_code == 404


def test_delete_post_not_found(client: TestClient, auth_headers):
    """DELETE on a non-existent post returns 404."""
    response = client.delete("/api/v1/posts/99999", headers=auth_headers)
    assert response.status_code == 404


def test_delete_post_unauthenticated(client: TestClient, test_post):
    """DELETE without auth returns 401."""
    response = client.delete(f"/api/v1/posts/{test_post.id}")
    assert response.status_code == 401


# ---------------------------------------------------------------------------
# Schedule
# ---------------------------------------------------------------------------

def test_schedule_post(client: TestClient, auth_headers, test_post):
    """POST /posts/{id}/schedule with a future datetime sets status to scheduled."""
    future_time = (datetime.now(timezone.utc) + timedelta(hours=2)).isoformat()
    response = client.post(
        f"/api/v1/posts/{test_post.id}/schedule",
        json={"scheduled_at": future_time},
        headers=auth_headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "scheduled"
    assert data["scheduled_at"] is not None


def test_schedule_post_not_found(client: TestClient, auth_headers):
    """Scheduling a non-existent post returns 404."""
    future_time = (datetime.now(timezone.utc) + timedelta(hours=1)).isoformat()
    response = client.post(
        "/api/v1/posts/99999/schedule",
        json={"scheduled_at": future_time},
        headers=auth_headers,
    )
    assert response.status_code == 404


def test_schedule_post_unauthenticated(client: TestClient, test_post):
    """Schedule endpoint without auth returns 401."""
    future_time = (datetime.now(timezone.utc) + timedelta(hours=1)).isoformat()
    response = client.post(
        f"/api/v1/posts/{test_post.id}/schedule",
        json={"scheduled_at": future_time},
    )
    assert response.status_code == 401


# ---------------------------------------------------------------------------
# Publish (mocked)
# ---------------------------------------------------------------------------

@patch("app.services.post_service.publish_to_facebook", new_callable=AsyncMock, return_value="fb_post_123")
def test_publish_post_with_connected_account(
    mock_fb, client: TestClient, auth_headers, db, test_user, test_social_account
):
    """POST /posts/{id}/publish publishes to connected accounts and returns 200."""
    # Create a post targeting only facebook (which test_social_account covers)
    post = Post(
        user_id=test_user.id,
        title="Publish Me",
        caption="Publishing now!",
        banner_url="https://example.com/img.jpg",
        platforms=["facebook"],
        status=PostStatusEnum.draft,
    )
    db.add(post)
    db.commit()

    response = client.post(
        f"/api/v1/posts/{post.id}/publish", headers=auth_headers
    )
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "published"


def test_publish_post_no_connected_account(
    client: TestClient, auth_headers, test_post
):
    """Publishing when no social account is connected marks post as failed."""
    response = client.post(
        f"/api/v1/posts/{test_post.id}/publish", headers=auth_headers
    )
    assert response.status_code == 200
    data = response.json()
    # No accounts connected — should be failed
    assert data["status"] == "failed"


# ---------------------------------------------------------------------------
# Post results
# ---------------------------------------------------------------------------

def test_get_post_results_empty(client: TestClient, auth_headers, test_post):
    """GET /posts/{id}/results with no results returns 200 and empty list."""
    response = client.get(
        f"/api/v1/posts/{test_post.id}/results", headers=auth_headers
    )
    assert response.status_code == 200
    assert response.json() == []


def test_get_post_results_not_found(client: TestClient, auth_headers):
    """GET results for a non-existent post returns 404."""
    response = client.get("/api/v1/posts/99999/results", headers=auth_headers)
    assert response.status_code == 404


def test_get_post_results_unauthenticated(client: TestClient, test_post):
    """GET results without auth returns 401."""
    response = client.get(f"/api/v1/posts/{test_post.id}/results")
    assert response.status_code == 401
