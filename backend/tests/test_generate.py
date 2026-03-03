"""
test_generate.py — tests for /api/v1/generate/* endpoints.

External API calls (OpenAI, Cloudinary) are mocked for all generation tests.
"""
from __future__ import annotations

from unittest.mock import AsyncMock, patch

import pytest
from fastapi.testclient import TestClient

from app.models.generated_content import GeneratedContent, ContentTypeEnum, ContentPlatformEnum


# ---------------------------------------------------------------------------
# History
# ---------------------------------------------------------------------------

def test_get_history_empty(client: TestClient, auth_headers):
    """GET /generate/history with no items returns 200 and empty list."""
    response = client.get("/api/v1/generate/history", headers=auth_headers)
    assert response.status_code == 200
    assert response.json() == []


def test_get_history_with_data(client: TestClient, auth_headers, test_content):
    """GET /generate/history returns existing generated content for the user."""
    response = client.get("/api/v1/generate/history", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["type"] == "hook"
    assert data[0]["platform"] == "all"


def test_get_history_unauthenticated(client: TestClient):
    """GET /generate/history without auth returns 401."""
    response = client.get("/api/v1/generate/history")
    assert response.status_code == 401


def test_get_history_only_own(client: TestClient, auth_headers, db, test_user2):
    """History endpoint only returns content belonging to the current user."""
    other_content = GeneratedContent(
        user_id=test_user2.id,
        type=ContentTypeEnum.caption,
        prompt="Other user's prompt",
        result_text="Other user's result",
        platform=ContentPlatformEnum.facebook,
    )
    db.add(other_content)
    db.commit()

    response = client.get("/api/v1/generate/history", headers=auth_headers)
    assert response.status_code == 200
    assert response.json() == []


def test_get_history_pagination(client: TestClient, auth_headers, db, test_user):
    """skip and limit query params control pagination."""
    for i in range(5):
        db.add(GeneratedContent(
            user_id=test_user.id,
            type=ContentTypeEnum.hook,
            prompt=f"Prompt {i}",
            result_text=f"Result {i}",
            platform=ContentPlatformEnum.all,
        ))
    db.commit()

    response = client.get(
        "/api/v1/generate/history?skip=0&limit=3", headers=auth_headers
    )
    assert response.status_code == 200
    assert len(response.json()) == 3

    response2 = client.get(
        "/api/v1/generate/history?skip=3&limit=3", headers=auth_headers
    )
    assert response2.status_code == 200
    assert len(response2.json()) == 2


# ---------------------------------------------------------------------------
# Delete content
# ---------------------------------------------------------------------------

def test_delete_content(client: TestClient, auth_headers, test_content):
    """DELETE /generate/{id} returns 204."""
    response = client.delete(
        f"/api/v1/generate/{test_content.id}", headers=auth_headers
    )
    assert response.status_code == 204


def test_delete_content_disappears_from_history(
    client: TestClient, auth_headers, test_content
):
    """After deletion, the item no longer appears in history."""
    client.delete(f"/api/v1/generate/{test_content.id}", headers=auth_headers)
    response = client.get("/api/v1/generate/history", headers=auth_headers)
    assert response.json() == []


def test_delete_content_not_found(client: TestClient, auth_headers):
    """DELETE /generate/99999 returns 404."""
    response = client.delete("/api/v1/generate/99999", headers=auth_headers)
    assert response.status_code == 404


def test_delete_other_users_content(
    client: TestClient, auth_headers, db, test_user2
):
    """User1 cannot delete User2's content — returns 404."""
    other_content = GeneratedContent(
        user_id=test_user2.id,
        type=ContentTypeEnum.hook,
        prompt="User2 prompt",
        result_text="User2 result",
        platform=ContentPlatformEnum.instagram,
    )
    db.add(other_content)
    db.commit()

    response = client.delete(
        f"/api/v1/generate/{other_content.id}", headers=auth_headers
    )
    assert response.status_code == 404


def test_delete_content_unauthenticated(client: TestClient, test_content):
    """DELETE without auth returns 401."""
    response = client.delete(f"/api/v1/generate/{test_content.id}")
    assert response.status_code == 401


# ---------------------------------------------------------------------------
# Generate Banner (OpenAI + Cloudinary mocked)
# ---------------------------------------------------------------------------

def test_generate_banner_unauthenticated(client: TestClient):
    """POST /generate/banner without auth returns 401."""
    response = client.post(
        "/api/v1/generate/banner",
        json={
            "topic": "Summer Sale",
            "brand_name": "TestBrand",
            "style": "modern",
            "platform": "instagram",
        },
    )
    assert response.status_code == 401


@patch(
    "app.services.generate_service.generate_banner_image",
    new_callable=AsyncMock,
    return_value="https://fake-dalle-url.com/image.png",
)
@patch(
    "app.services.generate_service.upload_image_from_url",
    new_callable=AsyncMock,
    return_value="https://cloudinary.com/image.png",
)
def test_generate_banner(mock_upload, mock_dalle, client: TestClient, auth_headers):
    """POST /generate/banner returns 201 with banner content item."""
    response = client.post(
        "/api/v1/generate/banner",
        json={
            "topic": "Summer Sale",
            "brand_name": "TestBrand",
            "style": "modern",
            "platform": "instagram",
        },
        headers=auth_headers,
    )
    assert response.status_code == 201
    data = response.json()
    assert data["type"] == "banner"
    assert data["result_url"] == "https://cloudinary.com/image.png"
    assert data["platform"] == "instagram"


@patch(
    "app.services.generate_service.generate_banner_image",
    new_callable=AsyncMock,
    return_value="https://fake-dalle-url.com/fb.png",
)
@patch(
    "app.services.generate_service.upload_image_from_url",
    new_callable=AsyncMock,
    return_value="https://cloudinary.com/fb.png",
)
def test_generate_banner_facebook(mock_upload, mock_dalle, client: TestClient, auth_headers):
    """POST /generate/banner for facebook platform succeeds."""
    response = client.post(
        "/api/v1/generate/banner",
        json={
            "topic": "Flash Sale",
            "brand_name": "MyBrand",
            "style": "bold",
            "platform": "facebook",
        },
        headers=auth_headers,
    )
    assert response.status_code == 201
    data = response.json()
    assert data["platform"] == "facebook"
    assert "id" in data
    assert "created_at" in data


@patch(
    "app.services.generate_service.generate_banner_image",
    new_callable=AsyncMock,
    return_value="https://dalle.com/img.png",
)
@patch(
    "app.services.generate_service.upload_image_from_url",
    new_callable=AsyncMock,
    return_value="https://cdn.cloudinary.com/img.png",
)
def test_generate_banner_saved_to_history(mock_upload, mock_dalle, client: TestClient, auth_headers):
    """Banner generation saves the item so it appears in history."""
    client.post(
        "/api/v1/generate/banner",
        json={
            "topic": "Event Promo",
            "brand_name": "EventCo",
            "style": "elegant",
            "platform": "all",
        },
        headers=auth_headers,
    )

    history = client.get("/api/v1/generate/history", headers=auth_headers)
    assert history.status_code == 200
    data = history.json()
    assert len(data) == 1
    assert data[0]["type"] == "banner"


# ---------------------------------------------------------------------------
# Generate Hook (OpenAI mocked)
# ---------------------------------------------------------------------------

def test_generate_hook_unauthenticated(client: TestClient):
    """POST /generate/hook without auth returns 401."""
    response = client.post(
        "/api/v1/generate/hook",
        json={"topic": "New Product Launch", "platform": "instagram", "tone": "energetic"},
    )
    assert response.status_code == 401


@patch(
    "app.services.generate_service.generate_hook_text",
    new_callable=AsyncMock,
    return_value="This summer sale is UNMISSABLE! Shop now before it's gone!",
)
def test_generate_hook(mock_gpt, client: TestClient, auth_headers):
    """POST /generate/hook returns 201 with hook text."""
    response = client.post(
        "/api/v1/generate/hook",
        json={
            "topic": "Summer Sale",
            "platform": "instagram",
            "tone": "energetic",
            "include_cta": True,
        },
        headers=auth_headers,
    )
    assert response.status_code == 201
    data = response.json()
    assert data["type"] == "hook"
    assert data["result_text"] == "This summer sale is UNMISSABLE! Shop now before it's gone!"
    assert data["result_url"] is None


@patch(
    "app.services.generate_service.generate_hook_text",
    new_callable=AsyncMock,
    return_value="Professional insight for LinkedIn audience.",
)
def test_generate_hook_linkedin(mock_gpt, client: TestClient, auth_headers):
    """POST /generate/hook for linkedin platform succeeds."""
    response = client.post(
        "/api/v1/generate/hook",
        json={
            "topic": "B2B Marketing Trends",
            "platform": "linkedin",
            "tone": "professional",
            "include_cta": False,
        },
        headers=auth_headers,
    )
    assert response.status_code == 201
    data = response.json()
    assert data["platform"] == "linkedin"
    assert "id" in data


@patch(
    "app.services.generate_service.generate_hook_text",
    new_callable=AsyncMock,
    return_value="Casual hook for everyone!",
)
def test_generate_hook_appears_in_history(mock_gpt, client: TestClient, auth_headers):
    """Generated hook appears in history after creation."""
    client.post(
        "/api/v1/generate/hook",
        json={
            "topic": "Weekend Tips",
            "platform": "all",
            "tone": "casual",
            "include_cta": True,
        },
        headers=auth_headers,
    )

    history = client.get("/api/v1/generate/history", headers=auth_headers)
    data = history.json()
    assert len(data) == 1
    assert data[0]["type"] == "hook"


# ---------------------------------------------------------------------------
# Generate Caption (OpenAI mocked)
# ---------------------------------------------------------------------------

def test_generate_caption_unauthenticated(client: TestClient):
    """POST /generate/caption without auth returns 401."""
    response = client.post(
        "/api/v1/generate/caption",
        json={"topic": "New Product", "platform": "facebook", "tone": "casual"},
    )
    assert response.status_code == 401


@patch(
    "app.services.generate_service.generate_caption_text",
    new_callable=AsyncMock,
    return_value="Check out our amazing summer deals! #SummerSale #Deals #ShopNow",
)
def test_generate_caption(mock_gpt, client: TestClient, auth_headers):
    """POST /generate/caption returns 201 with caption text."""
    response = client.post(
        "/api/v1/generate/caption",
        json={
            "topic": "Summer Deals",
            "platform": "instagram",
            "tone": "casual",
            "include_hashtags": True,
            "include_cta": True,
        },
        headers=auth_headers,
    )
    assert response.status_code == 201
    data = response.json()
    assert data["type"] == "caption"
    assert "Summer" in data["result_text"]
    assert data["result_url"] is None


@patch(
    "app.services.generate_service.generate_caption_text",
    new_callable=AsyncMock,
    return_value="Thought leadership post for LinkedIn professionals.",
)
def test_generate_caption_all_platforms(mock_gpt, client: TestClient, auth_headers):
    """POST /generate/caption with platform=all succeeds."""
    response = client.post(
        "/api/v1/generate/caption",
        json={
            "topic": "Industry Insights",
            "platform": "all",
            "tone": "inspirational",
            "include_hashtags": False,
            "include_cta": False,
        },
        headers=auth_headers,
    )
    assert response.status_code == 201
    assert response.json()["platform"] == "all"


@patch(
    "app.services.generate_service.generate_caption_text",
    new_callable=AsyncMock,
    return_value="Great caption text.",
)
def test_generate_caption_prompt_stored(mock_gpt, client: TestClient, auth_headers):
    """The prompt used to generate the caption is stored in the response."""
    response = client.post(
        "/api/v1/generate/caption",
        json={
            "topic": "Spring Collection",
            "platform": "facebook",
            "tone": "energetic",
            "include_hashtags": True,
            "include_cta": True,
        },
        headers=auth_headers,
    )
    assert response.status_code == 201
    data = response.json()
    assert "prompt" in data
    assert len(data["prompt"]) > 0
