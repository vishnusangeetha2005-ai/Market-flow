import logging
import httpx
from app.models.social_account import SocialAccount

logger = logging.getLogger(__name__)


async def publish_to_facebook(account: SocialAccount, caption: str, image_url: str | None) -> str:
    """Publish a post to Facebook Page. Returns the Facebook post ID."""
    async with httpx.AsyncClient() as client:
        if image_url:
            # Post with image
            response = await client.post(
                f"https://graph.facebook.com/v18.0/{account.account_id}/photos",
                data={
                    "url": image_url,
                    "caption": caption,
                    "access_token": account.access_token,
                }
            )
        else:
            # Text only post
            response = await client.post(
                f"https://graph.facebook.com/v18.0/{account.account_id}/feed",
                data={
                    "message": caption,
                    "access_token": account.access_token,
                }
            )

        result = response.json()
        if "error" in result:
            raise RuntimeError(f"Facebook API error: {result['error'].get('message', 'Unknown error')}")

        post_id = result.get("id") or result.get("post_id", "")
        logger.info("Published to Facebook: %s", post_id)
        return str(post_id)
