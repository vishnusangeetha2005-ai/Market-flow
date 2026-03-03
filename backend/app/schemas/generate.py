from pydantic import BaseModel
from typing import Optional
import datetime


class GenerateRequest(BaseModel):
    topic: str
    platform: Optional[str] = "general"
    tone: Optional[str] = "professional"
    include_cta: bool = False


class GenerateResponse(BaseModel):
    id: int
    type: str
    result_text: str
    tokens_used: int
    tokens_remaining: int
    created_at: datetime.datetime

    class Config:
        from_attributes = True


class ContentHistoryResponse(BaseModel):
    id: int
    type: str
    prompt: str
    result_text: str
    tokens_used: int
    platform: Optional[str]
    created_at: datetime.datetime

    class Config:
        from_attributes = True
