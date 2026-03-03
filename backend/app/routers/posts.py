import logging
import datetime
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.auth.jwt import get_current_client
from app.models.client import Client
from app.models.post import Post
from app.models.post_result import PostResult
from app.schemas.post import PostCreate, PostUpdate, ScheduleRequest, PostResponse

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/posts", tags=["posts"])


async def publish_to_platforms(post: Post, platforms: list[str], db: Session):
    """Attempt to publish post to each platform and record results."""
    results = []
    for platform in platforms:
        try:
            # In production: call actual social API
            # For now: simulate success
            result = PostResult(
                post_id=post.id,
                platform=platform,
                status="success",
                published_at=datetime.datetime.utcnow(),
            )
            db.add(result)
            results.append(("success", platform))
        except Exception as e:
            result = PostResult(
                post_id=post.id,
                platform=platform,
                status="failed",
                error_message=str(e),
            )
            db.add(result)
            results.append(("failed", platform))

    successes = sum(1 for r in results if r[0] == "success")
    if successes == len(platforms):
        post.status = "published"
        post.published_at = datetime.datetime.utcnow()
    elif successes > 0:
        post.status = "partial"
    else:
        post.status = "failed"
    db.commit()


@router.get("", response_model=list[PostResponse])
async def list_posts(
    status_filter: str = Query(None, alias="status"),
    db: Session = Depends(get_db),
    client: Client = Depends(get_current_client),
):
    query = db.query(Post).filter(Post.client_id == client.id)
    if status_filter:
        query = query.filter(Post.status == status_filter)
    return query.order_by(Post.created_at.desc()).all()


@router.post("", response_model=PostResponse, status_code=201)
async def create_post(
    body: PostCreate,
    db: Session = Depends(get_db),
    client: Client = Depends(get_current_client),
):
    post = Post(
        client_id=client.id,
        caption=body.caption,
        banner_url=body.banner_url,
        platforms=body.platforms,
        status="draft",
    )
    db.add(post)
    db.commit()
    db.refresh(post)
    return post


@router.get("/{post_id}", response_model=PostResponse)
async def get_post(
    post_id: int,
    db: Session = Depends(get_db),
    client: Client = Depends(get_current_client),
):
    post = db.query(Post).filter(Post.id == post_id, Post.client_id == client.id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    return post


@router.put("/{post_id}", response_model=PostResponse)
async def update_post(
    post_id: int,
    body: PostUpdate,
    db: Session = Depends(get_db),
    client: Client = Depends(get_current_client),
):
    post = db.query(Post).filter(Post.id == post_id, Post.client_id == client.id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    if post.status not in ("draft",):
        raise HTTPException(status_code=400, detail="Can only edit draft posts")
    if body.caption:
        post.caption = body.caption
    if body.banner_url is not None:
        post.banner_url = body.banner_url
    if body.platforms:
        post.platforms = body.platforms
    db.commit()
    db.refresh(post)
    return post


@router.delete("/{post_id}", status_code=204)
async def delete_post(
    post_id: int,
    db: Session = Depends(get_db),
    client: Client = Depends(get_current_client),
):
    post = db.query(Post).filter(Post.id == post_id, Post.client_id == client.id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    db.delete(post)
    db.commit()


@router.post("/{post_id}/publish")
async def publish_post(
    post_id: int,
    db: Session = Depends(get_db),
    client: Client = Depends(get_current_client),
):
    post = db.query(Post).filter(Post.id == post_id, Post.client_id == client.id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    if post.status == "published":
        raise HTTPException(status_code=400, detail="Post already published")
    await publish_to_platforms(post, post.platforms, db)
    db.refresh(post)
    return {"message": "Published", "status": post.status}


@router.post("/{post_id}/schedule")
async def schedule_post(
    post_id: int,
    body: ScheduleRequest,
    db: Session = Depends(get_db),
    client: Client = Depends(get_current_client),
):
    post = db.query(Post).filter(Post.id == post_id, Post.client_id == client.id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    if body.scheduled_at <= datetime.datetime.utcnow():
        raise HTTPException(status_code=400, detail="Scheduled time must be in the future")
    post.status = "scheduled"
    post.scheduled_at = body.scheduled_at
    db.commit()
    return {"message": "Post scheduled", "scheduled_at": body.scheduled_at}


@router.post("/{post_id}/retry")
async def retry_post(
    post_id: int,
    db: Session = Depends(get_db),
    client: Client = Depends(get_current_client),
):
    post = db.query(Post).filter(Post.id == post_id, Post.client_id == client.id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    failed_platforms = [
        r.platform for r in post.results if r.status == "failed"
    ]
    if not failed_platforms:
        raise HTTPException(status_code=400, detail="No failed platforms to retry")
    await publish_to_platforms(post, failed_platforms, db)
    db.refresh(post)
    return {"message": "Retry attempted", "status": post.status}


@router.get("/{post_id}/results")
async def get_post_results(
    post_id: int,
    db: Session = Depends(get_db),
    client: Client = Depends(get_current_client),
):
    post = db.query(Post).filter(Post.id == post_id, Post.client_id == client.id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    return post.results
