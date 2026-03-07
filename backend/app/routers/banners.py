import logging
import os
import uuid
import shutil
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from fastapi.responses import Response
from sqlalchemy.orm import Session
from app.database import get_db
from app.auth.jwt import get_current_client
from app.models.client import Client
from app.models.banner import Banner
from app.models.banner_template import BannerTemplate
from app.schemas.banner import BannerGenerateRequest, BannerResponse, BannerTemplateResponse
from app.services.image_service import generate_banner, generate_banner_bytes, build_client_data

_BASE = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
BANNERS_DIR = os.path.join(_BASE, "generated", "banners")

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/banners", tags=["banners"])


def _banner_limit(client: Client) -> int:
    if client.subscription and client.subscription.plan:
        return client.subscription.plan.banner_limit
    return 0


@router.post("/generate", response_model=BannerResponse, status_code=201)
async def generate_banner_endpoint(
    body: BannerGenerateRequest,
    db: Session = Depends(get_db),
    client: Client = Depends(get_current_client),
):
    # Check banner limit
    limit = _banner_limit(client)
    if limit != -1:
        count = db.query(Banner).filter(Banner.client_id == client.id).count()
        if count >= limit:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Banner limit reached ({limit}). Upgrade your plan.",
            )

    # Load template
    template = (
        db.query(BannerTemplate)
        .filter(BannerTemplate.id == body.template_id, BannerTemplate.is_active == True)
        .first()
    )
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")

    # Validate that all required fields are provided
    required_fields = [f.get("name") for f in (template.fields or [])]
    missing = [f for f in required_fields if f and f not in body.field_values]
    if missing:
        raise HTTPException(
            status_code=400,
            detail=f"Missing field values: {', '.join(missing)}",
        )

    # Generate PNG bytes with Pillow
    client_data = build_client_data(client)
    image_bytes = generate_banner_bytes(
        width=template.width,
        height=template.height,
        background_color=template.background_color,
        fields=template.fields or [],
        field_values=body.field_values,
        background_image_path=None,
        client_data=client_data,
        logo_bytes=client.logo_data,
    )

    banner = Banner(
        client_id=client.id,
        template_id=body.template_id,
        field_values=body.field_values,
        result_url="",
        image_data=image_bytes,
    )
    db.add(banner)
    db.commit()
    db.refresh(banner)
    banner.result_url = f"/api/v1/banners/{banner.id}/image"
    db.commit()
    db.refresh(banner)
    return banner


@router.get("", response_model=list[BannerResponse])
async def list_banners(
    db: Session = Depends(get_db),
    client: Client = Depends(get_current_client),
):
    return (
        db.query(Banner)
        .filter(Banner.client_id == client.id)
        .order_by(Banner.created_at.desc())
        .all()
    )


@router.post("/upload", response_model=BannerResponse, status_code=201)
async def upload_banner(
    image: UploadFile = File(...),
    db: Session = Depends(get_db),
    client: Client = Depends(get_current_client),
):
    # Check banner limit
    limit = _banner_limit(client)
    if limit != -1:
        count = db.query(Banner).filter(Banner.client_id == client.id).count()
        if count >= limit:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Banner limit reached ({limit}). Upgrade your plan.",
            )

    # Validate file type
    allowed_types = {"image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"}
    if image.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Only image files are allowed (jpg, png, gif, webp)")

    image_bytes = await image.read()
    banner = Banner(
        client_id=client.id,
        template_id=None,
        field_values=None,
        result_url="",
        image_data=image_bytes,
    )
    db.add(banner)
    db.commit()
    db.refresh(banner)
    banner.result_url = f"/api/v1/banners/{banner.id}/image"
    db.commit()
    db.refresh(banner)
    return banner


@router.get("/{banner_id}/image")
async def get_banner_image(
    banner_id: int,
    db: Session = Depends(get_db),
):
    banner = db.query(Banner).filter(Banner.id == banner_id).first()
    if not banner or not banner.image_data:
        raise HTTPException(status_code=404, detail="Image not found")
    return Response(content=banner.image_data, media_type="image/png")


@router.delete("/{banner_id}", status_code=204)
async def delete_banner(
    banner_id: int,
    db: Session = Depends(get_db),
    client: Client = Depends(get_current_client),
):
    banner = (
        db.query(Banner)
        .filter(Banner.id == banner_id, Banner.client_id == client.id)
        .first()
    )
    if not banner:
        raise HTTPException(status_code=404, detail="Banner not found")
    db.delete(banner)
    db.commit()


@router.get("/templates-public", response_model=list[BannerTemplateResponse])
async def list_templates_for_client(
    db: Session = Depends(get_db),
    client: Client = Depends(get_current_client),
):
    return (
        db.query(BannerTemplate)
        .filter(BannerTemplate.is_active == True)
        .order_by(BannerTemplate.id)
        .all()
    )
