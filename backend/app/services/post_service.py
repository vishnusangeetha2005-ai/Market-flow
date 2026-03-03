import logging
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from app.models.post import Post, PostStatusEnum
from app.models.post_result import PostResult
from app.models.social_account import SocialAccount, PlatformEnum
from app.exceptions import NotFoundError, ForbiddenError, ValidationError
from app.services.facebook_publisher import publish_to_facebook
from app.services.instagram_publisher import publish_to_instagram
from app.services.linkedin_publisher import publish_to_linkedin

logger = logging.getLogger(__name__)


def get_posts(db: Session, user_id: int, status: str | None = None, skip: int = 0, limit: int = 50) -> list[Post]:
    query = db.query(Post).filter(Post.user_id == user_id)
    if status:
        query = query.filter(Post.status == PostStatusEnum(status))
    return query.order_by(Post.created_at.desc()).offset(skip).limit(limit).all()


def get_post(db: Session, post_id: int, user_id: int) -> Post:
    post = db.query(Post).filter(Post.id == post_id, Post.user_id == user_id).first()
    if not post:
        raise NotFoundError("Post")
    return post


def create_post(db: Session, user_id: int, title: str, caption: str, banner_url: str | None, platforms: list[str]) -> Post:
    post = Post(
        user_id=user_id,
        title=title,
        caption=caption,
        banner_url=banner_url,
        platforms=platforms,
        status=PostStatusEnum.draft,
    )
    db.add(post)
    db.commit()
    db.refresh(post)
    logger.info("Created post %s for user %s", post.id, user_id)
    return post


def update_post(db: Session, post_id: int, user_id: int, **kwargs) -> Post:
    post = get_post(db, post_id, user_id)
    for key, value in kwargs.items():
        if value is not None:
            setattr(post, key, value)
    db.commit()
    db.refresh(post)
    return post


def delete_post(db: Session, post_id: int, user_id: int) -> None:
    post = get_post(db, post_id, user_id)
    db.delete(post)
    db.commit()


def schedule_post(db: Session, post_id: int, user_id: int, scheduled_at: datetime) -> Post:
    post = get_post(db, post_id, user_id)
    post.status = PostStatusEnum.scheduled
    post.scheduled_at = scheduled_at
    db.commit()
    db.refresh(post)
    logger.info("Scheduled post %s for %s", post_id, scheduled_at)
    return post


async def publish_post_now(db: Session, post_id: int, user_id: int) -> Post:
    """Publish post immediately to all selected platforms."""
    post = get_post(db, post_id, user_id)

    results = []
    any_success = False

    for platform_str in post.platforms:
        platform = PlatformEnum(platform_str)
        account = db.query(SocialAccount).filter(
            SocialAccount.user_id == user_id,
            SocialAccount.platform == platform,
            SocialAccount.is_active == True,
        ).first()

        if not account:
            result = PostResult(
                post_id=post.id,
                platform=platform_str,
                status="failed",
                error_message=f"No connected {platform_str} account found",
            )
            results.append(result)
            continue

        try:
            if platform == PlatformEnum.facebook:
                platform_post_id = await publish_to_facebook(account, post.caption, post.banner_url)
            elif platform == PlatformEnum.instagram:
                platform_post_id = await publish_to_instagram(account, post.caption, post.banner_url)
            elif platform == PlatformEnum.linkedin:
                platform_post_id = await publish_to_linkedin(account, post.caption, post.banner_url)
            else:
                raise ValidationError(f"Unsupported platform: {platform_str}")

            result = PostResult(
                post_id=post.id,
                platform=platform_str,
                platform_post_id=platform_post_id,
                status="success",
                published_at=datetime.now(timezone.utc),
            )
            any_success = True
            logger.info("Published post %s to %s", post_id, platform_str)
        except Exception as e:
            logger.error("Failed to publish post %s to %s: %s", post_id, platform_str, e)
            result = PostResult(
                post_id=post.id,
                platform=platform_str,
                status="failed",
                error_message=str(e),
            )
        results.append(result)

    for result in results:
        db.add(result)

    post.status = PostStatusEnum.published if any_success else PostStatusEnum.failed
    post.published_at = datetime.now(timezone.utc) if any_success else None
    db.commit()
    db.refresh(post)
    return post


def get_post_results(db: Session, post_id: int, user_id: int) -> list[PostResult]:
    post = get_post(db, post_id, user_id)
    return db.query(PostResult).filter(PostResult.post_id == post.id).all()
