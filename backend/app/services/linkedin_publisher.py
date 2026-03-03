import logging
import httpx
import json
from app.models.social_account import SocialAccount

logger = logging.getLogger(__name__)


async def publish_to_linkedin(account: SocialAccount, caption: str, image_url: str | None) -> str:
    """Publish a post to LinkedIn using UGC Posts API."""
    author = f"urn:li:person:{account.account_id}"

    if image_url:
        # Post with image - need to upload image first
        media_asset = await _upload_linkedin_image(account.access_token, image_url)

        payload = {
            "author": author,
            "lifecycleState": "PUBLISHED",
            "specificContent": {
                "com.linkedin.ugc.ShareContent": {
                    "shareCommentary": {"text": caption},
                    "shareMediaCategory": "IMAGE",
                    "media": [
                        {
                            "status": "READY",
                            "media": media_asset,
                        }
                    ],
                }
            },
            "visibility": {"com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC"},
        }
    else:
        payload = {
            "author": author,
            "lifecycleState": "PUBLISHED",
            "specificContent": {
                "com.linkedin.ugc.ShareContent": {
                    "shareCommentary": {"text": caption},
                    "shareMediaCategory": "NONE",
                }
            },
            "visibility": {"com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC"},
        }

    async with httpx.AsyncClient() as client:
        response = await client.post(
            "https://api.linkedin.com/v2/ugcPosts",
            headers={
                "Authorization": f"Bearer {account.access_token}",
                "Content-Type": "application/json",
                "X-Restli-Protocol-Version": "2.0.0",
            },
            content=json.dumps(payload),
        )
        result = response.json()

        if response.status_code not in (200, 201):
            raise RuntimeError(f"LinkedIn API error: {result}")

        post_id = result.get("id", "")
        logger.info("Published to LinkedIn: %s", post_id)
        return str(post_id)


async def _upload_linkedin_image(access_token: str, image_url: str) -> str:
    """Register and upload image to LinkedIn. Returns asset URN."""
    async with httpx.AsyncClient() as client:
        # Register upload
        register_response = await client.post(
            "https://api.linkedin.com/v2/assets?action=registerUpload",
            headers={
                "Authorization": f"Bearer {access_token}",
                "Content-Type": "application/json",
            },
            content=json.dumps({
                "registerUploadRequest": {
                    "recipes": ["urn:li:digitalmediaRecipe:feedshare-image"],
                    "owner": "urn:li:person:me",
                    "serviceRelationships": [
                        {"relationshipType": "OWNER", "identifier": "urn:li:userGeneratedContent"}
                    ],
                }
            }),
        )
        register_data = register_response.json()
        asset = register_data["value"]["asset"]
        upload_url = register_data["value"]["uploadMechanism"][
            "com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest"
        ]["uploadUrl"]

        # Download image and upload to LinkedIn
        img_response = await client.get(image_url)
        await client.put(
            upload_url,
            content=img_response.content,
            headers={"Authorization": f"Bearer {access_token}"},
        )
        return asset
