from __future__ import annotations

import logging
from typing import Any

from sqlalchemy import func
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)


def get_stats(db: Session, user_id: int) -> dict[str, Any]:
    """Return aggregated dashboard statistics for the given user.

    Counts are grouped by:
    - Post status  (draft / scheduled / published / failed)
    - Platform     (instagram / facebook / linkedin / twitter / …)

    Also returns the total number of AI-generated content items.

    Models are imported locally to avoid circular imports until all modules
    are wired up in Phase 2.
    """
    from app.models.generated_content import GeneratedContent  # noqa: PLC0415
    from app.models.post import Post  # noqa: PLC0415

    logger.info("Fetching dashboard stats for user_id=%s", user_id)

    # --- posts by status ---------------------------------------------------
    status_rows = (
        db.query(Post.status, func.count(Post.id).label("count"))
        .filter(Post.user_id == user_id)
        .group_by(Post.status)
        .all()
    )
    posts_by_status: dict[str, int] = {row.status: row.count for row in status_rows}

    # Ensure all known statuses are present even when count is zero
    for known_status in ("draft", "scheduled", "published", "failed"):
        posts_by_status.setdefault(known_status, 0)

    # --- posts by platform -------------------------------------------------
    platform_rows = (
        db.query(Post.platform, func.count(Post.id).label("count"))
        .filter(Post.user_id == user_id)
        .group_by(Post.platform)
        .all()
    )
    posts_by_platform: dict[str, int] = {row.platform: row.count for row in platform_rows}

    # --- total posts -------------------------------------------------------
    total_posts: int = sum(posts_by_status.values())

    # --- generated content count -------------------------------------------
    generated_content_count: int = (
        db.query(func.count(GeneratedContent.id))
        .filter(GeneratedContent.user_id == user_id)
        .scalar()
        or 0
    )

    stats: dict[str, Any] = {
        "total_posts": total_posts,
        "posts_by_status": posts_by_status,
        "posts_by_platform": posts_by_platform,
        "generated_content_count": generated_content_count,
    }

    logger.debug("Dashboard stats for user_id=%s: %s", user_id, stats)
    return stats
