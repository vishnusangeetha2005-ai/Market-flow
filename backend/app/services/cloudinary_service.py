import logging
import cloudinary
import cloudinary.uploader
from app.config import settings

logger = logging.getLogger(__name__)

# Configure Cloudinary from URL
cloudinary.config(cloud_url=settings.CLOUDINARY_URL)


async def upload_image_from_url(image_url: str, folder: str = "socialflow/banners") -> str:
    """Upload an image from URL to Cloudinary. Returns the Cloudinary URL."""
    logger.info("Uploading image to Cloudinary from: %s...", image_url[:50])
    result = cloudinary.uploader.upload(
        image_url,
        folder=folder,
        resource_type="image",
    )
    logger.info("Uploaded to Cloudinary: %s", result["secure_url"])
    return result["secure_url"]


async def delete_image(public_id: str) -> None:
    """Delete image from Cloudinary."""
    cloudinary.uploader.destroy(public_id)
