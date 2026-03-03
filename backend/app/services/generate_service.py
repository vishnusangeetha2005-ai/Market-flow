import logging
from sqlalchemy.orm import Session
from app.exceptions import NotFoundError
from app.models.generated_content import GeneratedContent, ContentTypeEnum, ContentPlatformEnum
from app.services.openai_service import generate_banner_image, generate_hook_text, generate_caption_text
from app.services.cloudinary_service import upload_image_from_url

logger = logging.getLogger(__name__)


async def create_banner(
    db: Session,
    user_id: int,
    topic: str,
    brand_name: str,
    style: str,
    platform: str,
) -> GeneratedContent:
    """Generate banner image and save to DB."""
    logger.info("Creating banner for user %s: %s", user_id, topic)

    # Generate via DALL-E 3
    dall_e_url = await generate_banner_image(topic, brand_name, style, platform)

    # Upload to Cloudinary for permanent storage
    cloudinary_url = await upload_image_from_url(dall_e_url)

    prompt = f"Banner for '{brand_name}' - Topic: {topic} - Style: {style} - Platform: {platform}"

    content = GeneratedContent(
        user_id=user_id,
        type=ContentTypeEnum.banner,
        prompt=prompt,
        result_url=cloudinary_url,
        platform=ContentPlatformEnum(platform),
    )
    db.add(content)
    db.commit()
    db.refresh(content)
    return content


async def create_hook(
    db: Session,
    user_id: int,
    topic: str,
    platform: str,
    tone: str,
    include_cta: bool,
) -> GeneratedContent:
    """Generate hook text and save to DB."""
    logger.info("Creating hook for user %s: %s", user_id, topic)

    hook_text = await generate_hook_text(topic, platform, tone, include_cta)

    prompt = f"Hook - Topic: {topic} - Platform: {platform} - Tone: {tone}"

    content = GeneratedContent(
        user_id=user_id,
        type=ContentTypeEnum.hook,
        prompt=prompt,
        result_text=hook_text,
        platform=ContentPlatformEnum(platform),
    )
    db.add(content)
    db.commit()
    db.refresh(content)
    return content


async def create_caption(
    db: Session,
    user_id: int,
    topic: str,
    platform: str,
    tone: str,
    include_hashtags: bool,
    include_cta: bool,
) -> GeneratedContent:
    """Generate full caption and save to DB."""
    logger.info("Creating caption for user %s: %s", user_id, topic)

    caption_text = await generate_caption_text(topic, platform, tone, include_hashtags, include_cta)

    prompt = f"Caption - Topic: {topic} - Platform: {platform} - Tone: {tone}"

    content = GeneratedContent(
        user_id=user_id,
        type=ContentTypeEnum.caption,
        prompt=prompt,
        result_text=caption_text,
        platform=ContentPlatformEnum(platform),
    )
    db.add(content)
    db.commit()
    db.refresh(content)
    return content


def get_history(db: Session, user_id: int, skip: int = 0, limit: int = 50) -> list[GeneratedContent]:
    """Get generated content history for user."""
    return (
        db.query(GeneratedContent)
        .filter(GeneratedContent.user_id == user_id)
        .order_by(GeneratedContent.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )


def delete_content(db: Session, content_id: int, user_id: int) -> None:
    """Delete generated content."""
    content = db.query(GeneratedContent).filter(
        GeneratedContent.id == content_id,
        GeneratedContent.user_id == user_id,
    ).first()
    if not content:
        raise NotFoundError("GeneratedContent")
    db.delete(content)
    db.commit()
