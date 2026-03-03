import logging
import httpx
from app.models.social_account import SocialAccount

logger = logging.getLogger(__name__)


async def publish_to_instagram(account: SocialAccount, caption: str, image_url: str | None) -> str:
    """Publish a post to Instagram Business Account using Graph API."""
    if not image_url:
        raise ValueError("Instagram requires an image for posting")

    async with httpx.AsyncClient() as client:
        # Step 1: Create media container
        container_response = await client.post(
            f"https://graph.facebook.com/v18.0/{account.account_id}/media",
            data={
                "image_url": image_url,
                "caption": caption,
                "access_token": account.access_token,
            }
        )
        container_data = container_response.json()

        if "error" in container_data:
            raise RuntimeError(f"Instagram container error: {container_data['error'].get('message')}")

        container_id = container_data.get("id")

        # Step 2: Publish the container
        publish_response = await client.post(
            f"https://graph.facebook.com/v18.0/{account.account_id}/media_publish",
            data={
                "creation_id": container_id,
                "access_token": account.access_token,
            }
        )
        publish_data = publish_response.json()

        if "error" in publish_data:
            raise RuntimeError(f"Instagram publish error: {publish_data['error'].get('message')}")

        post_id = publish_data.get("id", "")
        logger.info("Published to Instagram: %s", post_id)
        return str(post_id)
