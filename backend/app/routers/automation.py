import logging
import os
import uuid
import shutil
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from pydantic import BaseModel
from typing import Optional
import datetime
from sqlalchemy import func
from sqlalchemy.orm import Session
from app.database import get_db
from app.auth.jwt import get_current_client
from app.models.client import Client
from app.models.automation_settings import AutomationSettings
from app.models.automation_content import AutomationContent
from app.models.post import Post

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/automation", tags=["automation"])

_BASE = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
BANNERS_DIR = os.path.join(_BASE, "generated", "banners")


# ── Schemas ──────────────────────────────────────────────────────────────────

class AutomationUpdate(BaseModel):
    enabled: Optional[bool] = None
    post_time: Optional[str] = None
    post_days: Optional[list[str]] = None
    platforms: Optional[list[str]] = None
    automation_mode: Optional[str] = None   # "basic" | "auto"


class AutomationResponse(BaseModel):
    enabled: bool
    post_time: str
    post_days: list
    platforms: list
    automation_mode: str
    banner_rotation_index: int
    content_rotation_index: int
    last_posted_date: Optional[datetime.date]
    total_auto_posts: int
    next_post_day: Optional[str]
    content_count: int

    class Config:
        from_attributes = True


class AutomationContentResponse(BaseModel):
    id: int
    client_id: int
    banner_url: Optional[str]
    hook_text: str
    caption_text: Optional[str]
    order_index: int
    created_at: datetime.datetime

    class Config:
        from_attributes = True


# ── Helpers ───────────────────────────────────────────────────────────────────

def _get_or_create(db: Session, client: Client) -> AutomationSettings:
    s = db.query(AutomationSettings).filter(AutomationSettings.client_id == client.id).first()
    if not s:
        s = AutomationSettings(client_id=client.id)
        db.add(s)
        db.commit()
        db.refresh(s)
    return s


def _next_post_day(settings: AutomationSettings) -> Optional[str]:
    if not settings.enabled or not settings.post_days:
        return None
    days_order = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]
    today_idx = datetime.datetime.utcnow().weekday()
    for i in range(7):
        day_name = days_order[(today_idx + i) % 7]
        if day_name in settings.post_days:
            return day_name.capitalize()
    return None


def _build_response(s: AutomationSettings, db: Session, client: Client) -> AutomationResponse:
    total = db.query(Post).filter(
        Post.client_id == client.id,
        Post.caption.like("%[AUTO]%"),
    ).count()
    content_count = db.query(AutomationContent).filter(
        AutomationContent.client_id == client.id
    ).count()
    return AutomationResponse(
        enabled=s.enabled,
        post_time=s.post_time,
        post_days=s.post_days or [],
        platforms=s.platforms or [],
        automation_mode=s.automation_mode or "auto",
        banner_rotation_index=s.banner_rotation_index,
        content_rotation_index=s.content_rotation_index or 0,
        last_posted_date=s.last_posted_date,
        total_auto_posts=total,
        next_post_day=_next_post_day(s),
        content_count=content_count,
    )


# ── Automation settings endpoints ─────────────────────────────────────────────

@router.get("", response_model=AutomationResponse)
async def get_automation(
    db: Session = Depends(get_db),
    client: Client = Depends(get_current_client),
):
    s = _get_or_create(db, client)
    return _build_response(s, db, client)


@router.put("", response_model=AutomationResponse)
async def update_automation(
    body: AutomationUpdate,
    db: Session = Depends(get_db),
    client: Client = Depends(get_current_client),
):
    s = _get_or_create(db, client)
    if body.enabled is not None:
        s.enabled = body.enabled
    if body.post_time is not None:
        s.post_time = body.post_time
    if body.post_days is not None:
        s.post_days = body.post_days
    if body.platforms is not None:
        s.platforms = body.platforms
    if body.automation_mode is not None:
        s.automation_mode = body.automation_mode
    db.commit()
    db.refresh(s)
    return _build_response(s, db, client)


# ── Content management endpoints (Basic Plan) ─────────────────────────────────

@router.get("/content", response_model=list[AutomationContentResponse])
async def list_content(
    db: Session = Depends(get_db),
    client: Client = Depends(get_current_client),
):
    return (
        db.query(AutomationContent)
        .filter(AutomationContent.client_id == client.id)
        .order_by(AutomationContent.order_index, AutomationContent.id)
        .all()
    )


@router.post("/content", response_model=AutomationContentResponse, status_code=201)
async def add_content(
    hook_text: str = Form(...),
    caption_text: Optional[str] = Form(None),
    banner: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    client: Client = Depends(get_current_client),
):
    banner_url = None
    if banner and banner.filename:
        allowed = {"image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"}
        if banner.content_type not in allowed:
            raise HTTPException(status_code=400, detail="Only image files allowed")
        ext = (banner.filename).rsplit(".", 1)[-1].lower()
        filename = f"{uuid.uuid4()}.{ext}"
        os.makedirs(BANNERS_DIR, exist_ok=True)
        with open(os.path.join(BANNERS_DIR, filename), "wb") as f:
            shutil.copyfileobj(banner.file, f)
        banner_url = f"/static/banners/{filename}"

    max_order = db.query(func.max(AutomationContent.order_index)).filter(
        AutomationContent.client_id == client.id
    ).scalar() or 0

    content = AutomationContent(
        client_id=client.id,
        banner_url=banner_url,
        hook_text=hook_text,
        caption_text=caption_text,
        order_index=max_order + 1,
    )
    db.add(content)
    db.commit()
    db.refresh(content)
    return content


@router.delete("/content/{content_id}", status_code=204)
async def delete_content(
    content_id: int,
    db: Session = Depends(get_db),
    client: Client = Depends(get_current_client),
):
    item = (
        db.query(AutomationContent)
        .filter(AutomationContent.id == content_id, AutomationContent.client_id == client.id)
        .first()
    )
    if not item:
        raise HTTPException(status_code=404, detail="Content not found")
    db.delete(item)
    db.commit()
