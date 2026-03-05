import logging
import os
import uuid
from fastapi import APIRouter, Depends, UploadFile, File
from pydantic import BaseModel
from typing import Optional
from sqlalchemy.orm import Session
from app.database import get_db
from app.auth.jwt import get_current_client
from app.models.client import Client

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/profile", tags=["profile"])

_BASE = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
LOGOS_DIR = os.path.join(_BASE, "generated", "logos")
os.makedirs(LOGOS_DIR, exist_ok=True)

_ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"}


class ProfileUpdate(BaseModel):
    company_name: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    website: Optional[str] = None


class ProfileResponse(BaseModel):
    id: int
    name: str
    email: str
    company_name: Optional[str]
    phone: Optional[str]
    address: Optional[str]
    website: Optional[str]
    logo_url: Optional[str]

    class Config:
        from_attributes = True


@router.get("", response_model=ProfileResponse)
async def get_profile(
    client: Client = Depends(get_current_client),
):
    return client


@router.put("", response_model=ProfileResponse)
async def update_profile(
    body: ProfileUpdate,
    db: Session = Depends(get_db),
    client: Client = Depends(get_current_client),
):
    if body.company_name is not None:
        client.company_name = body.company_name.strip() or None
    if body.phone is not None:
        client.phone = body.phone.strip() or None
    if body.address is not None:
        client.address = body.address.strip() or None
    if body.website is not None:
        client.website = body.website.strip() or None
    db.commit()
    db.refresh(client)
    return client


@router.post("/logo", response_model=ProfileResponse)
async def upload_logo(
    logo: UploadFile = File(...),
    db: Session = Depends(get_db),
    client: Client = Depends(get_current_client),
):
    """Upload client logo — stored and used in AI-generated banners."""
    if logo.content_type not in _ALLOWED_IMAGE_TYPES:
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail="Only image files are allowed (JPEG, PNG, WebP, GIF)")

    ext = os.path.splitext(logo.filename or "logo.png")[1].lower() or ".png"
    filename = f"client_{client.id}_{uuid.uuid4().hex[:8]}{ext}"
    file_path = os.path.join(LOGOS_DIR, filename)

    content = await logo.read()
    with open(file_path, "wb") as f:
        f.write(content)

    client.logo_url = f"/static/logos/{filename}"
    db.commit()
    db.refresh(client)
    logger.info("Logo uploaded for client %s: %s", client.id, filename)
    return client
