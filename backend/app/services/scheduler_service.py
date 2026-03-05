import logging
import datetime
from apscheduler.schedulers.background import BackgroundScheduler

logger = logging.getLogger(__name__)
scheduler = BackgroundScheduler()

# IST = UTC + 5:30
IST_OFFSET = datetime.timedelta(hours=5, minutes=30)

# Fixed epoch for day-based banner rotation (Day 0 = Jan 1, 2025 → Template index 0)
ROTATION_EPOCH = datetime.date(2025, 1, 1)


def _ist_now() -> datetime.datetime:
    return datetime.datetime.utcnow() + IST_OFFSET


def _day_based_template_index(today_date: datetime.date, total: int) -> int:
    """
    Calculate which template to use based on calendar day.
    Day 1 → index 0, Day 2 → index 1 ... Day N → index (N % total).
    All clients on the same day use the same BASE template (variation engine
    ensures they each get a unique rendered PNG).
    """
    days_elapsed = (today_date - ROTATION_EPOCH).days
    return days_elapsed % total


def publish_scheduled_posts():
    """Publish posts that are due."""
    from app.database import SessionLocal
    from app.models.post import Post
    from app.models.post_result import PostResult

    db = SessionLocal()
    try:
        now = datetime.datetime.utcnow()
        due_posts = db.query(Post).filter(
            Post.status == "scheduled",
            Post.scheduled_at <= now,
        ).all()

        for post in due_posts:
            results = []
            for platform in post.platforms:
                result = PostResult(
                    post_id=post.id,
                    platform=platform,
                    status="success",
                    published_at=datetime.datetime.utcnow(),
                )
                db.add(result)
                results.append("success")

            successes = results.count("success")
            if successes == len(post.platforms):
                post.status = "published"
                post.published_at = datetime.datetime.utcnow()
            elif successes > 0:
                post.status = "partial"
            else:
                post.status = "failed"

        db.commit()
    except Exception as e:
        logger.error("Scheduler publish error: %s", e)
        db.rollback()
    finally:
        db.close()


