import datetime
from pydantic import BaseModel
from typing import Optional


class SubscriptionCreate(BaseModel):
    client_id: int
    plan_id: int
    payment_status: str = "pending"
    start_date: datetime.date
    end_date: datetime.date


class SubscriptionUpdate(BaseModel):
    plan_id: Optional[int] = None
    status: Optional[str] = None
    payment_status: Optional[str] = None
    end_date: Optional[datetime.date] = None


class SubscriptionResponse(BaseModel):
    id: int
    client_id: int
    plan_id: int
    status: str
    payment_status: str
    start_date: datetime.date
    end_date: datetime.date
    created_at: datetime.datetime
    client_name: Optional[str] = None
    plan_name: Optional[str] = None

    class Config:
        from_attributes = True
