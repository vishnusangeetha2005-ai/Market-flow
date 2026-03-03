import datetime
from pydantic import BaseModel, EmailStr
from typing import Optional


class ClientCreate(BaseModel):
    name: str
    email: EmailStr
    password: str
    plan_id: int


class ClientUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None


class ClientResetPassword(BaseModel):
    new_password: str


class SubscriptionInfo(BaseModel):
    plan_name: str
    status: str
    payment_status: str
    start_date: datetime.date
    end_date: datetime.date

    class Config:
        from_attributes = True


class ClientResponse(BaseModel):
    id: int
    name: str
    email: str
    status: str
    account_locked: bool
    failed_attempts: int
    last_login: Optional[datetime.datetime]
    login_count: int
    created_at: datetime.datetime
    subscription: Optional[SubscriptionInfo] = None

    class Config:
        from_attributes = True


class ClientListResponse(BaseModel):
    id: int
    name: str
    email: str
    status: str
    account_locked: bool
    last_login: Optional[datetime.datetime]
    created_at: datetime.datetime
    plan_name: Optional[str] = None

    class Config:
        from_attributes = True
