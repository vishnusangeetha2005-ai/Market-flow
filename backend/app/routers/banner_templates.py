import logging
import os
import uuid
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from app.database import get_db
from app.auth.jwt import get_current_owner
from app.models.banner_template import BannerTemplate
from app.schemas.banner import BannerTemplateResponse

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/banner-templates", tags=["banner-templates"])

_BASE = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "generated", "templates"))
os.makedirs(_BASE, exist_ok=True)


@router.get("", response_model=list[BannerTemplateResponse])
async def list_templates(
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_owner),
):
    return db.query(BannerTemplate).filter(BannerTemplate.is_active == True).order_by(BannerTemplate.id).all()


@router.post("", response_model=BannerTemplateResponse, status_code=201)
async def create_template(
    image: UploadFile = File(...),
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_owner),
):
    ext = os.path.splitext(image.filename)[1].lower() if image.filename else ".png"
    filename = f"{uuid.uuid4().hex}{ext}"
    file_path = os.path.join(_BASE, filename)
    content = await image.read()
    with open(file_path, "wb") as f:
        f.write(content)

    # Use original filename (without extension) as the name
    original_name = os.path.splitext(image.filename)[0] if image.filename else filename
    template = BannerTemplate(
        name=original_name,
        thumbnail_url=f"/static/templates/{filename}",
        width=1080,
        height=1080,
        background_color="#1a1a2e",
        fields=[],
        is_active=True,
    )
    db.add(template)
    db.commit()
    db.refresh(template)
    return template


@router.delete("/{template_id}", status_code=204)
async def delete_template(
    template_id: int,
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_owner),
):
    template = db.query(BannerTemplate).filter(BannerTemplate.id == template_id).first()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    template.is_active = False
    db.commit()
