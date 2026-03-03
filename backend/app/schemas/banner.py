from pydantic import BaseModel
from typing import Optional
import datetime


# ── Template field definition ─────────────────────────────────────────────────
# Each dict inside `fields` looks like:
# {"name": "headline", "x": 100, "y": 200, "font": "Roboto-Bold.ttf",
#  "font_size": 64, "color": "#FFFFFF", "align": "center", "max_chars": 40}

class TemplateField(BaseModel):
    name: str
    x: int = 50
    y: int = 50
    font: str = ""
    font_size: int = 48
    color: str = "#FFFFFF"
    align: str = "left"   # left | center | right
    max_chars: int = 100


# ── Banner Template ───────────────────────────────────────────────────────────

class BannerTemplateCreate(BaseModel):
    name: str
    description: Optional[str] = None
    width: int = 1080
    height: int = 1080
    background_color: str = "#1a1a2e"
    background_image: Optional[str] = None
    fields: list[TemplateField] = []
    is_active: bool = True

    def model_dump(self, **kwargs):
        data = super().model_dump(**kwargs)
        # Serialize TemplateField objects to plain dicts for JSONB
        data["fields"] = [f if isinstance(f, dict) else f for f in data.get("fields", [])]
        return data


class BannerTemplateUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    width: Optional[int] = None
    height: Optional[int] = None
    background_color: Optional[str] = None
    background_image: Optional[str] = None
    fields: Optional[list[TemplateField]] = None
    is_active: Optional[bool] = None


class BannerTemplateResponse(BaseModel):
    id: int
    name: str
    description: Optional[str]
    width: int
    height: int
    background_color: str
    background_image: Optional[str]
    fields: Optional[list]
    thumbnail_url: Optional[str]
    is_active: bool
    created_at: datetime.datetime

    class Config:
        from_attributes = True


# ── Banner ────────────────────────────────────────────────────────────────────

class BannerGenerateRequest(BaseModel):
    template_id: int
    field_values: dict[str, str]   # {"headline": "50% OFF", "subtext": "Limited time"}


class BannerResponse(BaseModel):
    id: int
    client_id: int
    template_id: Optional[int]
    field_values: Optional[dict]
    result_url: str
    created_at: datetime.datetime

    class Config:
        from_attributes = True
