from pydantic import BaseModel
from typing import Optional, List
import datetime


class PostCreate(BaseModel):
    caption: str
    banner_url: Optional[str] = None
    platforms: List[str]


class PostUpdate(BaseModel):
    caption: Optional[str] = None
    banner_url: Optional[str] = None
    platforms: Optional[List[str]] = None


class ScheduleRequest(BaseModel):
    scheduled_at: datetime.datetime


class PostResultResponse(BaseModel):
    id: int
    platform: str
    status: str
    error_message: Optional[str]
    published_at: Optional[datetime.datetime]

    class Config:
        from_attributes = True


class PostResponse(BaseModel):
    id: int
    client_id: int
    caption: str
    banner_url: Optional[str]
    platforms: List[str]
    status: str
    scheduled_at: Optional[datetime.datetime]
    published_at: Optional[datetime.datetime]
    created_at: datetime.datetime
    results: List[PostResultResponse] = []

    class Config:
        from_attributes = True
