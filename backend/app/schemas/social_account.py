from pydantic import BaseModel
from datetime import datetime
from enum import Enum


class PlatformEnum(str, Enum):
    facebook = "facebook"
    instagram = "instagram"
    linkedin = "linkedin"


class SocialAccountResponse(BaseModel):
    id: int
    platform: PlatformEnum
    account_name: str
    account_id: str
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class ConnectAccountRequest(BaseModel):
    platform: PlatformEnum


class OAuthCallbackData(BaseModel):
    code: str
    state: str
