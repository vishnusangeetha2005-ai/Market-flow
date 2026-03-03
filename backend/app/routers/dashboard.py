import logging
import datetime
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.auth.jwt import get_current_owner, get_current_client
from app.models.client import Client
from app.models.subscription import Subscription
from app.models.plan import Plan
from app.models.generated_content import GeneratedContent
from app.models.banner import Banner
from app.models.post import Post
from app.schemas.dashboard import OwnerStatsResponse, ClientStatsResponse, RevenueDataPoint

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/owner-stats", response_model=OwnerStatsResponse)
async def owner_stats(
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_owner),
):
    clients = db.query(Client).all()
    total = len(clients)
    active = sum(1 for c in clients if c.status == "active" and not c.account_locked)
    suspended = sum(1 for c in clients if c.status == "suspended")
    locked = sum(1 for c in clients if c.account_locked)

    # Revenue from paid subscriptions
    subs = db.query(Subscription).all()
    total_revenue = 0.0
    monthly_revenue = 0.0
    now = datetime.date.today()
    for s in subs:
        plan = db.query(Plan).filter(Plan.id == s.plan_id).first()
        if plan and s.payment_status == "paid":
            total_revenue += float(plan.price)
            if s.end_date >= now and s.start_date.month == now.month:
                monthly_revenue += float(plan.price)

    tokens_used = sum(gc.tokens_used for gc in db.query(GeneratedContent).all())
    scheduled = db.query(Post).filter(Post.status == "scheduled").count()
    failed = db.query(Post).filter(Post.status == "failed").count()
    banners = db.query(Banner).count()

    # Revenue chart — real last 6 months
    import calendar
    today = datetime.date.today()
    revenue_chart = []
    for i in range(5, -1, -1):
        m = today.month - i
        y = today.year
        while m <= 0:
            m += 12
            y -= 1
        month_rev = 0.0
        for s in subs:
            if s.payment_status == "paid" and s.start_date.year == y and s.start_date.month == m:
                plan = db.query(Plan).filter(Plan.id == s.plan_id).first()
                if plan:
                    month_rev += float(plan.price)
        revenue_chart.append(RevenueDataPoint(month=calendar.month_abbr[m], revenue=month_rev))

    # Subscription breakdown
    sub_breakdown: dict = {}
    for s in subs:
        plan = db.query(Plan).filter(Plan.id == s.plan_id).first()
        if plan:
            sub_breakdown[plan.name] = sub_breakdown.get(plan.name, 0) + 1

    return OwnerStatsResponse(
        total_clients=total,
        active_clients=active,
        suspended_clients=suspended,
        locked_clients=locked,
        total_revenue=total_revenue,
        monthly_revenue=monthly_revenue,
        total_ai_tokens_used=tokens_used,
        scheduled_posts=scheduled,
        failed_posts=failed,
        total_banners=banners,
        revenue_chart=revenue_chart,
        subscription_breakdown=sub_breakdown,
    )


@router.get("/client-stats", response_model=ClientStatsResponse)
async def client_stats(
    db: Session = Depends(get_db),
    client: Client = Depends(get_current_client),
):
    published = db.query(Post).filter(Post.client_id == client.id, Post.status == "published").count()
    scheduled = db.query(Post).filter(Post.client_id == client.id, Post.status == "scheduled").count()
    failed = db.query(Post).filter(Post.client_id == client.id, Post.status == "failed").count()
    banners = db.query(Banner).filter(Banner.client_id == client.id).count()

    now = datetime.datetime.utcnow()
    start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    tokens_used = sum(
        gc.tokens_used
        for gc in db.query(GeneratedContent).filter(
            GeneratedContent.client_id == client.id,
            GeneratedContent.created_at >= start,
        ).all()
    )

    plan_name = "No Plan"
    token_limit = 0
    sub_status = "none"
    sub_end = None

    if client.subscription:
        sub_status = client.subscription.status
        sub_end = str(client.subscription.end_date)
        if client.subscription.plan:
            plan_name = client.subscription.plan.name
            token_limit = client.subscription.plan.ai_token_limit

    return ClientStatsResponse(
        posts_published=published,
        posts_scheduled=scheduled,
        posts_failed=failed,
        banners_generated=banners,
        tokens_used=tokens_used,
        tokens_limit=token_limit,
        plan_name=plan_name,
        subscription_status=sub_status,
        subscription_end_date=sub_end,
    )


@router.get("/social-monitor")
async def social_monitor(
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_owner),
):
    """Return recent auto-posts across all clients for social monitor page."""
    from app.models.automation_settings import AutomationSettings
    from app.models.client_social_token import ClientSocialToken
    from app.models.post_result import PostResult

    # Recent 50 auto posts across all clients
    recent_posts = (
        db.query(Post)
        .filter(Post.caption.like("%[AUTO]%"))
        .order_by(Post.created_at.desc())
        .limit(50)
        .all()
    )

    posts_data = []
    for p in recent_posts:
        client = db.query(Client).filter(Client.id == p.client_id).first()
        results = db.query(PostResult).filter(PostResult.post_id == p.id).all()
        posts_data.append({
            "id": p.id,
            "client_name": client.name if client else "Unknown",
            "client_id": p.client_id,
            "caption_preview": p.caption[:100] + "..." if len(p.caption) > 100 else p.caption,
            "platforms": p.platforms,
            "status": p.status,
            "published_at": p.published_at.isoformat() if p.published_at else None,
            "created_at": p.created_at.isoformat(),
            "results": [{"platform": r.platform, "status": r.status} for r in results],
        })

    # Automation overview per client
    all_settings = db.query(AutomationSettings).all()
    automation_data = []
    for s in all_settings:
        client = db.query(Client).filter(Client.id == s.client_id).first()
        if not client:
            continue
        connected_platforms = (
            db.query(ClientSocialToken)
            .filter(ClientSocialToken.client_id == s.client_id, ClientSocialToken.is_active == True)
            .all()
        )
        total_auto = db.query(Post).filter(
            Post.client_id == s.client_id,
            Post.caption.like("%[AUTO]%"),
        ).count()
        automation_data.append({
            "client_id": s.client_id,
            "client_name": client.name,
            "enabled": s.enabled,
            "mode": s.automation_mode or "auto",
            "post_time": s.post_time,
            "last_posted_date": s.last_posted_date.isoformat() if s.last_posted_date else None,
            "total_auto_posts": total_auto,
            "connected_platforms": [t.platform for t in connected_platforms],
        })

    return {
        "recent_posts": posts_data,
        "automation_overview": automation_data,
        "total_auto_posts": len(recent_posts),
        "active_automations": sum(1 for s in all_settings if s.enabled),
    }


@router.get("/revenue")
async def revenue_chart(
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_owner),
):
    # Return monthly revenue for last 12 months
    import calendar
    now = datetime.date.today()
    result = []
    for i in range(11, -1, -1):
        month = now.month - i
        year = now.year
        while month <= 0:
            month += 12
            year -= 1
        month_name = calendar.month_abbr[month]
        subs = db.query(Subscription).filter(
            Subscription.payment_status == "paid"
        ).all()
        revenue = 0.0
        for s in subs:
            if s.start_date.year == year and s.start_date.month == month:
                plan = db.query(Plan).filter(Plan.id == s.plan_id).first()
                if plan:
                    revenue += float(plan.price)
        result.append({"month": f"{month_name} {year}", "revenue": revenue})
    return result