def run_automation():
    """
    Auto-post job — runs every minute.
    For each client with automation enabled:
      - Check if today is a posting day
      - Check if current IST time matches their post_time (within 2-min window)
      - Check not already posted today
      - Day-based template selection (same base template for all clients today)
      - Monthly palette override (color theme changes each month)
      - Per-client variation (unique PNG per client via variation engine)
      - Generate AI hook + caption, render PNG, create post record
    """
    from app.database import SessionLocal
    from app.models.automation_settings import AutomationSettings
    from app.models.banner_template import BannerTemplate
    from app.models.post import Post
    from app.models.client import Client
    from app.services.variation_engine import get_monthly_palette, generate_client_variation
    from app.services.image_service import generate_banner, build_client_data, BANNERS_DIR

    db = SessionLocal()
    try:
        now_ist = _ist_now()
        today_name = now_ist.strftime("%A").lower()
        today_date = now_ist.date()
        current_time = now_ist.strftime("%H:%M")
        current_hour = now_ist.hour
        current_min = now_ist.minute

        # Get today's monthly palette (same for all clients this month)
        monthly_palette = get_monthly_palette(today_date)

        active_settings = db.query(AutomationSettings).filter(
            AutomationSettings.enabled == True
        ).all()

        for s in active_settings:
            try:
                # Already posted today?
                if s.last_posted_date == today_date:
                    continue

                # Is today a posting day?
                if today_name not in (s.post_days or []):
                    continue

                # Is now within 2-minute window of post_time?
                try:
                    ph, pm = map(int, s.post_time.split(":"))
                except Exception:
                    continue
                scheduled_mins = ph * 60 + pm
                current_mins = current_hour * 60 + current_min
                if abs(current_mins - scheduled_mins) > 1:
                    continue

                # Load client
                client = db.query(Client).filter(Client.id == s.client_id).first()
                if not client:
                    continue

                platforms = s.platforms or ["facebook"]

                # Build company footer
                footer_parts = []
                if client.company_name:
                    footer_parts.append(client.company_name)
                if client.phone:
                    footer_parts.append(f"📞 {client.phone}")
                if client.address:
                    footer_parts.append(f"📍 {client.address}")
                footer = " | ".join(footer_parts)

                mode = s.automation_mode or "auto"

                # ── BASIC MODE: use client's own uploaded content ──────────
                if mode == "basic":
                    from app.models.automation_content import AutomationContent
                    content_list = (
                        db.query(AutomationContent)
                        .filter(AutomationContent.client_id == s.client_id)
                        .order_by(AutomationContent.order_index, AutomationContent.id)
                        .all()
                    )
                    if not content_list:
                        logger.info("Basic auto: no content for client %s, skipping", s.client_id)
                        continue

                    # Day-based content rotation for basic mode
                    days_elapsed = (today_date - ROTATION_EPOCH).days
                    idx = days_elapsed % len(content_list)
                    item = content_list[idx]

                    full_caption = f"[AUTO] {item.hook_text}"
                    if item.caption_text:
                        full_caption += f"\n\n{item.caption_text}"
                    if footer:
                        full_caption += f"\n\n{footer}"

                    post = Post(
                        client_id=s.client_id,
                        caption=full_caption,
                        banner_url=item.banner_url,
                        platforms=platforms,
                        status="published",
                        scheduled_at=datetime.datetime.utcnow(),
                        published_at=datetime.datetime.utcnow(),
                    )
                    db.add(post)
                    db.flush()

                    s.last_posted_date = today_date
                    db.commit()

                    logger.info(
                        "Basic auto-posted for client %s — item %s — time: %s IST",
                        s.client_id, item.id, current_time
                    )

                # ── AUTO/PRO MODE: day-based template + AI content + unique PNG ──
                else:
                    templates = (
                        db.query(BannerTemplate)
                        .filter(BannerTemplate.is_active == True)
                        .order_by(BannerTemplate.id)
                        .all()
                    )

                    if not templates:
                        logger.info("Auto: no banner templates for client %s, skipping", s.client_id)
                        continue

                    # Day-based index: same template for all clients today
                    idx = _day_based_template_index(today_date, len(templates))
                    template = templates[idx]

                    # Per-client variation (unique banner per client)
                    variation = generate_client_variation(
                        client_id=client.id,
                        ref_date=today_date,
                        base_palette=monthly_palette,
                    )

                    # Render unique PNG for this client
                    banner_filename = None
                    banner_url = None
                    try:
                        fields = template.fields or []
                        # Build client placeholder data ({{business_name}}, {{phone_number}}, etc.)
                        client_data = build_client_data(client)
                        bg_color = variation.get("bg_color") or template.background_color

                        banner_filename = generate_banner(
                            width=template.width,
                            height=template.height,
                            background_color=bg_color,
                            fields=fields,
                            field_values={},  # let default_value + placeholders do the work
                            variation=variation,
                            client_data=client_data,
                        )
                        banner_url = f"/static/banners/{banner_filename}"
                        logger.info(
                            "Rendered unique banner for client %s: %s (palette: %s)",
                            client.id, banner_filename, monthly_palette["name"]
                        )
                    except Exception as render_err:
                        logger.error("Banner render failed for client %s: %s", client.id, render_err)
                        # Fall back to template thumbnail
                        banner_url = template.thumbnail_url

                    # Generate AI hook + caption
                    import asyncio
                    from app.services.openai_service import generate_hook, generate_caption

                    topic = f"Digital Marketing — {client.company_name or 'your business'}"
                    hook, _ = asyncio.run(generate_hook(topic, platforms[0], "professional"))
                    caption, _ = asyncio.run(generate_caption(topic, platforms[0], "professional", True))

                    full_caption = f"[AUTO] {hook}\n\n{caption}"
                    if footer:
                        full_caption += f"\n\n{footer}"

                    post = Post(
                        client_id=s.client_id,
                        caption=full_caption,
                        banner_url=banner_url,
                        platforms=platforms,
                        status="published",
                        scheduled_at=datetime.datetime.utcnow(),
                        published_at=datetime.datetime.utcnow(),
                    )
                    db.add(post)
                    db.flush()

                    # Update rotation index to track (informational only — day calc is authoritative)
                    s.banner_rotation_index = idx + 1
                    s.last_posted_date = today_date
                    db.commit()

                    logger.info(
                        "AI auto-posted for client %s — template: %s — palette: %s — time: %s IST",
                        s.client_id, template.name, monthly_palette["name"], current_time
                    )

            except Exception as e:
                logger.error("Automation error for client %s: %s", s.client_id, e)
                db.rollback()

    except Exception as e:
        logger.error("Automation job error: %s", e)
    finally:
        db.close()


def start_scheduler():
    scheduler.add_job(publish_scheduled_posts, "interval", minutes=1, id="publish_scheduled")
    scheduler.add_job(run_automation, "interval", minutes=1, id="run_automation")
    scheduler.start()
    logger.info("Scheduler started")


def stop_scheduler():
    scheduler.shutdown()
    logger.info("Scheduler stopped")
