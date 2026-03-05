"""
Google Business Profile Publisher
-----------------------------------
Posts a LOCAL_POST to a Google Business Profile location using
the Google My Business API v4.

Requirements:
  - Owner stores a valid OAuth2 access_token for each client's GBP account
  - The token must have scope: https://www.googleapis.com/auth/business.manage
  - page_id stores the fully-qualified location name:
      "accounts/{accountId}/locations/{locationId}"

API Reference:
  POST https://mybusiness.googleapis.com/v4/{parent}/localPosts
"""

import logging
import httpx

logger = logging.getLogger(__name__)

GBP_API_BASE = "https://mybusiness.googleapis.com/v4"


async def publish_google_business(
    access_token: str,
    location_name: str,
    text: str,
    image_url: str | None = None,
) -> dict:
    """
    Create a LOCAL_POST on Google Business Profile.

    Args:
        access_token: OAuth2 access token with business.manage scope.
        location_name: Full location resource name, e.g.
                       "accounts/123456789/locations/987654321"
        text: Post caption / hook text (max 1500 chars).
        image_url: Publicly accessible image URL to attach (optional).

    Returns:
        dict with Google API response (contains 'name' of created post).

    Raises:
        Exception on HTTP error or API rejection.
    """
    if not access_token or not location_name:
        raise ValueError("access_token and location_name are required for Google Business posting")

    # Build the localPost payload
    payload: dict = {
        "languageCode": "en-US",
        "summary": text[:1500],  # GBP max summary length
        "topicType": "STANDARD",
    }

    if image_url:
        payload["media"] = [
            {
                "mediaFormat": "PHOTO",
                "sourceUrl": image_url,
            }
        ]

    url = f"{GBP_API_BASE}/{location_name}/localPosts"
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json",
    }

    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(url, json=payload, headers=headers)

    if response.status_code not in (200, 201):
        error_detail = response.text[:500]
        logger.error(
            "Google Business API error %s for location %s: %s",
            response.status_code, location_name, error_detail
        )
        raise Exception(
            f"Google Business API returned {response.status_code}: {error_detail}"
        )

    result = response.json()
    logger.info(
        "Google Business post created: %s for location %s",
        result.get("name", "unknown"), location_name
    )
    return result
