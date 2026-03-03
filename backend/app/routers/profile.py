import logging
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import Optional
from sqlalchemy.orm import Session
from app.database import get_db
from app.auth.jwt import get_current_client
from app.models.client import Client

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/profile", tags=["profile"])


class ProfileUpdate(BaseModel):
    company_name: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None


class ProfileResponse(BaseModel):
    id: int
    name: str
    email: str
    company_name: Optional[str]
    phone: Optional[str]
    address: Optional[str]

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
    db.commit()
    db.refresh(client)
    return client
