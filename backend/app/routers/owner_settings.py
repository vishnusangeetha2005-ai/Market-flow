import logging
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from sqlalchemy.orm import Session
from app.database import get_db
from app.auth.jwt import get_current_owner
from app.models.owner import Owner
from app.config import settings
import bcrypt

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/owner/settings", tags=["owner-settings"])


class OwnerSettingsResponse(BaseModel):
    name: str
    email: str
    openai_configured: bool
    app_name: str


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str


class UpdateNameRequest(BaseModel):
    name: str


@router.get("", response_model=OwnerSettingsResponse)
async def get_owner_settings(
    db: Session = Depends(get_db),
    owner_data: dict = Depends(get_current_owner),
):
    owner = db.query(Owner).filter(Owner.email == owner_data["email"]).first()
    if not owner:
        raise HTTPException(status_code=404, detail="Owner not found")

    key = settings.OPENAI_API_KEY or ""
    openai_ok = key.startswith("sk-") and len(key) > 30 and "your" not in key.lower()

    return OwnerSettingsResponse(
        name=owner.name,
        email=owner.email,
        openai_configured=openai_ok,
        app_name=settings.APP_NAME,
    )


@router.put("/password", status_code=200)
async def change_password(
    body: ChangePasswordRequest,
    db: Session = Depends(get_db),
    owner_data: dict = Depends(get_current_owner),
):
    owner = db.query(Owner).filter(Owner.email == owner_data["email"]).first()
    if not owner:
        raise HTTPException(status_code=404, detail="Owner not found")

    if not bcrypt.checkpw(body.current_password.encode(), owner.password_hash.encode()):
        raise HTTPException(status_code=400, detail="Current password is incorrect")

    if len(body.new_password) < 8:
        raise HTTPException(status_code=400, detail="New password must be at least 8 characters")

    owner.password_hash = bcrypt.hashpw(body.new_password.encode(), bcrypt.gensalt()).decode()
    db.commit()
    return {"message": "Password changed successfully"}


@router.put("/name", status_code=200)
async def update_name(
    body: UpdateNameRequest,
    db: Session = Depends(get_db),
    owner_data: dict = Depends(get_current_owner),
):
    if not body.name.strip():
        raise HTTPException(status_code=400, detail="Name cannot be empty")
    owner = db.query(Owner).filter(Owner.email == owner_data["email"]).first()
    if not owner:
        raise HTTPException(status_code=404, detail="Owner not found")
    owner.name = body.name.strip()
    db.commit()
    return {"message": "Name updated", "name": owner.name}
